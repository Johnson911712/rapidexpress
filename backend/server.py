from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import re
import ipaddress
import logging
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
import uuid

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"

app = FastAPI(title="Rapid Express Logistics")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rapid_express")

STATUSES = [
    "order_created",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "attempt_failed",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def gen_tracking_number() -> str:
    return "RX" + "".join(random.choices(string.digits, k=10))


def clean(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        clean(user)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dep


require_admin = require_roles("admin", "super_admin")


async def write_audit(actor: dict, action: str, entity_type: str, entity_id: str, detail: str = ""):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id": actor["id"],
        "actor_name": actor.get("name", "System"),
        "actor_role": actor.get("role"),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "detail": detail,
        "created_at": now_iso(),
    })


async def notify(user_id: Optional[str], title: str, message: str, link: str = ""):
    if not user_id:
        return
    await db.notifications.insert_one({
        "id": new_id(),
        "user_id": user_id,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": now_iso(),
    })


async def notify_admins(title: str, message: str, link: str = ""):
    async for admin in db.users.find({"role": {"$in": ["admin", "super_admin"]}}):
        await notify(admin["id"], title, message, link)


# ---------------------------------------------------------------------------
# Email (Emergent-managed Resend)
# ---------------------------------------------------------------------------
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Rapid Express Logistics")
PUBLIC_APP_URL = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    if not EMAIL_KEY:
        logger.warning("EMERGENT_EMAIL_KEY not set; skipping email")
        return None
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()
    return resp.json().get("id")


STATUS_EMAIL = {
    "picked_up": ("Your shipment has been picked up",
                  "Good news — we've collected your parcel and it's now in our network."),
    "out_for_delivery": ("Your shipment is out for delivery",
                         "Your parcel is on the vehicle and heading your way today. You can watch it move live on the tracking page."),
    "delivered": ("Your shipment has been delivered",
                  "Your parcel has been delivered. Thank you for shipping with us."),
}


def _status_email_html(tracking_number: str, headline: str, body: str) -> str:
    track_link = f"{PUBLIC_APP_URL}/track/{tracking_number}" if PUBLIC_APP_URL else "#"
    btn = ""
    if PUBLIC_APP_URL:
        btn = (f'<tr><td style="padding:8px 0 4px"><a href="{escape(track_link)}" '
               f'style="display:inline-block;background:#0284C7;color:#ffffff;text-decoration:none;'
               f'padding:12px 22px;border-radius:6px;font-weight:600">Track your shipment</a></td></tr>')
    return (
        f'<table role="presentation" width="100%" style="background:#f1f5f9;padding:24px 0">'
        f'<tr><td align="center">'
        f'<table role="presentation" width="560" style="background:#ffffff;border-radius:10px;'
        f'overflow:hidden;font-family:Arial,Helvetica,sans-serif">'
        f'<tr><td style="background:#0f172a;padding:20px 28px">'
        f'<span style="color:#ffffff;font-size:18px;font-weight:700">Rapid</span>'
        f'<span style="color:#38bdf8;font-size:18px;font-weight:700">Express</span></td></tr>'
        f'<tr><td style="padding:28px">'
        f'<h1 style="margin:0 0 8px;font-size:20px;color:#0f172a">{escape(headline)}</h1>'
        f'<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569">{escape(body)}</p>'
        f'<table role="presentation"><tr><td style="font-size:13px;color:#64748b;padding-bottom:12px">'
        f'Tracking number</td></tr><tr><td style="font-size:18px;font-weight:700;color:#0f172a;'
        f'font-family:monospace;padding-bottom:16px">{escape(tracking_number)}</td></tr>{btn}</table>'
        f'</td></tr>'
        f'<tr><td style="padding:18px 28px;border-top:1px solid #e2e8f0">'
        f'<p style="margin:0;font-size:12px;color:#94a3b8">Sent by {escape(EMAIL_FROM_NAME)}. '
        f'We never ask for your password or card details by email.</p></td></tr>'
        f'</table></td></tr></table>'
    )


async def send_status_email(ship: dict, status: str):
    recipient = ship.get("customer_email")
    if not recipient or status not in STATUS_EMAIL:
        return
    headline, body = STATUS_EMAIL[status]
    html = _status_email_html(ship["tracking_number"], headline, body)
    try:
        email_id = await send_email(to=recipient, subject=headline, html=html)
        await db.email_logs.insert_one({
            "id": new_id(), "shipment_id": ship["id"], "to": recipient,
            "status": status, "subject": headline, "email_id": email_id,
            "ok": True, "created_at": now_iso(),
        })
    except Exception as e:
        logger.error("Status email failed: %s", e)
        await db.email_logs.insert_one({
            "id": new_id(), "shipment_id": ship["id"], "to": recipient,
            "status": status, "subject": headline, "email_id": None,
            "ok": False, "error": str(e), "created_at": now_iso(),
        })


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class Party(BaseModel):
    name: str
    phone: str = ""
    address: str = ""
    city: str = ""


class Package(BaseModel):
    description: str = ""
    weight: float = 0
    length: float = 0
    width: float = 0
    height: float = 0


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreateIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["courier", "admin"]
    phone: str = ""


class ShipmentIn(BaseModel):
    sender: Party
    recipient: Party
    package: Package
    price: Optional[float] = None
    payment_method: Optional[Literal["prepaid", "cod"]] = None
    cod_amount: Optional[float] = None
    customer_email: Optional[str] = None
    notes: str = ""


class AssignIn(BaseModel):
    courier_id: str
    vehicle_id: Optional[str] = None


class StatusIn(BaseModel):
    status: Literal["order_created", "picked_up", "in_transit", "out_for_delivery", "delivered", "attempt_failed"]
    location: str = ""
    note: str = ""


class PaymentIn(BaseModel):
    price: Optional[float] = None
    payment_method: Optional[Literal["prepaid", "cod"]] = None
    cod_amount: Optional[float] = None
    mark_paid: bool = False


class ProofIn(BaseModel):
    recipient_name: str
    photo_base64: str = ""
    signature_base64: str = ""
    notes: str = ""


class CodIn(BaseModel):
    amount: float


class LocationIn(BaseModel):
    lat: float
    lng: float


class QuoteIn(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    origin: str
    destination: str
    weight: float = 0
    dimensions: str = ""
    notes: str = ""


class QuotePriceIn(BaseModel):
    quoted_price: float


class VehicleIn(BaseModel):
    label: str
    type: str = "van"
    plate: str = ""
    capacity: str = ""


class SupportIn(BaseModel):
    subject: str
    message: str


class ReplyIn(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=604800, path="/",
    )


def user_public(user: dict) -> dict:
    return {
        "id": user["id"], "name": user["name"], "email": user["email"],
        "role": user["role"], "phone": user.get("phone", ""),
    }


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(), "name": body.name, "email": email,
        "password_hash": hash_password(body.password), "role": "customer",
        "phone": body.phone, "active": True, "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], email, "customer")
    set_auth_cookie(response, token)
    return {"user": user_public(user), "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    return {"user": user_public(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user_public(user)}


# ---------------------------------------------------------------------------
# Admin: users / couriers / customers
# ---------------------------------------------------------------------------
@api.post("/admin/users")
async def create_user(body: UserCreateIn, admin: dict = Depends(require_admin)):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(), "name": body.name, "email": email,
        "password_hash": hash_password(body.password), "role": body.role,
        "phone": body.phone, "active": True, "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await write_audit(admin, "create", "user", user["id"], f"Created {body.role} {email}")
    return user_public(user)


@api.get("/admin/couriers")
async def list_couriers(admin: dict = Depends(require_admin)):
    out = []
    async for u in db.users.find({"role": "courier"}).sort("created_at", -1):
        active_count = await db.shipments.count_documents(
            {"assigned_courier_id": u["id"], "status": {"$nin": ["delivered"]}})
        p = user_public(u)
        p["active_jobs"] = active_count
        out.append(p)
    return out


@api.get("/admin/customers")
async def list_customers(admin: dict = Depends(require_admin)):
    out = []
    async for u in db.users.find({"role": "customer"}).sort("created_at", -1):
        count = await db.shipments.count_documents({"customer_id": u["id"]})
        p = user_public(u)
        p["shipment_count"] = count
        out.append(p)
    return out


# ---------------------------------------------------------------------------
# Shipments
# ---------------------------------------------------------------------------
async def build_shipment(body: ShipmentIn, creator: dict) -> dict:
    customer_id = None
    if body.customer_email:
        cust = await db.users.find_one({"email": body.customer_email.lower(), "role": "customer"})
        if cust:
            customer_id = cust["id"]
    payment_status = "unpaid"
    if body.payment_method == "cod":
        payment_status = "cod"
    return {
        "id": new_id(),
        "tracking_number": gen_tracking_number(),
        "sender": body.sender.model_dump(),
        "recipient": body.recipient.model_dump(),
        "package": body.package.model_dump(),
        "status": "order_created",
        "price": body.price,
        "payment_method": body.payment_method,
        "payment_status": payment_status,
        "cod_amount": body.cod_amount,
        "cod_collected": False,
        "cod_collected_amount": None,
        "customer_id": customer_id,
        "customer_email": (body.customer_email or "").lower() or None,
        "assigned_courier_id": None,
        "assigned_courier_name": None,
        "vehicle_id": None,
        "vehicle_label": None,
        "notes": body.notes,
        "created_by": creator["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


@api.post("/shipments")
async def create_shipment(body: ShipmentIn, admin: dict = Depends(require_admin)):
    ship = await build_shipment(body, admin)
    await db.shipments.insert_one(ship)
    await db.tracking_events.insert_one({
        "id": new_id(), "shipment_id": ship["id"], "status": "order_created",
        "location": ship["sender"].get("city", ""), "note": "Shipment created",
        "actor_name": admin["name"], "created_at": now_iso(),
    })
    await write_audit(admin, "create", "shipment", ship["id"], f"Created shipment {ship['tracking_number']}")
    if ship["customer_id"]:
        await notify(ship["customer_id"], "Shipment created",
                     f"Your shipment {ship['tracking_number']} has been created.",
                     f"/portal/shipments/{ship['id']}")
    return clean(ship)


@api.get("/shipments")
async def list_shipments(status: Optional[str] = None, q: Optional[str] = None,
                         admin: dict = Depends(require_admin)):
    query = {}
    if status:
        query["status"] = status
    if q:
        query["$or"] = [
            {"tracking_number": {"$regex": q, "$options": "i"}},
            {"recipient.name": {"$regex": q, "$options": "i"}},
            {"sender.name": {"$regex": q, "$options": "i"}},
        ]
    out = []
    async for s in db.shipments.find(query).sort("created_at", -1).limit(500):
        out.append(clean(s))
    return out


@api.get("/shipments/{sid}")
async def get_shipment(sid: str, user: dict = Depends(get_current_user)):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    role = user["role"]
    if role == "customer" and ship.get("customer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your shipment")
    if role == "courier" and ship.get("assigned_courier_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    events = await db.tracking_events.find({"shipment_id": sid}).sort("created_at", 1).to_list(200)
    proof = await db.delivery_proofs.find_one({"shipment_id": sid})
    return {
        "shipment": clean(ship),
        "events": [clean(e) for e in events],
        "proof": clean(proof) if proof else None,
    }


@api.put("/shipments/{sid}")
async def update_shipment(sid: str, body: ShipmentIn, admin: dict = Depends(require_admin)):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    customer_id = ship.get("customer_id")
    if body.customer_email:
        cust = await db.users.find_one({"email": body.customer_email.lower(), "role": "customer"})
        customer_id = cust["id"] if cust else customer_id
    update = {
        "sender": body.sender.model_dump(),
        "recipient": body.recipient.model_dump(),
        "package": body.package.model_dump(),
        "price": body.price,
        "payment_method": body.payment_method,
        "cod_amount": body.cod_amount,
        "customer_email": (body.customer_email or "").lower() or None,
        "customer_id": customer_id,
        "notes": body.notes,
        "updated_at": now_iso(),
    }
    await db.shipments.update_one({"id": sid}, {"$set": update})
    await write_audit(admin, "update", "shipment", sid, f"Edited shipment {ship['tracking_number']}")
    return clean(await db.shipments.find_one({"id": sid}))


@api.post("/shipments/{sid}/assign")
async def assign_courier(sid: str, body: AssignIn, admin: dict = Depends(require_admin)):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    courier = await db.users.find_one({"id": body.courier_id, "role": "courier"})
    if not courier:
        raise HTTPException(status_code=400, detail="Invalid courier")
    vehicle_label = None
    if body.vehicle_id:
        veh = await db.vehicles.find_one({"id": body.vehicle_id})
        vehicle_label = veh["label"] if veh else None
    await db.shipments.update_one({"id": sid}, {"$set": {
        "assigned_courier_id": courier["id"],
        "assigned_courier_name": courier["name"],
        "vehicle_id": body.vehicle_id,
        "vehicle_label": vehicle_label,
        "updated_at": now_iso(),
    }})
    await write_audit(admin, "assign", "shipment", sid,
                      f"Assigned {courier['name']} to {ship['tracking_number']}")
    await notify(courier["id"], "New job assigned",
                 f"You have been assigned shipment {ship['tracking_number']}.",
                 f"/courier/jobs/{sid}")
    return clean(await db.shipments.find_one({"id": sid}))


@api.post("/shipments/{sid}/payment")
async def set_payment(sid: str, body: PaymentIn, admin: dict = Depends(require_admin)):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    update = {"updated_at": now_iso()}
    if body.price is not None:
        update["price"] = body.price
    if body.payment_method is not None:
        update["payment_method"] = body.payment_method
        update["payment_status"] = "cod" if body.payment_method == "cod" else ship.get("payment_status", "unpaid")
    if body.cod_amount is not None:
        update["cod_amount"] = body.cod_amount
    if body.mark_paid:
        update["payment_status"] = "paid"
    await db.shipments.update_one({"id": sid}, {"$set": update})
    action = "marked paid (MOCK)" if body.mark_paid else "updated payment"
    await write_audit(admin, "payment", "shipment", sid, f"{action} for {ship['tracking_number']}")
    if body.mark_paid and ship.get("customer_id"):
        await notify(ship["customer_id"], "Payment received",
                     f"Payment confirmed for {ship['tracking_number']}.",
                     f"/portal/shipments/{sid}")
    return clean(await db.shipments.find_one({"id": sid}))


ORDER_INDEX = {s: i for i, s in enumerate(STATUSES[:5])}


@api.post("/shipments/{sid}/status")
async def update_status(sid: str, body: StatusIn, user: dict = Depends(get_current_user)):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if user["role"] == "courier" and ship.get("assigned_courier_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    if user["role"] == "customer":
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    # Payment-before-movement rule
    if body.status in ("picked_up", "in_transit", "out_for_delivery", "delivered"):
        if ship.get("payment_method") != "cod" and ship.get("payment_status") != "paid":
            raise HTTPException(status_code=400,
                                detail="Shipment must be paid (or COD) before it can move.")
    await db.shipments.update_one({"id": sid}, {"$set": {
        "status": body.status, "updated_at": now_iso()}})
    await db.tracking_events.insert_one({
        "id": new_id(), "shipment_id": sid, "status": body.status,
        "location": body.location, "note": body.note,
        "actor_name": user["name"], "created_at": now_iso(),
    })
    await write_audit(user, "status", "shipment", sid,
                      f"Status -> {body.status} for {ship['tracking_number']}")
    labels = {
        "picked_up": "Picked up", "in_transit": "In transit",
        "out_for_delivery": "Out for delivery", "delivered": "Delivered",
        "attempt_failed": "Delivery attempt failed", "order_created": "Order created",
    }
    if ship.get("customer_id"):
        await notify(ship["customer_id"], labels.get(body.status, "Status update"),
                     f"{ship['tracking_number']}: {labels.get(body.status, body.status)}",
                     f"/portal/shipments/{sid}")
    await notify_admins("Status update",
                        f"{ship['tracking_number']} -> {labels.get(body.status, body.status)}",
                        f"/admin/shipments")
    await send_status_email(ship, body.status)
    return clean(await db.shipments.find_one({"id": sid}))


@api.post("/shipments/{sid}/proof")
async def submit_proof(sid: str, body: ProofIn, courier: dict = Depends(require_roles("courier", "admin", "super_admin"))):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if courier["role"] == "courier" and ship.get("assigned_courier_id") != courier["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    doc = {
        "id": new_id(), "shipment_id": sid,
        "recipient_name": body.recipient_name,
        "photo_base64": body.photo_base64,
        "signature_base64": body.signature_base64,
        "notes": body.notes,
        "created_at": now_iso(),
    }
    await db.delivery_proofs.replace_one({"shipment_id": sid}, doc, upsert=True)
    await write_audit(courier, "proof", "shipment", sid, f"Delivery proof for {ship['tracking_number']}")
    return clean(doc)


@api.post("/shipments/{sid}/cod")
async def collect_cod(sid: str, body: CodIn, courier: dict = Depends(require_roles("courier", "admin", "super_admin"))):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if courier["role"] == "courier" and ship.get("assigned_courier_id") != courier["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    if ship.get("payment_method") != "cod":
        raise HTTPException(status_code=400, detail="This shipment is not COD")
    await db.shipments.update_one({"id": sid}, {"$set": {
        "cod_collected": True, "cod_collected_amount": body.amount,
        "payment_status": "paid", "updated_at": now_iso()}})
    await write_audit(courier, "cod", "shipment", sid,
                      f"Collected COD {body.amount} for {ship['tracking_number']}")
    await notify_admins("COD collected",
                        f"{ship['tracking_number']}: {body.amount} collected by {courier['name']}",
                        "/admin/shipments")
    return clean(await db.shipments.find_one({"id": sid}))


# ---------------------------------------------------------------------------
# Courier
# ---------------------------------------------------------------------------
@api.get("/courier/shipments")
async def courier_shipments(courier: dict = Depends(require_roles("courier"))):
    out = []
    async for s in db.shipments.find({"assigned_courier_id": courier["id"]}).sort("updated_at", -1):
        out.append(clean(s))
    return out


@api.post("/shipments/{sid}/location")
async def update_location(sid: str, body: LocationIn, courier: dict = Depends(require_roles("courier"))):
    ship = await db.shipments.find_one({"id": sid})
    if not ship:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if ship.get("assigned_courier_id") != courier["id"]:
        raise HTTPException(status_code=403, detail="Not assigned to you")
    await db.shipments.update_one({"id": sid}, {"$set": {"courier_location": {
        "lat": body.lat, "lng": body.lng, "updated_at": now_iso()}}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Customer portal
# ---------------------------------------------------------------------------
@api.get("/my/shipments")
async def my_shipments(user: dict = Depends(require_roles("customer"))):
    query = {"$or": [{"customer_id": user["id"]}, {"customer_email": user["email"]}]}
    out = []
    async for s in db.shipments.find(query).sort("created_at", -1):
        out.append(clean(s))
    return out


# ---------------------------------------------------------------------------
# Public tracking
# ---------------------------------------------------------------------------
@api.get("/track/{tracking_number}")
async def public_track(tracking_number: str):
    ship = await db.shipments.find_one({"tracking_number": tracking_number.strip().upper()})
    if not ship:
        raise HTTPException(status_code=404, detail="No shipment found with that tracking number")
    events = await db.tracking_events.find({"shipment_id": ship["id"]}).sort("created_at", 1).to_list(200)
    courier_location = None
    if ship["status"] == "out_for_delivery":
        courier_location = ship.get("courier_location")
    return {
        "tracking_number": ship["tracking_number"],
        "status": ship["status"],
        "origin": ship["sender"].get("city", ""),
        "destination": ship["recipient"].get("city", ""),
        "recipient_name": ship["recipient"].get("name", ""),
        "estimated_weight": ship["package"].get("weight", 0),
        "created_at": ship["created_at"],
        "courier_location": courier_location,
        "courier_name": ship.get("assigned_courier_name") if ship["status"] == "out_for_delivery" else None,
        "events": [
            {"status": e["status"], "location": e.get("location", ""),
             "note": e.get("note", ""), "created_at": e["created_at"]}
            for e in events
        ],
    }


# ---------------------------------------------------------------------------
# Quotes
# ---------------------------------------------------------------------------
@api.post("/quotes")
async def create_quote(body: QuoteIn):
    doc = {
        "id": new_id(), "name": body.name, "email": body.email.lower(),
        "phone": body.phone, "origin": body.origin, "destination": body.destination,
        "weight": body.weight, "dimensions": body.dimensions, "notes": body.notes,
        "status": "pending", "quoted_price": None, "created_at": now_iso(),
    }
    await db.quote_requests.insert_one(doc)
    await notify_admins("New quote request", f"{body.name} requested a quote ({body.origin} -> {body.destination})", "/admin/quotes")
    return clean(doc)


@api.get("/quotes")
async def list_quotes(admin: dict = Depends(require_admin)):
    out = []
    async for q in db.quote_requests.find({}).sort("created_at", -1):
        out.append(clean(q))
    return out


@api.post("/quotes/{qid}/price")
async def price_quote(qid: str, body: QuotePriceIn, admin: dict = Depends(require_admin)):
    q = await db.quote_requests.find_one({"id": qid})
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")
    await db.quote_requests.update_one({"id": qid}, {"$set": {
        "quoted_price": body.quoted_price, "status": "quoted", "updated_at": now_iso()}})
    await write_audit(admin, "quote", "quote", qid, f"Quoted {body.quoted_price} to {q['email']}")
    return clean(await db.quote_requests.find_one({"id": qid}))


# ---------------------------------------------------------------------------
# Vehicles
# ---------------------------------------------------------------------------
@api.get("/vehicles")
async def list_vehicles(user: dict = Depends(get_current_user)):
    out = []
    async for v in db.vehicles.find({}).sort("created_at", -1):
        out.append(clean(v))
    return out


@api.post("/vehicles")
async def create_vehicle(body: VehicleIn, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), "label": body.label, "type": body.type, "plate": body.plate,
           "capacity": body.capacity, "active": True, "created_at": now_iso()}
    await db.vehicles.insert_one(doc)
    await write_audit(admin, "create", "vehicle", doc["id"], f"Added vehicle {body.label}")
    return clean(doc)


@api.delete("/vehicles/{vid}")
async def delete_vehicle(vid: str, admin: dict = Depends(require_admin)):
    await db.vehicles.delete_one({"id": vid})
    await write_audit(admin, "delete", "vehicle", vid, "Removed vehicle")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Support tickets
# ---------------------------------------------------------------------------
@api.post("/support")
async def create_ticket(body: SupportIn, user: dict = Depends(require_roles("customer"))):
    doc = {
        "id": new_id(), "customer_id": user["id"], "customer_name": user["name"],
        "customer_email": user["email"], "subject": body.subject, "message": body.message,
        "status": "open", "replies": [], "created_at": now_iso(),
    }
    await db.support_tickets.insert_one(doc)
    await notify_admins("New support ticket", f"{user['name']}: {body.subject}", "/admin/support")
    return clean(doc)


@api.get("/support")
async def list_tickets(user: dict = Depends(get_current_user)):
    if user["role"] in ("admin", "super_admin"):
        query = {}
    elif user["role"] == "customer":
        query = {"customer_id": user["id"]}
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    out = []
    async for t in db.support_tickets.find(query).sort("created_at", -1):
        out.append(clean(t))
    return out


@api.post("/support/{tid}/reply")
async def reply_ticket(tid: str, body: ReplyIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("admin", "super_admin", "customer"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    t = await db.support_tickets.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if user["role"] == "customer" and t["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your ticket")
    reply = {"author": user["name"], "role": user["role"], "message": body.message, "created_at": now_iso()}
    await db.support_tickets.update_one({"id": tid}, {"$push": {"replies": reply}})
    if user["role"] in ("admin", "super_admin"):
        await notify(t["customer_id"], "Support reply", f"Reply on: {t['subject']}", "/portal/support")
    else:
        await notify_admins("Support reply", f"{user['name']} replied on: {t['subject']}", "/admin/support")
    return clean(await db.support_tickets.find_one({"id": tid}))


@api.post("/support/{tid}/close")
async def close_ticket(tid: str, admin: dict = Depends(require_admin)):
    await db.support_tickets.update_one({"id": tid}, {"$set": {"status": "closed"}})
    return clean(await db.support_tickets.find_one({"id": tid}))


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------
@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    out = []
    async for n in db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(50):
        out.append(clean(n))
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"items": out, "unread": unread}


@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
@api.get("/audit")
async def get_audit(admin: dict = Depends(require_admin)):
    out = []
    async for a in db.audit_logs.find({}).sort("created_at", -1).limit(300):
        out.append(clean(a))
    return out


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@api.get("/analytics")
async def analytics(admin: dict = Depends(require_admin)):
    by_status = {}
    for s in STATUSES:
        by_status[s] = await db.shipments.count_documents({"status": s})
    total = await db.shipments.count_documents({})
    delivered = by_status.get("delivered", 0)
    delivery_rate = round((delivered / total) * 100, 1) if total else 0

    revenue = 0.0
    cod_outstanding = 0.0
    cod_collected = 0.0
    async for s in db.shipments.find({}):
        if s.get("payment_status") == "paid" and s.get("payment_method") == "prepaid" and s.get("price"):
            revenue += float(s["price"])
        if s.get("payment_method") == "cod":
            amt = float(s.get("cod_amount") or s.get("price") or 0)
            if s.get("cod_collected"):
                cod_collected += float(s.get("cod_collected_amount") or amt)
            else:
                cod_outstanding += amt

    return {
        "total": total,
        "by_status": by_status,
        "delivered": delivered,
        "delivery_rate": delivery_rate,
        "revenue": round(revenue, 2),
        "cod_collected": round(cod_collected, 2),
        "cod_outstanding": round(cod_outstanding, 2),
        "couriers": await db.users.count_documents({"role": "courier"}),
        "customers": await db.users.count_documents({"role": "customer"}),
        "pending_quotes": await db.quote_requests.count_documents({"status": "pending"}),
        "open_tickets": await db.support_tickets.count_documents({"status": "open"}),
    }


@api.get("/")
async def root():
    return {"message": "Rapid Express Logistics API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.shipments.create_index("tracking_number", unique=True)
    await db.shipments.create_index("assigned_courier_id")
    await db.shipments.create_index("customer_id")
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": new_id(), "name": os.environ.get("ADMIN_NAME", "Admin"),
            "email": admin_email, "password_hash": hash_password(admin_password),
            "role": "admin", "phone": "", "active": True, "created_at": now_iso(),
        })
        logger.info("Seeded admin user %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
