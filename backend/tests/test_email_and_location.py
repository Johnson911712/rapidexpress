"""Tests for the new features:
   1. Live courier location endpoint + privacy
   2. Status emails (email_logs collection)
   3. Regression: payment-before-movement rule & delivery-proof email

NOTE: classes are combined so pytest-xdist loadscope keeps state on one worker.
"""
import os
import uuid
import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("/app/backend/.env"))

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

SFX = uuid.uuid4().hex[:8]
C1_EMAIL = f"tc1_{SFX}@example.com"
C2_EMAIL = f"tc2_{SFX}@example.com"
# gmail plus-tag addresses so the Resend proxy accepts them
CUST_EMAIL = f"johnsonsweay199+cust{SFX}@gmail.com"
PWD = "Passw0rd!"


def bearer(t): return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def mongo_db():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    yield db
    client.close()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def couriers(admin_token):
    tokens = {}
    for email in (C1_EMAIL, C2_EMAIL):
        r = requests.post(f"{API}/admin/users",
                          json={"name": email, "email": email, "password": PWD, "role": "courier"},
                          headers=bearer(admin_token))
        assert r.status_code == 200, r.text
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": PWD})
        assert r.status_code == 200
        tokens[email] = {"token": r.json()["token"], "id": r.json()["user"]["id"]}
    return tokens


@pytest.fixture(scope="module")
def customer_token():
    # Customer must exist to test 403 with a customer token
    email = f"tcustuser_{SFX}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"name": "Cust", "email": email, "password": PWD})
    assert r.status_code == 200
    return r.json()["token"]


def make_ship(customer_email=None, payment_method="prepaid"):
    return {
        "sender": {"name": "S", "phone": "1", "address": "A", "city": "NYC"},
        "recipient": {"name": "R", "phone": "2", "address": "B", "city": "LA"},
        "package": {"description": "box", "weight": 1},
        "price": 50,
        "payment_method": payment_method,
        "customer_email": customer_email,
    }


def _create_and_assign(admin_token, courier_id, customer_email=None, payment_method="prepaid",
                      mark_paid=True):
    r = requests.post(f"{API}/shipments", json=make_ship(customer_email, payment_method),
                      headers=bearer(admin_token))
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    tn = r.json()["tracking_number"]
    r = requests.post(f"{API}/shipments/{sid}/assign",
                      json={"courier_id": courier_id}, headers=bearer(admin_token))
    assert r.status_code == 200
    if payment_method == "prepaid" and mark_paid:
        r = requests.post(f"{API}/shipments/{sid}/payment",
                          json={"mark_paid": True}, headers=bearer(admin_token))
        assert r.status_code == 200
    return sid, tn


import time as _time
def _advance(admin_token, sid, status, sleep=0):
    r = requests.post(f"{API}/shipments/{sid}/status",
                      json={"status": status}, headers=bearer(admin_token))
    assert r.status_code == 200, f"{status}: {r.text}"
    if sleep:
        _time.sleep(sleep)


def _email_logs_for(mongo_db, sid):
    async def _run():
        cur = mongo_db.email_logs.find({"shipment_id": sid})
        return [d async for d in cur]
    return asyncio.get_event_loop().run_until_complete(_run())


# All in one class to keep state on a single xdist worker (loadscope pins per class).
class TestNewFeatures:
    # ---- location endpoint auth ----
    def test_01_location_unauth_401(self, admin_token, couriers):
        c1 = couriers[C1_EMAIL]
        sid, tn = _create_and_assign(admin_token, c1["id"])
        _advance(admin_token, sid, "picked_up")
        _advance(admin_token, sid, "in_transit")
        _advance(admin_token, sid, "out_for_delivery")
        pytest.loc_sid = sid
        pytest.loc_tn = tn
        r = requests.post(f"{API}/shipments/{sid}/location", json={"lat": 1.0, "lng": 2.0})
        assert r.status_code == 401

    def test_02_location_customer_403(self, customer_token):
        r = requests.post(f"{API}/shipments/{pytest.loc_sid}/location",
                          json={"lat": 1.0, "lng": 2.0},
                          headers=bearer(customer_token))
        assert r.status_code == 403

    def test_03_location_other_courier_403(self, couriers):
        c2 = couriers[C2_EMAIL]
        r = requests.post(f"{API}/shipments/{pytest.loc_sid}/location",
                          json={"lat": 1.0, "lng": 2.0},
                          headers=bearer(c2["token"]))
        assert r.status_code == 403

    def test_04_location_assigned_courier_success(self, couriers, admin_token):
        c1 = couriers[C1_EMAIL]
        r = requests.post(f"{API}/shipments/{pytest.loc_sid}/location",
                          json={"lat": 40.7128, "lng": -74.0060},
                          headers=bearer(c1["token"]))
        assert r.status_code == 200
        assert r.json()["ok"] is True
        r = requests.get(f"{API}/shipments/{pytest.loc_sid}", headers=bearer(admin_token))
        cl = r.json()["shipment"].get("courier_location")
        assert cl and cl["lat"] == 40.7128 and cl["lng"] == -74.0060 and "updated_at" in cl

    # ---- privacy on public /track ----
    def test_05_track_shows_location_when_out_for_delivery(self):
        r = requests.get(f"{API}/track/{pytest.loc_tn}")
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "out_for_delivery"
        assert d["courier_location"] is not None
        assert d["courier_location"]["lat"] == 40.7128
        assert d["courier_name"] is not None

    def test_06_track_hides_location_when_delivered(self, admin_token):
        _advance(admin_token, pytest.loc_sid, "delivered")
        r = requests.get(f"{API}/track/{pytest.loc_tn}")
        d = r.json()
        assert d["status"] == "delivered"
        assert d["courier_location"] is None
        assert d["courier_name"] is None

    def test_07_track_hides_location_when_in_transit(self, admin_token, couriers):
        c1 = couriers[C1_EMAIL]
        sid, tn = _create_and_assign(admin_token, c1["id"])
        _advance(admin_token, sid, "picked_up")
        _advance(admin_token, sid, "in_transit")
        r = requests.get(f"{API}/track/{tn}")
        d = r.json()
        assert d["status"] == "in_transit"
        assert d["courier_location"] is None
        assert d["courier_name"] is None

    # ---- email logs ----
    def test_08_status_emails_logged_ok(self, admin_token, couriers, mongo_db):
        c1 = couriers[C1_EMAIL]
        sid, _ = _create_and_assign(admin_token, c1["id"], customer_email=CUST_EMAIL)
        pytest.email_sid = sid
        _advance(admin_token, sid, "picked_up", sleep=3.0)
        _advance(admin_token, sid, "in_transit", sleep=0.5)
        _advance(admin_token, sid, "out_for_delivery", sleep=3.0)
        _advance(admin_token, sid, "delivered", sleep=2.0)
        logs = _email_logs_for(mongo_db, sid)
        statuses = sorted([l["status"] for l in logs])
        assert statuses == ["delivered", "out_for_delivery", "picked_up"], f"Got: {statuses}"
        for l in logs:
            # ok=true when Resend proxy has quota; tolerate ok=false only with a rate-limit error
            if not l["ok"]:
                assert "429" in (l.get("error") or "") or "rate" in (l.get("error") or "").lower(), \
                    f"log not ok: {l}"
            else:
                assert l.get("email_id"), f"missing email_id on ok log: {l}"
            assert l["to"] == CUST_EMAIL.lower()

    def test_09_no_email_for_order_created_in_transit_attempt_failed(self, admin_token, couriers, mongo_db):
        c1 = couriers[C1_EMAIL]
        sid, _ = _create_and_assign(admin_token, c1["id"], customer_email=CUST_EMAIL)
        _advance(admin_token, sid, "picked_up")
        _advance(admin_token, sid, "attempt_failed")
        logs = _email_logs_for(mongo_db, sid)
        statuses = [l["status"] for l in logs]
        assert "picked_up" in statuses
        assert "attempt_failed" not in statuses
        assert "order_created" not in statuses
        assert "in_transit" not in statuses

    def test_10_no_email_without_customer_email(self, admin_token, couriers, mongo_db):
        c1 = couriers[C1_EMAIL]
        sid, _ = _create_and_assign(admin_token, c1["id"], customer_email=None)
        _advance(admin_token, sid, "picked_up")
        _advance(admin_token, sid, "in_transit")
        _advance(admin_token, sid, "out_for_delivery")
        _advance(admin_token, sid, "delivered")
        logs = _email_logs_for(mongo_db, sid)
        assert logs == []

    # ---- regression ----
    def test_11_prepaid_unpaid_rejected(self, admin_token, couriers):
        c1 = couriers[C1_EMAIL]
        sid, _ = _create_and_assign(admin_token, c1["id"], mark_paid=False)
        r = requests.post(f"{API}/shipments/{sid}/status",
                          json={"status": "picked_up"}, headers=bearer(admin_token))
        assert r.status_code == 400

    def test_12_cod_moves_without_payment(self, admin_token, couriers):
        c1 = couriers[C1_EMAIL]
        sid, _ = _create_and_assign(admin_token, c1["id"], payment_method="cod")
        r = requests.post(f"{API}/shipments/{sid}/status",
                          json={"status": "picked_up"}, headers=bearer(admin_token))
        assert r.status_code == 200

    def test_13_delivery_proof_and_delivered_email(self, admin_token, couriers, mongo_db):
        c1 = couriers[C1_EMAIL]
        sid, _ = _create_and_assign(admin_token, c1["id"], customer_email=CUST_EMAIL)
        _advance(admin_token, sid, "picked_up", sleep=3.0)
        _advance(admin_token, sid, "in_transit", sleep=0.5)
        _advance(admin_token, sid, "out_for_delivery", sleep=3.0)
        r = requests.post(f"{API}/shipments/{sid}/proof",
                          json={"recipient_name": "Bob", "photo_base64": "", "signature_base64": "", "notes": ""},
                          headers=bearer(c1["token"]))
        assert r.status_code == 200
        _advance(admin_token, sid, "delivered", sleep=1.0)
        logs = _email_logs_for(mongo_db, sid)
        # Ensure a 'delivered' status log exists (either ok=true or rate-limited)
        delivered = [l for l in logs if l["status"] == "delivered"]
        assert delivered, "no delivered email log"
        for l in delivered:
            if not l["ok"]:
                assert "429" in (l.get("error") or "") or "rate" in (l.get("error") or "").lower(), \
                    f"log not ok and not rate-limited: {l}"
