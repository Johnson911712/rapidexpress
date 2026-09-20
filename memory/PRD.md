# Rapid Express Logistics — PRD

## Original Problem Statement
Full-stack logistics & shipment management platform: admin-created shipments, customer tracking, mobile-web courier delivery flow, quotes, and (mocked) payments. Roles: Admin, Courier, Customer. Stack: React + FastAPI + MongoDB, JWT auth.

## User Choices (v1)
- Payments: **MOCKED** (no Stripe). "Mark paid" / "Pay now" flag payment_status=paid.
- Email: **skipped** (in-app notifications only).
- Delivery proof: photos + signature stored as **base64 in MongoDB**.
- Seed data: none (only owner admin seeded).
- UI: classic, professional (Swiss/high-contrast, IBM Plex Sans, navy + sky).

## Architecture
- Backend: `/app/backend/server.py` — FastAPI, all routes under `/api`, JWT (cookie + Bearer), uuid string IDs, role dependencies (`require_admin`, `require_roles`).
- Frontend: React (`/app/frontend/src`), react-router, AuthContext (token in localStorage `rx_token`), Tailwind + shadcn/ui, recharts.
- DB: MongoDB collections — users, shipments, tracking_events, delivery_proofs, quote_requests, support_tickets, notifications, audit_logs, vehicles.

## User Personas
- **Admin**: creates/manages shipments, assigns couriers/vehicles, sets prices, prices quotes, manages support, views analytics + audit log.
- **Courier**: mobile-web; assigned jobs, status updates, delivery proof capture, COD collection.
- **Customer**: registers, tracks own shipments, pays outstanding (mock), raises support tickets.

## Implemented (2026-06-20)
- Auth: register/login/logout/me, JWT, admin seeding, role-based access.
- Public: landing page, tracking lookup (`/track`), quote request form.
- Admin: dashboard analytics + chart, shipment list/search/filter, create/edit shipment (auto tracking #), assign courier+vehicle, set price + mark paid (mock), status update, quotes pricing, courier & customer management, vehicles CRUD, support tickets, audit log.
- Courier: mobile-web job list, status progression, delivery proof (photo/signature canvas/recipient/notes), COD collect.
- Customer portal: my shipments, timeline + proof view, pay outstanding (mock), support tickets, profile.
- Edge cases: payment-before-movement rule, clean tracking not-found, server-side role isolation, in-app notifications, audit logging.
- Tested: 25/25 backend pytest pass; frontend smoke pass.

## Backlog / Remaining
- **P1**: Real Stripe/Razorpay payment integration; Resend email notifications on status changes.
- **P1**: Object storage for proof media (currently base64 in DB).
- **P2**: Live GPS courier tracking + map (Phase 5); split Operations Staff role; advanced analytics; offline proof-upload queue; quote auto-pricing by weight/zone; multi-currency/tax.
- **P2**: Restrict GET /api/vehicles to admin; split server.py into modules; analytics via Mongo aggregation.

## Next Tasks
- Wire real payments when user provides provider choice/keys.
- Add Resend email notifications.
- Move proof media to object storage.
