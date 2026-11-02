# Admin Operations

## Workspace Behavior

- Navigation and command search only list sections the active role may use. Direct visits to a disallowed URL replace the route with the first permitted workspace page.
- Support sees Orders and Products. Support can read order details and add internal notes, but cannot change fulfillment, payments, pricing, stock, or store configuration.
- Fulfillment can update inventory, delivery details, and order stages, but cannot verify payments or record refunds. Those actions require `orders.payment`, granted to Owner and Manager.
- The role selector is explicitly a **demo preview**, not authentication. All frontend role and data state can be inspected or changed by the browser user. Production access must be enforced by the backend.

## Order Queue

- Preset queues: all, unfulfilled, ready to ship, payment review, in transit, and needs attention. Attention includes unverified payments and incomplete orders older than 48 hours.
- Search spans order number, customer, phone, tracking number, and product names. Additional filters cover payment, courier, date, and sorting. Date filtering uses Bangladesh time.
- Orders pages show 25, 50, or 100 orders. Dispatch waiting lists, selected batch orders, and batch detail lists show 50 at a time. Page selection and explicit selection of all matching results support bulk actions without an unbounded DOM list.
- Fulfillment and payment capsules edit the row directly. Bulk operations ask for confirmation, update eligible orders together, and report skipped orders.
- Dispatch requires a courier and tracking reference. Full advance-payment methods must be recorded as paid before dispatch. Completed/cancelled orders are not reopened by routine status updates.
- A desktop detail drawer becomes an inset modal on mobile. It traps keyboard focus, supports Escape, restores focus and scroll, and warns before discarding edits. Previous/next controls process a queue without repeatedly closing the editor.
- Customer details, assignment, priority, tracking, and notes are editable according to permissions. Every mutation records an order activity event and a workspace audit entry.
- CSV export includes the selected orders or current filtered results. Formula-like spreadsheet values are escaped before export.

## Coupons

Coupons have separate list and editor screens, percentage/fixed discounts, minimum spend, usage limits, enable/pause, BDT start/end dates, and a checkout calculation preview. Limits and scheduling are also checked by the storefront coupon calculation. Deletion requires confirmation and does not alter past order totals.

## Backend Requirements Before Production

The current implementation remains a local frontend demonstration. It is not a multi-user order-processing backend or a production-ready credential vault.

1. Authenticate staff using server-issued sessions and enforce permissions on every read and mutation. Do not trust the role selector or local storage.
2. Query orders using server-side filters, stable cursor pagination, and indexed order/customer/phone/tracking fields. Return counts separately from paginated rows.
3. Return record versions and require an expected version on edits; reject stale changes with HTTP 409. The frontend includes a local version check to model this workflow.
4. Process bulk updates atomically or return explicit per-order results. Use idempotency keys for payments, dispatch, cancellations, and inventory reservations.
5. Put courier booking and notifications in a retryable background queue. Verify signed payment/courier webhooks and deduplicate events.
6. Persist audit records and order events server-side; local logs are not immutable. Record actor, request ID, before/after state, and time.
7. Recheck prices, stock, coupon validity, delivery fees, and payment eligibility on the server before accepting checkout.
8. Keep credentials in the server secret manager. Vault editing is unavailable when `VITE_ADMIN_API_URL` is absent; the frontend no longer simulates successful secret storage.

## Visual System

Admin styles are scoped in `src/admin/admin.css`. Shared fields, buttons, switches, dialogs, and CSV helpers live in `src/admin/ui.tsx`. Inter and the taka glyph are served locally from `public/fonts/`, including font license files. SVG icons use fixed non-shrinking boxes and explicit gaps; admin page navigation has no whole-page translations.
## Dispatch & Courier Batches

Open **Dispatch** to run daily shipping. Orders that are new, confirmed, or packed and not yet in a batch appear in the waiting list. Select orders, then **Create batch** to choose the courier, pickup date, time window, and pickup address.

Each batch moves through three steps. Every step acts only on the orders that are ready for it:

1. **Confirm all** — New orders become Confirmed. Prepaid orders must show a verified payment first.
2. **Mark all packed** — Confirmed orders become Packed.
3. **Dispatch & request pickup** — Packed orders are sent to the courier in one pickup request. Parcels the courier accepts become Shipped with a tracking number. Rejected parcels stay Packed with the courier's reason, and you can dispatch them again. Each attempt uses its own idempotency key.

Orders that cannot move (unverified payment, incomplete address, invalid phone, cancelled) are shown with their reason and can be removed from the batch. Orders waiting on an earlier step are shown as waiting, not as problems.

### Backend contract for courier integration

The browser never holds courier credentials. When `VITE_ADMIN_API_URL` is set, the frontend calls:

```
POST {VITE_ADMIN_API_URL}/admin/couriers/{steadfast|pathao|redx}/pickups
Idempotency-Key: {batchId}:pickup:{attempt}
Content-Type: application/json
```

Request body (`CourierPickupInput`): `batchId`, `courier`, `attempt`, `idempotencyKey`, `pickup { date, window, address, contactName, contactPhone }`, and `parcels[]` with `orderId`, `recipient { name, phone, address, area }`, `codAmount`, `weightKg`, and `itemSummary`. Internal staff notes are never sent.

Response body (`CourierPickupResult`): `pickupRef`, `scheduledFor`, and `parcels[]` with `orderId`, `ok`, `consignmentId`, `trackingCode`, and `error`.

Backend requirements:
- Store courier API secrets in the vault and call the courier from the server only.
- Treat the idempotency key as a deduplication key. Repeating a request must return the same result rather than booking parcels twice.
- Map each parcel to the courier's bulk order and pickup endpoints, and return per-parcel results, including partial rejections.
- For COD, `codAmount` is the amount to collect; prepaid parcels send `0`.
- Later courier status webhooks can update orders after dispatch; that flow is not built yet.

Without a backend, a local demo answers each request. It rejects roughly one in nine parcels so the retry path can be exercised, and no request leaves the browser. The Dispatch page displays a notice whenever the demo is active.
