"use client";

import { formatUsd } from "@/lib/pricing";
import type { AppOrder, CartLine, CartModifierSelection } from "@/types/menu";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    Square?: {
      payments: (
        appId: string,
        locationId: string,
      ) => Promise<{
        card: () => Promise<{
          attach: (selector: string) => Promise<void>;
          tokenize: () => Promise<{
            status: string;
            token?: string;
            errors?: unknown;
          }>;
        }>;
      }>;
    };
  }
}

/** Existing set stills only — never invent froyo images. */
const PALE_STILL = "/cup-strawberry-shortcake.webp";
/** Dude Abides product still — chocolate / Lone Wolf. */
const DUDE_ABIDES = "/cup-lone-wolf.webp";
/** Boitano cookies-and-cream still — Thinner Mint + Oreos shards. */
const BOITANO = "/cup-thinner-mint.webp";
const MYO_STILL = PALE_STILL;

/**
 * Design-lock named → product still (never shuffle).
 * Dirty Hipster / Mango Dream / Crunchy Cereal have no still → base fallback.
 */
const NAMED_STILL: Record<string, string> = {
  salty_dog: "/cup-salty-dog.webp",
  strawberry_shortcake: "/cup-strawberry-shortcake.webp",
  thinner_mint: BOITANO,
  peanut_butter_cup: "/cup-peanut-butter-cup.webp",
  blueberry_dream: "/cup-blueberry-dream.webp",
  lone_wolf: DUDE_ABIDES,
};

/** Per-still crop anchors: cup wall (logo), yogurt mass, around-cup shards. */
type StillCrops = {
  wall: string;
  yogurt: string;
  shards: string[];
};

const STILL_CROPS: Record<string, StillCrops> = {
  "/cup-salty-dog.webp": {
    wall: "50% 70%",
    yogurt: "50% 28%",
    shards: ["14% 52%", "78% 58%", "18% 68%", "82% 42%", "10% 40%", "88% 65%"],
  },
  "/cup-strawberry-shortcake.webp": {
    wall: "46% 72%",
    yogurt: "46% 26%",
    shards: ["12% 42%", "82% 52%", "16% 65%", "78% 36%", "8% 55%", "90% 60%"],
  },
  "/cup-thinner-mint.webp": {
    wall: "50% 58%",
    yogurt: "50% 48%",
    shards: ["72% 22%", "78% 38%", "18% 42%", "22% 68%", "68% 72%", "12% 28%"],
  },
  "/cup-peanut-butter-cup.webp": {
    wall: "50% 68%",
    yogurt: "50% 30%",
    shards: ["16% 48%", "80% 55%", "20% 70%", "84% 40%", "10% 38%", "88% 68%"],
  },
  "/cup-blueberry-dream.webp": {
    wall: "50% 48%",
    yogurt: "48% 42%",
    shards: ["22% 28%", "78% 32%", "18% 72%", "82% 68%", "12% 48%", "88% 52%"],
  },
  "/cup-lone-wolf.webp": {
    wall: "42% 48%",
    yogurt: "40% 42%",
    shards: ["72% 38%", "78% 58%", "18% 55%", "22% 30%", "68% 72%", "12% 70%"],
  },
};

/**
 * Mix-in shard prefs (override same-still shards).
 * Oreos → Boitano. Nutella → Dude Abides left crop — never Thinner Mint.
 */
const MIXIN_STILL_PREF: Record<string, { src: string; pos: string }> = {
  oreos: { src: BOITANO, pos: "74% 24%" },
  "oreo cookie": { src: BOITANO, pos: "74% 24%" },
  nutella: { src: DUDE_ABIDES, pos: "18% 42%" },
};

type Sprite = { key: string; src: string; pos: string };

function isConeMod(m: CartModifierSelection): boolean {
  return /\bcone\b/i.test(m.name);
}

function isSizeMod(m: CartModifierSelection): boolean {
  return /^(small|medium|large|pint|akid)$/i.test(m.name.trim());
}

function isBaseMod(m: CartModifierSelection): boolean {
  return (
    /\b(nonfat|non-dairy|half|vanilla|chocolate|banana)\b/i.test(m.name) &&
    !/\b(cookie|chips|sauce|strawberr|blueberr|oreo|mint|pretzel|cracker|coconut|nutella|almond butter|heath|mango|cereal|caramel)\b/i.test(
      m.name,
    )
  );
}

function mixinKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Chocolate yogurt base only — mix-ins never flip the cup still (Nutella stays a shard). */
function orderHasChocolateBase(line: CartLine): boolean {
  const bases = line.modifiers.filter(isBaseMod);
  if (bases.some((m) => /\bchocolate\b/i.test(m.name))) return true;
  // Named sold-out chocolate recipes with no base modifier on the line.
  return /\b(mocha|lone wolf)\b/i.test(line.itemName);
}

/**
 * Named product still when it exists; else chocolate base → Dude Abides,
 * pale (Dirty Hipster, Mango Dream, Crunchy Cereal, MYO, …) → Shortcake.
 * Wall / yogurt / finished all share this still. Mix-in shards may prefer.
 */
function cupStillForOrder(order: AppOrder): string {
  const line = order.lineItems[0];
  if (!line) return MYO_STILL;

  const hit = Object.entries(NAMED_STILL).find(([key]) =>
    line.itemId.includes(key),
  );
  if (hit) return hit[1];

  return orderHasChocolateBase(line) ? DUDE_ABIDES : PALE_STILL;
}

function cropsFor(still: string): StillCrops {
  return STILL_CROPS[still] ?? STILL_CROPS[MYO_STILL];
}

/**
 * Mix-in shards. Cap 6. Oreos → Boitano; Nutella → Dude Abides left crop.
 * Others crop from the cup still. Cone excluded.
 */
function spritesForOrder(order: AppOrder, still: string): Sprite[] {
  const line: CartLine | undefined = order.lineItems[0];
  if (!line) return [];

  const mixins = line.modifiers.filter(
    (m) => !isConeMod(m) && !isSizeMod(m) && !isBaseMod(m),
  );
  const crops = cropsFor(still);

  return mixins.slice(0, 6).map((m, i) => {
    const key = mixinKey(m.name);
    const pref = MIXIN_STILL_PREF[key];
    if (pref) {
      return { key: m.modifierId, src: pref.src, pos: pref.pos };
    }
    return {
      key: m.modifierId,
      src: still,
      pos: crops.shards[i % crops.shards.length],
    };
  });
}

function PaySwirl({
  order,
  reducedMotion,
  onFinished,
}: {
  order: AppOrder;
  reducedMotion: boolean;
  onFinished: () => void;
}) {
  const still = useMemo(() => cupStillForOrder(order), [order]);
  const crops = useMemo(() => cropsFor(still), [still]);
  const sprites = useMemo(() => spritesForOrder(order, still), [order, still]);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (reducedMotion) {
      finishedRef.current();
      return;
    }
    // Hard wall-clock: 1200ms then Paid. CSS delays must not stack past this.
    const t = window.setTimeout(() => finishedRef.current(), 1200);
    return () => window.clearTimeout(t);
  }, [reducedMotion]);

  return (
    <div
      className={`pay-swirl${reducedMotion ? " pay-swirl--reduced" : " pay-swirl--play"}`}
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      <div className="pay-swirl__counter">
        <div className="pay-swirl__perspective">
          <div className="pay-swirl__stage">
            <div className="pay-swirl__shadow" />
            {/* Wall + yogurt + finished = same still, object-fit cover fills 240. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pay-swirl__cup-wall"
              src={still}
              alt=""
              style={{ objectPosition: crops.wall }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pay-swirl__yogurt"
              src={still}
              alt=""
              style={{ objectPosition: crops.yogurt }}
            />
            <div className="pay-swirl__mixins">
              {sprites.map((s, i) => (
                <span
                  key={s.key}
                  className="pay-swirl__sprite"
                  style={{
                    backgroundImage: `url(${s.src})`,
                    backgroundPosition: s.pos,
                    ["--i" as string]: String(i),
                  }}
                />
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="pay-swirl__finished"
              src={still}
              alt=""
              style={{ objectPosition: "50% 50%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentForm({
  mode,
  order,
  onPaid,
}: {
  mode: "demo" | "square";
  order: AppOrder;
  onPaid: (paid: AppOrder) => void;
}) {
  const [status, setStatus] = useState<
    "idle" | "ready" | "paying" | "swirling" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [paidOrder, setPaidOrder] = useState<AppOrder | null>(null);
  const [showPaidLabel, setShowPaidLabel] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const cardRef = useRef<{
    tokenize: () => Promise<{ status: string; token?: string }>;
  } | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (mode === "demo") {
      setStatus("ready");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const statusRes = await fetch("/api/status");
        const statusJson = (await statusRes.json()) as {
          squareConfigured: boolean;
        };
        const envRes = await fetch("/api/payments/config");
        const cfg = (await envRes.json()) as {
          applicationId?: string | null;
          locationId?: string | null;
        };
        const applicationId =
          cfg.applicationId ||
          process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ||
          "";
        const locationId = cfg.locationId || "";
        if (!statusJson.squareConfigured || !applicationId || !locationId) {
          setMessage(
            "Square Web Payments needs SQUARE_APPLICATION_ID + SQUARE_LOCATION_ID (and NEXT_PUBLIC_SQUARE_APPLICATION_ID).",
          );
          setStatus("error");
          return;
        }
        await loadSquareScript();
        if (cancelled || !window.Square) return;
        const payments = await window.Square.payments(
          applicationId,
          locationId,
        );
        const card = await payments.card();
        await card.attach("#card-container");
        cardRef.current = card;
        setStatus("ready");
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Payments SDK failed");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  async function pay(sourceId: string) {
    // Pay first — button reads Paying, no overlay until success.
    setStatus("paying");
    setMessage(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          sourceId,
          amountCents: order.totalCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      const paid = data.order as AppOrder;
      setPaidOrder(paid);
      if (reducedMotion) setShowPaidLabel(true);
      setStatus("swirling");
      onPaidRef.current(paid);
    } catch (e) {
      // Failure never plays the swirl; cart stays; Try again stays tappable.
      setMessage(e instanceof Error ? e.message : "Payment failed");
      setStatus("error");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "demo") {
      await pay("demo-fake-nonce");
      return;
    }
    if (!cardRef.current) return;
    const result = await cardRef.current.tokenize();
    if (result.status === "OK" && result.token) {
      await pay(result.token);
    } else {
      setMessage("Card tokenization failed.");
      setStatus("error");
    }
  }

  function onSwirlFinished() {
    setShowPaidLabel(true);
    setStatus("done");
  }

  const showOverlay =
    (status === "swirling" || status === "done") && paidOrder;

  return (
    <div className="pay-form-wrap">
      {showOverlay ? (
        <div className="pay-sheet-overlay" style={{ pointerEvents: "none" }}>
          <PaySwirl
            order={paidOrder}
            reducedMotion={reducedMotion}
            onFinished={onSwirlFinished}
          />
          {showPaidLabel ? (
            <p className="pay-success__paid">Paid · NOPA pickup</p>
          ) : (
            <p
              className="pay-success__paid pay-success__paid--slot"
              aria-hidden
            >
              &nbsp;
            </p>
          )}
          {status === "done" ? (
            <Link
              className="btn btn--primary btn--pay"
              href="/#menu"
              style={{ pointerEvents: "auto" }}
            >
              See menu
            </Link>
          ) : null}
        </div>
      ) : null}

      {!showOverlay ? (
        <form className="pay-form" onSubmit={onSubmit}>
          {mode === "demo" ? (
            <div className="fake-pay">
              <p>
                <strong>Fake-pay (demo)</strong> — no card charged. Creates a
                paid pickup order in the local demo store.
              </p>
            </div>
          ) : (
            <div id="card-container" className="card-box" />
          )}
          {message ? (
            <p className="form-error form-error--chocolate">{message}</p>
          ) : null}
          <button
            type="submit"
            className="btn btn--primary btn--pay"
            disabled={status === "paying" || status === "idle"}
          >
            {status === "paying"
              ? "Paying"
              : status === "error"
                ? "Try again"
                : `Pay ${formatUsd(order.totalCents)}`}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function loadSquareScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Square) {
      resolve();
      return;
    }
    const existing = document.querySelector("script[data-square-web]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const s = document.createElement("script");
    s.src = "https://sandbox.web.squarecdn.com/v1/square.js";
    s.async = true;
    s.dataset.squareWeb = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Square.js"));
    document.body.appendChild(s);
  });
}
