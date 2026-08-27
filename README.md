# Loving Cup

NOPA-only froyo order-ahead on Next.js 15 (App Router) + TypeScript + Vercel.

## Vercel preview (demo path — Kevin)

Connect the GitHub repo to Vercel for PR previews. **Demo only**: do **not** put `SQUARE_*` secrets on the preview.

Optional preview env (name only — set the value in Vercel, never commit it):

```bash
ADMIN_PASSWORD=
```

- Without `ADMIN_PASSWORD`: `/admin` and admin APIs are **404/401** (fail-closed — no open kitchen board on the public demo).
- With `ADMIN_PASSWORD`: `/admin` shows a password form, then a signed httpOnly cookie unlocks the board + Mark ready.
- Menu / cart / fake-pay stay **public** and labeled demo.

No `vercel.json` required — standard Next.js on Vercel.

## Modes

| Mode | When | Behavior |
|------|------|----------|
| **Demo / POC** | Any `SQUARE_*` secret missing | Labeled sample catalog + fake-pay. Same **$4.99 base + size modifiers** model as live Square. Gated off the live path. |
| **Square** | `SQUARE_APPLICATION_ID`, `SQUARE_ACCESS_TOKEN`, and `SQUARE_LOCATION_ID` (NOPA) all set | Live Catalog / Orders / Payments / Loyalty. Prices from Catalog only. |

Sandbox first when Square is used (`SQUARE_ENVIRONMENT=sandbox` by default).

## Pricing (Square Catalog model — Make Your Own / item=232)

Cup **$4.99** base variation + **size modifiers** (required, select one):

| Size | Modifier |
|------|----------|
| **akid** | Sold out (size modifier — **not** a menu item) |
| Small | +$1.01 |
| Medium | +$2.01 |
| Large | +$3.01 |
| Pint | +$7.01 |

Do **not** hardcode variation prices as $6 / $7 / $8 / $12 (JPEG sums). Extra mix-in **+$0.75**, cone **+$1.25**.

Mix-ins: Square Online shows two ~30-item grids (free + paid) with toasted coconut duplicated — **design lock wins**: **one** chip list, toasted coconut **once**.

## NOPA (only kitchen this pass)

- **608 Divisadero St**
- **415-859-3112**
- **Hours 11–10 daily** (not Square Online “Tomorrow …”, not lovingcup.com “WE'RE OPEN”; `/locations` lists 11:00–9:50)

No Marin kitchen switcher. Pickup only — **no delivery wall** on browse.

## Filters / out of pass

- Deny categories: **asides**, **adrink**, **apizza**, **astarter** (hide empty astarter; no petite prairie / marinara / ranch / diet coke).
- Out of this pass: rice pudding + 7 printed-only flavors (monster cookie, butterfinger, mocha chip, peanut butter cup, power cup, brownie obsessed, matcha).

## Env names

```bash
# Preview / demo — set in Vercel if you want the kitchen board
ADMIN_PASSWORD=

# Live Square only (not for the public demo preview)
SQUARE_APPLICATION_ID=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_WEBHOOK_SIGNATURE_KEY=
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_NOTIFICATION_URL=
NEXT_PUBLIC_SQUARE_APPLICATION_ID=
```

## Scripts

```bash
npm install
npm run dev
npm run build
npm start
```

## Demo click-through (no Square env)

1. `/` — demo banner + sample menu; hours **11–10**; no delivery modal.
2. Customize Make Your Own / a cup — size sheet shows **akid Sold out**; one mix-in row.
3. Fake-pay on `/cart`.
4. `/admin` — 404 unless `ADMIN_PASSWORD` is set; then login → Mark ready.

## Square live path

Catalog filter + CreateOrder PICKUP + Web Payments + Loyalty/discount + webhook signature verify. Square Online is reference only.
