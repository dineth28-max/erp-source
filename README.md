# ERP Microservices — Phase 4

A working, end-to-end slice of the platform described in [ARCHITECTURE.md](ARCHITECTURE.md): eight
backend services plus a React dashboard, wired together with JWT auth, PostgreSQL (one database
per service), Kafka events, Redis-backed rate limiting, two sagas (order-to-cash and
procure-to-pay) with compensation, server-resolved pricing, and two independent CQRS read models
(reporting, finance) built off the same event streams. Java 21 / Spring Boot 3.3.

## Services

| Service | Host port | Owns |
|---|---|---|
| `frontend` | **18090** | React dashboard — inventory, sales, procurement, finance, customers, live charts |
| `api-gateway` | **18080** | Routing, JWT verification, rate limiting, CORS |
| `identity-service` | 18081 | Users, tenants, JWT issuance |
| `inventory-service` | 18082 | Items, stock levels, reservations, receiving |
| `sales-service` | 18083 | Orders, order-to-cash saga |
| `master-data-service` | 18084 | Customers, vendors, item pricing |
| `reporting-service` | 18085 | CQRS read model — revenue projection, inventory activity feed |
| `procurement-service` | 18086 | Purchase orders, procure-to-pay saga |
| `finance-service` | 18087 | CQRS read model — double-entry ledger off sales + procurement events |

Host ports are `18080-18087`/`18090`, not the more obvious `8080-8087`/`8090`, because on the
machine this was built on, Windows/WSL2/Docker Desktop had dynamically claimed `8073-8672` as an
excluded port range (`netsh interface ipv4 show excludedportrange protocol=tcp`), so Docker
couldn't bind those ports at all. If that's not an issue on your machine, feel free to remap them
back to the 808x range in `docker-compose.yml` (and update `frontend/public/env-config.js`'s
default / the `FRONTEND_API_BASE_URL` env var, and `CORS_ALLOWED_ORIGINS` in `.env`, to match).

Everything except `api-gateway` trusts `X-Tenant-Id` / `X-User-Id` / `X-Roles` headers rather than
re-validating JWTs — the gateway is the only trust boundary. **Do not expose the domain-service
ports outside the docker network in a real deployment**; they're published here only so you can hit
each service directly while developing. In Kubernetes, enforce this with a NetworkPolicy that only
allows ingress to those services from `api-gateway`'s pods.

## Run it

```bash
cp .env.example .env        # already done for you locally with a generated JWT_SECRET
docker compose up --build
```

First boot takes a few minutes (Maven/npm downloads + Kafka KRaft init). Once healthy:

- **Web UI: http://localhost:18090** — this is the one to actually open in a browser.
- Gateway (for curl/Postman): http://localhost:18080
- Each service also directly reachable on its own port for debugging.

## Using the web UI

Open http://localhost:18090, log in as `admin` / `Passw0rd!` (or register a new user - it lands in
the same seeded "default" tenant). It's a sidebar-dashboard layout - nav on the left, a search bar
and notification/account menu on top, content on the right:
- **Dashboard**: KPI tiles (revenue, orders, customers, catalog size, failed orders, out-of-stock
  items) and two charts - monthly revenue and orders-by-status - computed live from whatever's
  actually in the databases, not sample data. The revenue chart specifically reads
  `reporting-service`'s precomputed projection rather than summing every order in the browser (and
  degrades gracefully with a visible message if that service is down, instead of breaking the
  whole dashboard). Charts are hand-built SVG (bar chart, per the in-repo dataviz skill's mark
  spec: rounded data-ends, hairline gridlines, per-bar hover tooltips) rather than a charting
  library, since two chart types didn't justify the dependency.
- **Inventory** tab (was "Items & Stock"): create items and set their price in one step (two calls
  under the hood - inventory-service for the catalog entry, master-data-service for the price),
  see live on-hand/reserved/available quantities, place an order directly from a row (the "Order"
  button is disabled until a price is set).
- **Sales** tab (was "Orders"): every order you've placed, with status, total, and a detail view
  showing line items - including `FAILED` orders and their failure reason, so you can see the
  compensation path (try ordering more than what's available on an item).
- **Procurement** tab: create a vendor, create a purchase order against it (item + quantity +
  unit cost), then walk it through Submit → Receive. Receiving calls inventory-service for real -
  go check the Inventory tab afterward and the on-hand quantity will actually be higher.
- **Finance** tab: the ledger's live state - four KPI tiles (revenue, receivables, payables,
  inventory value) plus the full journal entry list. Every pair of rows shares a description and
  balances (one debit, one credit, equal amounts) - that's `finance-service` posting real
  double-entry pairs off the same events Procurement and Sales produce, not sample data.
- **Reports** tab: the inventory activity feed (`reporting-service`'s other projection) - every
  stock reservation/release/receipt, newest first.
- **Customers** tab: master-data-service's customer records - list and create. Nothing in the
  order flow validates against this yet (see "intentionally simplified").
- **Settings**: deliberately bare - account info and logout only. No fake toggles for tenant
  management, billing, or notification preferences that don't exist in the backend.
- Every domain from the original roadmap now has a real nav item - nothing left under
  "coming soon." When a future phase adds a service without a page yet, it goes back under a
  visibly-disabled section rather than linking to something that would have to fake data.
- The top search bar filters whichever list page is open (client-side, on already-loaded data);
  the notification bell shows real recent `FAILED` orders, not decorative placeholder content.

It's a thin client over the same REST API described below - nothing it does isn't also doable with
curl. `frontend/src/lib/api.js` is the entire contract with the backend if you want to see exactly
what it calls.

## Try the golden path (curl / API-only)

```bash
# 1. Login as the seeded admin user (tenant "default", password "Passw0rd!")
TOKEN=$(curl -s -X POST http://localhost:18080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Passw0rd!"}' | jq -r .accessToken)

# 2. Check the seeded demo item's stock (SKU-0001, 1000 units on hand)
curl -s http://localhost:18080/api/v1/items/20000000-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer $TOKEN"

# 3. Place an order for it - no unitPrice in the request; sales-service
#    resolves it from master-data-service itself, then drives the saga:
#    reserve stock via inventory-service (circuit breaker + retry + timeout),
#    persist the order, publish OrderPlaced to Kafka. Try adding a fake
#    "unitPrice" to the line below - it's silently ignored, the real price
#    (19.99, seeded in master-data-service) is what gets charged.
curl -s -X POST http://localhost:18080/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
        "customerId": "30000000-0000-0000-0000-000000000001",
        "lines": [
          {"itemId": "20000000-0000-0000-0000-000000000001", "quantity": 5}
        ]
      }'

# 4. Confirm stock was actually decremented (available should now be 995)
curl -s http://localhost:18080/api/v1/stock/20000000-0000-0000-0000-000000000001 \
  -H "Authorization: Bearer $TOKEN"
```

Try ordering a quantity larger than what's available (e.g. `999999`) to see the compensation path:
the reservation is rejected, the order is persisted with `status: FAILED`, and no stock is touched.

**Known local-dev quirk:** on a completely fresh `docker compose up`, the *first* order placed
right after startup can return `504` from the gateway even though it actually succeeded server-side
(check `GET /api/v1/orders` - the order is there with `status: CONFIRMED`). This is JVM cold-start
latency (JIT, connection pool init, Kafka producer metadata fetch all happening on the first real
request) compounding with limited Docker Desktop VM resources when 4 JVMs start at once - not a
data-correctness bug; every warm request after that responds in well under 200ms. It's a real
production concern though: a naive client that retries a "failed" order after a false-timeout would
create a duplicate. The correct production fixes are (a) don't route traffic to a pod until it's
actually warm, not just started (readiness probes already exist here - see [k8s manifests TODO]),
and (b) add a client-supplied idempotency key to `POST /orders` so a retried request is provably
the same request, the same way `/stock/reserve` already treats its `referenceId` as one. Not
implemented at the order-creation level yet - noted in Next Steps.

## What's actually demonstrated here

- **JWT auth at the edge**: `identity-service` issues HS256 tokens; `api-gateway` is the only
  service that verifies them, then forwards trusted identity headers downstream.
- **Saga with compensation**: `sales-service` orchestrates a two-step saga (reserve stock → persist
  order); a failure at either step releases any reservations already made ([OrderService.java](services/sales-service/src/main/java/com/erp/sales/service/OrderService.java)).
- **Resilience**: the sales→inventory call is wrapped in a Resilience4j circuit breaker, retry
  (with backoff, business rejections excluded), and timeout ([InventoryClient.java](services/sales-service/src/main/java/com/erp/sales/client/InventoryClient.java)).
- **Optimistic concurrency**: stock reservations use a `@Version` column with bounded retry so
  concurrent checkouts on the same hot SKU don't lose updates ([StockMutator.java](services/inventory-service/src/main/java/com/erp/inventory/service/StockMutator.java)).
- **Real CQRS read model**: `reporting-service` consumes `sales-events` and `inventory-events` off
  Kafka and incrementally maintains a `revenue_summary` projection (monthly confirmed
  revenue/order counts, updated per event) plus a raw inventory activity log - a query against it
  is one indexed row instead of summing every order on every dashboard load. Idempotent by
  design ([ProcessedEvent](services/reporting-service/src/main/java/com/erp/reporting/domain/ProcessedEvent.java)):
  a Kafka redelivery replays a no-op instead of double-counting revenue. Verified for real, not
  just by reading the code: brought the service up as a brand-new consumer group against a
  Kafka topic that already had historical events in it, and confirmed it backfilled
  `revenue_summary` to exactly match what was already in `sales_db` - then placed a new order and
  confirmed the projection updated live, in the same run.
- **Second saga (procure-to-pay)**: `procurement-service` orchestrates draft → submit → receive;
  receiving calls a new idempotent `/stock/receive` endpoint on inventory-service per line
  ([StockMutator.receiveOnce](services/inventory-service/src/main/java/com/erp/inventory/service/StockMutator.java)).
  Unlike the sales saga, a failed line needs no compensation - adding stock has no
  "insufficient X" failure mode, so the PO just stays `SUBMITTED` and a retry safely
  no-ops any line already received. Verified live: created a vendor, a PO, submitted it,
  received it, and confirmed on-hand stock increased by exactly the ordered quantity.
- **Two independent CQRS consumers off the same events**: `reporting-service` and
  `finance-service` both consume `sales-events`/`procurement-events` for entirely different
  purposes (a revenue projection vs. a double-entry ledger) - proving the event backbone
  supports more than one reader without sales-service or procurement-service knowing or
  caring who's listening. `finance-service` posts `OrderPlaced` → Dr Accounts Receivable /
  Cr Revenue and `PurchaseOrderReceived` → Dr Inventory / Cr Accounts Payable
  ([LedgerService.java](services/finance-service/src/main/java/com/erp/finance/service/LedgerService.java)).
  Verified the books actually balance: after a live PO receipt, `accountsPayable` and
  `inventoryValue` both read exactly the PO total, and revenue/receivables matched the
  sum of confirmed orders exactly.
- **Database-per-service**: seven separate Postgres databases/users, Flyway-managed.
- **Server-resolved pricing**: `sales-service` never trusts a client-supplied price - it resolves
  the authoritative unit price from `master-data-service` per order line before ever calling
  inventory, wrapped in the same circuit-breaker/retry/timeout pattern as the inventory call
  ([MasterDataClient.java](services/sales-service/src/main/java/com/erp/sales/client/MasterDataClient.java)).
  Verified directly: a request with a forged `unitPrice` in the body is silently ignored (the field
  doesn't exist in the DTO anymore) and the real price is charged instead.
- **k8s-ready**: every service exposes `/actuator/health/liveness` and `/actuator/health/readiness`
  separately, graceful shutdown is enabled, and Dockerfiles run as non-root.
- **Runtime-configurable frontend**: the React app's API URL isn't baked in at build time - it's
  injected into `env-config.js` by `docker-entrypoint.sh` from the container's `API_BASE_URL` env
  var, so the same built image can be repointed at a different gateway without rebuilding
  ([Dockerfile](frontend/Dockerfile), [docker-entrypoint.sh](frontend/docker-entrypoint.sh)).

## What's intentionally simplified (see ARCHITECTURE.md for the full picture)

- Single warehouse per tenant (`defaultWarehouse` in inventory-service) — multi-warehouse routing
  is a real feature, not built here.
- `sales-service` doesn't validate that `customerId` actually exists in `master-data-service` -
  it's still just a UUID reference, same as before this phase. Customer CRUD is real and working
  ([CustomerController.java](services/master-data-service/src/main/java/com/erp/masterdata/web/CustomerController.java)),
  the order flow just doesn't call it yet.
- Pricing is a single current price per item, no history/date ranges - setting a new price
  overwrites the old one with no record of what it used to be.
- `finance-service`'s ledger has no "pay the vendor" or "collect from customer" event, so
  Accounts Payable and Accounts Receivable only ever grow - there's no cash account and no
  way to close a balance out. It's a real double-entry projection of the two events that
  exist today, not a complete accounting system. Inventory value is at received cost with
  no COGS matching to what's actually been sold - a real system would need FIFO/weighted-average
  costing to move cost from Inventory to an expense account on sale, which is out of scope here.
- JWT uses a shared HS256 secret; production should move to RS256 + a JWKS endpoint on
  `identity-service` so services don't share a symmetric key.
- No service mesh / mTLS in this docker-compose setup — that's a Kubernetes + Istio concern,
  out of scope for a local compose file.
- `reporting-service` drops a message it can't parse (logs and moves on) rather than routing it to
  a dead-letter topic - a real gap for a poison message, not just a simplification, but out of
  scope here. `revenue_summary` only tracks confirmed/failed orders - `PENDING`/`CANCELLED` don't
  currently have a code path that reaches them anyway (see sales-service's `OrderStatus`), so
  there was nothing to project for those states yet.

## Local development without Docker

Each service is a normal Maven project:

```bash
cd services/identity-service
mvn spring-boot:run
```

You'll need Postgres, Kafka, and Redis running locally (or just run those three via
`docker compose up postgres kafka redis` and point the services at `localhost` via the `DB_HOST`,
`KAFKA_BOOTSTRAP_SERVERS`, `REDIS_HOST` env vars, which is what the `application.yml` defaults
already assume).

The frontend is a normal Vite project:

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173 with hot reload, pointed at `VITE_API_BASE_URL` from `frontend/.env`
(defaults to `http://localhost:18080`). Note this is a *different* config path than the dockerized
build, which reads `window.__API_BASE_URL__` from `public/env-config.js` (overwritten at container
start by `docker-entrypoint.sh` from the `API_BASE_URL` env var) - see the comment at the top of
`src/lib/api.js` for the full resolution order.

## Next steps (per the architecture roadmap)

1. ~~`master-data-service` — single source of truth for item pricing, customers, vendors.~~ Done -
   `sales-service` now resolves price server-side; customer/vendor CRUD exists but isn't
   cross-validated from the order flow yet (see "intentionally simplified" above).
2. ~~`procurement-service` + the Procure-to-Pay saga.~~ Done - purchase order lifecycle
   (draft → submit → receive), receiving calls a new `/stock/receive` endpoint on
   inventory-service (idempotent, same ledger pattern as reservations), and a `PurchaseOrderReceived`
   event feeds finance-service's ledger. Vendor existence isn't cross-validated from the PO flow,
   same simplification as customerId in sales-service.
3. ~~`reporting-service` — actually consume the Kafka events into a CQRS read model.~~ Done -
   monthly revenue projection consumed off Kafka, backfill-tested against pre-existing events;
   the dashboard's revenue chart reads from it instead of summing orders client-side. Poison-message
   handling (dead-letter topic) is still a gap - see "intentionally simplified" above.
3a. ~~`finance-service`~~ (added, not on the original list) - a second, independent CQRS
   consumer of the same event backbone: a double-entry ledger posting `OrderPlaced` →
   Dr Accounts Receivable / Cr Revenue and `PurchaseOrderReceived` → Dr Inventory / Cr
   Accounts Payable. Same idempotency and backfill-on-fresh-consumer-group behavior as
   reporting-service, verified the same way (checked the ledger balanced after a live PO receipt).
4. Replace the shared-secret JWT with RS256 + JWKS.
5. Kubernetes manifests / Helm charts + Istio for the HA topology described in ARCHITECTURE.md
   section 6 (this compose file is single-node, not HA — it's for local development only).
6. Idempotency key on `POST /orders` (client-supplied, deduped the same way `/stock/reserve`
   already dedupes on `referenceId`) so a client retry after a false-timeout can't double-create
   an order — see the cold-start note above.
