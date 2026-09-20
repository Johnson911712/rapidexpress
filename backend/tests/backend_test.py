"""End-to-end backend tests for Rapid Express Logistics."""
import os
import uuid
import time
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

# Unique test suffix to avoid conflicts across runs
SFX = uuid.uuid4().hex[:8]
# server lowercases all emails
COURIER_EMAIL = f"test_courier_{SFX}@example.com"
COURIER_PASSWORD = "Courier@123"
CUSTOMER_EMAIL = f"test_customer_{SFX}@example.com"
CUSTOMER_PASSWORD = "Customer@123"
CUSTOMER2_EMAIL = f"test_customer2_{SFX}@example.com"


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- session-scope fixtures ----------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def courier_token(admin_token):
    # Create a courier via admin API
    r = requests.post(f"{API}/admin/users",
                      json={"name": "Test Courier", "email": COURIER_EMAIL,
                            "password": COURIER_PASSWORD, "role": "courier"},
                      headers=bearer(admin_token))
    assert r.status_code == 200, f"Create courier failed: {r.status_code} {r.text}"
    # login as courier
    r = requests.post(f"{API}/auth/login", json={"email": COURIER_EMAIL, "password": COURIER_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="session")
def customer_token():
    r = requests.post(f"{API}/auth/register",
                      json={"name": "Test Customer", "email": CUSTOMER_EMAIL,
                            "password": CUSTOMER_PASSWORD, "phone": "555"})
    assert r.status_code == 200, f"Register customer failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def customer2_token():
    r = requests.post(f"{API}/auth/register",
                      json={"name": "Test Customer2", "email": CUSTOMER2_EMAIL,
                            "password": CUSTOMER_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self, admin_token):
        assert isinstance(admin_token, str) and len(admin_token) > 10

    def test_me_endpoint(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] in ("admin", "super_admin")

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401


# ---------- Shipments and payment flow ----------
def make_ship_body(payment_method="prepaid", customer_email=None):
    return {
        "sender": {"name": "Alice", "phone": "1", "address": "A st", "city": "NYC"},
        "recipient": {"name": "Bob", "phone": "2", "address": "B st", "city": "LA"},
        "package": {"description": "box", "weight": 2, "length": 10, "width": 10, "height": 10},
        "price": 100,
        "payment_method": payment_method,
        "customer_email": customer_email,
        "notes": "TEST",
    }


class TestShipmentFlow:
    def test_create_shipment_prepaid(self, admin_token, customer_token, courier_token):
        r = requests.post(f"{API}/shipments", json=make_ship_body("prepaid", CUSTOMER_EMAIL),
                          headers=bearer(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["tracking_number"].startswith("RX") and len(d["tracking_number"]) == 12
        assert d["status"] == "order_created"
        assert d["payment_status"] == "unpaid"
        pytest.prepaid_id = d["id"]
        pytest.prepaid_tn = d["tracking_number"]

    def test_create_shipment_cod(self, admin_token):
        body = make_ship_body("cod")
        body["cod_amount"] = 150
        r = requests.post(f"{API}/shipments", json=body, headers=bearer(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["payment_status"] == "cod"
        pytest.cod_id = d["id"]
        pytest.cod_tn = d["tracking_number"]

    def test_order_created_event_exists(self, admin_token):
        r = requests.get(f"{API}/shipments/{pytest.prepaid_id}", headers=bearer(admin_token))
        assert r.status_code == 200
        evts = r.json()["events"]
        assert any(e["status"] == "order_created" for e in evts)

    def test_create_courier_via_admin(self, courier_token):
        # courier_token fixture already implies user creation via admin
        assert courier_token

    def test_create_vehicle_and_assign(self, admin_token, courier_token):
        # create vehicle
        r = requests.post(f"{API}/vehicles",
                          json={"label": f"VAN-{SFX}", "type": "van", "plate": "XYZ", "capacity": "1t"},
                          headers=bearer(admin_token))
        assert r.status_code == 200
        vid = r.json()["id"]

        # get courier id
        r = requests.get(f"{API}/admin/couriers", headers=bearer(admin_token))
        assert r.status_code == 200
        courier = next(c for c in r.json() if c["email"] == COURIER_EMAIL)
        pytest.courier_id = courier["id"]

        # assign both shipments to the courier
        for sid in (pytest.prepaid_id, pytest.cod_id):
            r = requests.post(f"{API}/shipments/{sid}/assign",
                              json={"courier_id": courier["id"], "vehicle_id": vid},
                              headers=bearer(admin_token))
            assert r.status_code == 200, r.text
            assert r.json()["assigned_courier_id"] == courier["id"]
            assert r.json()["vehicle_id"] == vid

    def test_status_rejected_when_unpaid_prepaid(self, admin_token):
        r = requests.post(f"{API}/shipments/{pytest.prepaid_id}/status",
                          json={"status": "picked_up"}, headers=bearer(admin_token))
        assert r.status_code == 400, f"Expected 400, got {r.status_code} {r.text}"

    def test_mark_paid_then_advance(self, admin_token):
        r = requests.post(f"{API}/shipments/{pytest.prepaid_id}/payment",
                          json={"mark_paid": True}, headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["payment_status"] == "paid"

        r = requests.post(f"{API}/shipments/{pytest.prepaid_id}/status",
                          json={"status": "picked_up"}, headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "picked_up"

    def test_cod_can_move_without_paid(self, admin_token):
        r = requests.post(f"{API}/shipments/{pytest.cod_id}/status",
                          json={"status": "picked_up"}, headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "picked_up"


# ---------- Courier flow ----------
class TestCourier:
    def test_courier_sees_jobs(self, courier_token):
        r = requests.get(f"{API}/courier/shipments", headers=bearer(courier_token))
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert pytest.prepaid_id in ids and pytest.cod_id in ids

    def test_courier_advances_and_submits_proof(self, courier_token):
        # advance prepaid to out_for_delivery
        for s in ("in_transit", "out_for_delivery"):
            r = requests.post(f"{API}/shipments/{pytest.prepaid_id}/status",
                              json={"status": s, "location": "hub"},
                              headers=bearer(courier_token))
            assert r.status_code == 200, r.text

        # submit proof
        r = requests.post(f"{API}/shipments/{pytest.prepaid_id}/proof",
                          json={"recipient_name": "Bob", "photo_base64": "data:img",
                                "signature_base64": "data:sig", "notes": "left at door"},
                          headers=bearer(courier_token))
        assert r.status_code == 200

        # Advance to delivered
        r = requests.post(f"{API}/shipments/{pytest.prepaid_id}/status",
                          json={"status": "delivered"}, headers=bearer(courier_token))
        assert r.status_code == 200
        assert r.json()["status"] == "delivered"

    def test_cod_collect(self, courier_token):
        r = requests.post(f"{API}/shipments/{pytest.cod_id}/cod",
                          json={"amount": 150}, headers=bearer(courier_token))
        assert r.status_code == 200
        d = r.json()
        assert d["cod_collected"] is True
        assert d["cod_collected_amount"] == 150
        assert d["payment_status"] == "paid"


# ---------- Notifications ----------
class TestNotifications:
    def test_admin_notifications(self, admin_token):
        r = requests.get(f"{API}/notifications", headers=bearer(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d
        assert len(d["items"]) > 0  # status updates should have generated some

    def test_customer_notifications(self, customer_token):
        r = requests.get(f"{API}/notifications", headers=bearer(customer_token))
        assert r.status_code == 200
        # Customer linked to prepaid shipment should have notifications
        assert len(r.json()["items"]) > 0


# ---------- Public tracking ----------
class TestPublicTracking:
    def test_valid_tracking(self):
        r = requests.get(f"{API}/track/{pytest.prepaid_tn}")
        assert r.status_code == 200
        d = r.json()
        assert d["tracking_number"] == pytest.prepaid_tn
        assert "events" in d and len(d["events"]) >= 1

    def test_invalid_tracking(self):
        r = requests.get(f"{API}/track/RX9999999999")
        assert r.status_code == 404
        # no data leak
        body = r.json()
        assert "detail" in body


# ---------- Quotes ----------
class TestQuotes:
    def test_public_quote_and_admin_price(self, admin_token):
        r = requests.post(f"{API}/quotes", json={
            "name": "Quoter", "email": f"TEST_quote_{SFX}@example.com",
            "origin": "NYC", "destination": "LA", "weight": 3})
        assert r.status_code == 200
        qid = r.json()["id"]
        assert r.json()["status"] == "pending"

        r = requests.get(f"{API}/quotes", headers=bearer(admin_token))
        assert r.status_code == 200
        assert any(q["id"] == qid for q in r.json())

        r = requests.post(f"{API}/quotes/{qid}/price",
                          json={"quoted_price": 250.0}, headers=bearer(admin_token))
        assert r.status_code == 200
        assert r.json()["quoted_price"] == 250.0
        assert r.json()["status"] == "quoted"


# ---------- Customer portal + role isolation ----------
class TestCustomerPortal:
    def test_my_shipments(self, customer_token):
        r = requests.get(f"{API}/my/shipments", headers=bearer(customer_token))
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert pytest.prepaid_id in ids

    def test_customer_cannot_see_other_shipment(self, customer2_token):
        r = requests.get(f"{API}/shipments/{pytest.prepaid_id}", headers=bearer(customer2_token))
        assert r.status_code == 403

    def test_customer_forbidden_admin_endpoints(self, customer_token):
        r = requests.get(f"{API}/shipments", headers=bearer(customer_token))
        assert r.status_code == 403
        r = requests.get(f"{API}/analytics", headers=bearer(customer_token))
        assert r.status_code == 403


# ---------- Support tickets ----------
class TestSupport:
    def test_ticket_flow(self, customer_token, admin_token):
        r = requests.post(f"{API}/support", json={"subject": "Help", "message": "Issue"},
                          headers=bearer(customer_token))
        assert r.status_code == 200
        tid = r.json()["id"]

        r = requests.get(f"{API}/support", headers=bearer(admin_token))
        assert r.status_code == 200
        assert any(t["id"] == tid for t in r.json())

        r = requests.post(f"{API}/support/{tid}/reply", json={"message": "We are on it"},
                          headers=bearer(admin_token))
        assert r.status_code == 200

        r = requests.get(f"{API}/support", headers=bearer(customer_token))
        assert r.status_code == 200
        t = next(t for t in r.json() if t["id"] == tid)
        assert any(rep["message"] == "We are on it" for rep in t["replies"])


# ---------- Audit + Analytics ----------
class TestAdminOps:
    def test_audit_log(self, admin_token):
        r = requests.get(f"{API}/audit", headers=bearer(admin_token))
        assert r.status_code == 200
        actions = {a["action"] for a in r.json()}
        for a in ("create", "assign", "status", "payment"):
            assert a in actions, f"Missing audit action: {a}"

    def test_analytics(self, admin_token):
        r = requests.get(f"{API}/analytics", headers=bearer(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "by_status", "delivered", "delivery_rate", "revenue",
                  "cod_collected", "cod_outstanding", "couriers", "customers"):
            assert k in d
        assert d["total"] >= 2
