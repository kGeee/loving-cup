# Loving Cup

NOPA-only froyo order-ahead on Next.js 15 (App Router) + TypeScript + Vercel.

Live Square Catalog, pickup CreateOrder, Web Payments, loyalty/catalog-discount redeem, admin Mark ready, and a signature-verified Square webhook. Shared catalog with apizza is filtered so pizza SKUs never render.

## Modes

| Mode | When | Behavior |
|------|------|----------|
| **Demo / POC** | Any `SQUARE_*` secret missing | Labeled sample catalog + fake-pay + in-memory admin. Same **$4.99 base + size modifiers** model as live Square. Gated off the live path. |
| **Square** | `SQUARE_APPLICATION_ID`, `SQUARE_ACCESS_TOKEN`, and `SQUARE_LOCATION_ID` (NOPA) all set | Live Catalog / Orders / Payments / Loyalty. Prices from Catalog only — never invent or copy /menu JPEG totals. |

Sandbox first (`SQUARE_ENVIRONMENT=sandbox` by default).

## Pricing (Square Catalog model)

Cup **$4.99** base variation + **size modifiers**:

| Size | Modifier |
|------|----------|
| Kid | +$0.00 |
| Small | +$1.01 |
| Medium | +$2.01 |
| Large | +$3.01 |
| Pint | +$7.01 |

Do **not** hardcode variation prices as $6 / $7 / $8 / $12 (those are JPEG totals, not Catalog rows). Extra mix-in **+$0.75**, cone **+$1.25**. CYOB: 2 mix-ins included.

## NOPA (only kitchen this pass)

- **608 Divisadero St**
- **415-859-3112**
- **Hours 11–10 daily** (not Square Online “Tomorrow …”, not lovingcup.com “WE'RE OPEN”)

No Marin kitchen switcher. Pickup only — **no delivery wall** on browse (do not copy Square `/s/order` Delivery modal).

## Design lock extras

- Hide empty **`astarter`**
- Mix-in sheet: **one** chip list; **Toasted Coconut** once (not two ~30-item grids)
- Out of this pass: 7 missing printed flavors + rice pudding (do not invent)
- **`akid`**: Sold out (cannot order)

## Env secrets (names only — Kevin sets values)

```bash
SQUARE_APPLICATION_ID=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=          # NOPA location
SQUARE_WEBHOOK_SIGNATURE_KEY=
# optional
SQUARE_ENVIRONMENT=sandbox   # or production
SQUARE_WEBHOOK_NOTIFICATION_URL=https://<host>/api/webhooks/square
NEXT_PUBLIC_SQUARE_APPLICATION_ID=   # same app id for Web Payments SDK
```

Do not commit real values. The app runs without secrets in demo mode.

## Scripts

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start
```

## Demo click-through (no Square env)

1. Open `/` — demo banner + sample menu; hours **11–10**; no delivery modal.
2. Customize a cup (size / base / mix-ins / cone) → cart. Mix-ins are one chip row.
3. Pickup name → optional rewards → Continue → **Fake-pay**.
4. `/admin` → open order → **Mark ready**.

## Square live path

- Catalog: list + filter froyo; hide `astarter` / rice pudding; denylist shared-catalog bleed; collapse duplicate mix-in lists; location-scoped to NOPA; `akid` sold out.
- Order: `CreateOrder` with catalog variation + modifier IDs, fulfillment `PICKUP` at `SQUARE_LOCATION_ID`.
- Pay: Web Payments `source_id` → `CreatePayment` against that order (Square is the card processor when env is set).
- Rewards: Square Loyalty redeem when configured; otherwise optional catalog discount — no homemade points ledger.
- Admin: open pickup orders + Mark ready.
- Webhook: `POST /api/webhooks/square` — HMAC signature verified, then sync order state.

Square Online (`https://loving-cup.square.site/s/order`) is reference only, not this app.

## Vercel

Import this repo, set the env vars above, deploy. Point the Square webhook subscription at `/api/webhooks/square` and set `SQUARE_WEBHOOK_NOTIFICATION_URL` to that full URL.
