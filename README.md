# Loving Cup

NOPA-only froyo order-ahead on Next.js 15 (App Router) + TypeScript + Vercel.

Live Square Catalog, pickup CreateOrder, Web Payments, loyalty/catalog-discount redeem, admin Mark ready, and a signature-verified Square webhook. Shared catalog with apizza is filtered so pizza SKUs never render.

## Modes

| Mode | When | Behavior |
|------|------|----------|
| **Demo / POC** | Any `SQUARE_*` secret missing | Sample catalog + fake-pay + in-memory admin board. Bannered as demo. Prices locked to brief Square amounts. |
| **Square** | `SQUARE_APPLICATION_ID`, `SQUARE_ACCESS_TOKEN`, and `SQUARE_LOCATION_ID` (NOPA) all set | Live Catalog / Orders / Payments / Loyalty. Fail-closed if calls fail — no invented menu. |

Sandbox first (`SQUARE_ENVIRONMENT=sandbox` by default).

## NOPA (only kitchen this pass)

- **608 Divisadero St**
- **415-859-3112**
- **11:00–9:50 daily**

No Marin kitchen switcher. Marin is omitted (no hours/address in brief — do not invent).

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

1. Open `/` — demo banner + sample menu (15 signature cups + CYOB + sold-out `akid`).
2. Customize a cup (size / base / extra mix-in / cone) → cart.
3. Pickup name → optional rewards redeem → Continue → **Fake-pay**.
4. `/admin` → open order → **Mark ready**.

Demo prices (from brief / live Square — not invented extras):

- Kid **$4.99** · S **$6** · M **$7** · L **$8** · Pint **$12**
- Extra mix-in **+$0.75** · Cone **+$1.25**
- CYOB: 2 mix-ins included
- `akid`: Sold out (cannot order)

## Square live path

- Catalog: list + filter froyo categories/items; denylist shared-catalog bleed (`petite prairie`, `marinara`/`ranch`, `diet coke`, pizza, …); location-scoped to NOPA; `akid` sold out.
- Order: `CreateOrder` with catalog variation + modifier IDs, fulfillment `PICKUP` at `SQUARE_LOCATION_ID`.
- Pay: Web Payments `source_id` → `CreatePayment` against that order.
- Rewards: Square Loyalty redeem when configured; otherwise optional catalog discount on the order — no homemade points ledger.
- Admin: open pickup orders + Mark ready (complete fulfillment / complete order).
- Webhook: `POST /api/webhooks/square` — HMAC signature verified via `WebhooksHelper`, then sync order state.

Square Online (`https://loving-cup.square.site/s/order`) is reference only, not this app.

## Vercel

Import this repo, set the env vars above, deploy. Point the Square webhook subscription at `/api/webhooks/square` and set `SQUARE_WEBHOOK_NOTIFICATION_URL` to that full URL.
