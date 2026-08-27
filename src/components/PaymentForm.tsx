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

/** Crops from existing board stills — never generate froyo images. */
const BOARD_STILLS = [
  "/cup-salty-dog.webp",
  "/cup-strawberry-shortcake.webp",
  "/cup-thinner-mint.webp",
  "/cup-peanut-butter-cup.webp",
] as const;

/** Preferred still crop per topping — each board still used at most once per swirl. */
const MIXIN_STILL_PREF: Record<string, { src: (typeof BOARD_STILLS)[number]; pos: string }> = {
  pretzels: { src: "/cup-salty-dog.webp", pos: "70% 55%" },
  "fresh strawberries": {
    src: "/cup-strawberry-shortcake.webp",
    pos: "45% 35%",
  },
  strawberries: { src: "/cup-strawberry-shortcake.webp", pos: "45% 35%" },
  "animal crackers": {
    src: "/cup-strawberry-shortcake.webp",
    pos: "62% 68%",
  },
  "oreo cookie": { src: "/cup-thinner-mint.webp", pos: "40% 50%" },
  oreos: { src: "/cup-thinner-mint.webp", pos: "40% 50%" },
  "jr mints": { src: "/cup-thinner-mint.webp", pos: "70% 38%" },
  "peanut butter": { src: "/cup-peanut-butter-cup.webp", pos: "50% 45%" },
  "chocolate chips": { src: "/cup-peanut-butter-cup.webp", pos: "35% 65%" },
  nutella: { src: "/cup-thinner-mint.webp", pos: "55% 60%" },
  "salted caramel": { src: "/cup-salty-dog.webp", pos: "35% 40%" },
};

const NAMED_STILL: Record<string, string> = {
  salty_dog: "/cup-salty-dog.webp",
  strawberry_shortcake: "/cup-strawberry-shortcake.webp",
  thinner_mint: "/cup-thinner-mint.webp",
  peanut_butter_cup: "/cup-peanut-butter-cup.webp",
};

type Sprite = { key: string; src?: string; pos?: string };

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

/**
 * Ordered mix-in crops. Cap 6. Each board still file at most once
 * (never cup-salty-dog twice). No still left → 16px --ink dots. Cone excluded.
 */
function spritesForOrder(order: AppOrder): Sprite[] {
  const line: CartLine | undefined = order.lineItems[0];
  if (!line) return [];

  const mixins = line.modifiers.filter(
    (m) => !isConeMod(m) && !isSizeMod(m) && !isBaseMod(m),
  );

  const usedStills = new Set<string>();

  return mixins.slice(0, 6).map((m) => {
    const pref = MIXIN_STILL_PREF[mixinKey(m.name)];
    if (pref && !usedStills.has(pref.src)) {
      usedStills.add(pref.src);
      return { key: m.modifierId, src: pref.src, pos: pref.pos };
    }
    const next = BOARD_STILLS.find((s) => !usedStills.has(s));
    if (next) {
      usedStills.add(next);
      return { key: m.modifierId, src: next, pos: "48% 42%" };
    }
    // Missing still → ink dot
    return { key: m.modifierId };
  });
}

/** Vessel = set still of branded cup. NEVER /logo.webp. */
function cupStillForOrder(order: AppOrder): string {
  const line = order.lineItems[0];
  if (line) {
    const hit = Object.entries(NAMED_STILL).find(([key]) =>
      line.itemId.includes(key),
    );
    if (hit) return hit[1];
  }
  return "/hero-cones.webp";
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
  const sprites = useMemo(() => spritesForOrder(order), [order]);
  const cupSrc = useMemo(() => cupStillForOrder(order), [order]);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (reducedMotion) {
      finishedRef.current();
      return;
    }
    // Hard wall-clock: 800ms then Paid. CSS delays must not stack past this.
    const t = window.setTimeout(() => finishedRef.current(), 800);
    return () => window.clearTimeout(t);
  }, [reducedMotion]);

  return (
    <div
      className={`pay-swirl${reducedMotion ? " pay-swirl--reduced" : " pay-swirl--play"}`}
      aria-hidden
      style={{ pointerEvents: "none" }}
    >
      <div className="pay-swirl__stage">
        <div
          className="pay-swirl__cup"
          style={{
            backgroundImage: `url(${cupSrc})`,
          }}
        />
        <div className="pay-swirl__mixins">
          {sprites.map((s, i) =>
            s.src ? (
              <span
                key={s.key}
                className="pay-swirl__sprite"
                style={{
                  backgroundImage: `url(${s.src})`,
                  backgroundPosition: s.pos,
                  ["--i" as string]: String(i),
                }}
              />
            ) : (
              <span
                key={s.key}
                className="pay-swirl__dot"
                style={{
                  ["--i" as string]: String(i),
                }}
              />
            ),
          )}
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
      // Failure never plays the swirl; Try again stays on this sheet.
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
            <p className="pay-success__meta">
              {formatUsd(paidOrder.totalCents)} · order{" "}
              <code>{paidOrder.id}</code>
            </p>
          ) : null}
          {status === "done" ? (
            <Link
              className="btn btn--primary"
              href="/admin"
              style={{ pointerEvents: "auto" }}
            >
              View in admin
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
          {message ? <p className="form-error">{message}</p> : null}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={status === "paying" || status === "idle"}
          >
            {status === "paying"
              ? "Charging…"
              : status === "error"
                ? `Try again · ${formatUsd(order.totalCents)}`
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
