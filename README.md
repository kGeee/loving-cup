# Loving Cup

NOPA-only froyo order-ahead on Next.js 15 (App Router) + TypeScript + Vercel.

## Vercel preview (demo path)

Connect the GitHub repo to Vercel for PR previews. **Demo only**: do **not** put `SQUARE_*` secrets on the preview.

Optional preview env (name only — set the value in Vercel, never commit it):

```bash
ADMIN_PASSWORD=
```

- Without `ADMIN_PASSWORD`: `/admin` and admin APIs are **404/401** (fail-closed).
- With `ADMIN_PASSWORD`: `/admin` shows a password form, then a signed httpOnly cookie unlocks the board + Mark ready.
- Menu / cart / fake-pay stay **public**. Preview mode is one 11px line under the sticky bar (not a Demo/POC banner).

No `vercel.json` required — standard Next.js on Vercel.

## Modes

| Mode | When | Behavior |
|------|------|----------|
| **Demo** | Any `SQUARE_*` secret missing | Shop-true sample catalog + fake-pay. Same **$4.99 base + size modifiers** model as live Square. |
| **Square** | `SQUARE_APPLICATION_ID`, `SQUARE_ACCESS_TOKEN`, and `SQUARE_LOCATION_ID` (NOPA) all set | Live Catalog / Orders / Payments / Loyalty. Prices from Catalog only. |

Sandbox first when Square is used (`SQUARE_ENVIRONMENT=sandbox` by default).

## Demo catalog (shop-true)

**Orderable** (live Square alovingcup names): Mango Dream, Lone Wolf, Salty Dog, Blueberry Dream, Dirty Hipster, Strawberry Shortcake, Thinner Mint, Crunchy Cereal, Make Your Own.

**Printed sold-out** (visible, no price, cannot add): Monster Cookie, Butterfinger, Matcha, Mocha Chip, Peanut Butter Cup, Power Cup, Brownie Obsessed.

Named cups → size sheet only. Make Your Own → size, base, mix-ins (2 included / extras +$0.75), cone +$1.25.

## Pricing (Square Catalog model)

Cup **$4.99** base variation + **size modifiers** (required, select one):

| Size | Modifier |
|------|----------|
| **akid** | Sold out — **not** a selectable row |
| Small | +$1.01 |
| Medium | +$2.01 |
| Large | +$3.01 |
| Pint | +$7.01 |

Do **not** hardcode variation prices as $6 / $7 / $8 / $12 (JPEG sums). Extra mix-in **+$0.75**, cone **+$1.25**. MYO bases: nonfat vanilla / chocolate / half included; non-dairy and banana **+$0.50**.

Mix-ins: one chip list, toasted coconut once.

## NOPA (only kitchen)

- **608 Divisadero St**
- **415-859-3112**
- **Hours 11–10 daily**

No Marin kitchen switcher. Pickup only — **no delivery wall** on browse.

## Filters

- Deny categories: **asides**, **adrink**, **apizza**, **astarter** (hide empty astarter).
- Hide rice pudding. Printed sold-out flavors stay on the menu.

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

1. `/` — creamery home + shop menu (9 orderable + 7 sold-out); hours **11–10**; no delivery modal.
2. Named cup → size only; Make Your Own → full sheet; **akid** not a size row.
3. Fake-pay on `/cart`. Empty cart → one line + berry See menu.
4. `/admin` — 404 unless `ADMIN_PASSWORD` is set.

## Square live path

Catalog filter + CreateOrder PICKUP + Web Payments + Loyalty/discount + webhook signature verify. Square Online is reference only.
