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
const STILL_CROPS = [
  { src: "/cup-salty-dog.webp", pos: "28% 42%" },
  { src: "/cup-salty-dog.webp", pos: "72% 58%" },
  { src: "/cup-strawberry-shortcake.webp", pos: "45% 35%" },
  { src: "/cup-strawberry-shortcake.webp", pos: "62% 68%" },
  { src: "/cup-thinner-mint.webp", pos: "40% 50%" },
  { src: "/cup-thinner-mint.webp", pos: "70% 38%" },
  { src: "/cup-peanut-butter-cup.webp", pos: "50% 45%" },
  { src: "/cup-peanut-butter-cup.webp", pos: "35% 65%" },
] as const;

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
  return /\b(nonfat|non-dairy|half|vanilla|chocolate|banana)\b/i.test(m.name) &&
    !/\b(cookie|chips|sauce|strawberr|blueberr|oreo|mint|pretzel|cracker|coconut|nutella|almond butter|heath|mango|cereal)\b/i.test(
      m.name,
    );
}

/** Named: locked recipe mix-ins first (they appear first on the line), then extras. MYO: selected chips. Cap 6. Cone excluded. */
function spritesForOrder(order: AppOrder): Sprite[] {
  const line: CartLine | undefined = order.lineItems[0];
  if (!line) return [];

  const mixins = line.modifiers.filter(
    (m) => !isConeMod(m) && !isSizeMod(m) && !isBaseMod(m),
  );

  return mixins.slice(0, 6).map((m, i) => {
    const crop = STILL_CROPS[i % STILL_CROPS.length];
    // Prefer a named cup still when the line maps to one; otherwise board crop.
    const fromItem = Object.entries(NAMED_STILL).find(([key]) =>
      line.itemId.includes(key),
    )?.[1];
    if (!crop) return { key: m.modifierId };
    return {
      key: m.modifierId,
      src: fromItem && i < 2 ? fromItem : crop.src,
      pos: crop.pos,
    };
  });
}

function cupStillForOrder(order: AppOrder): string {
  const line = order.lineItems[0];
  if (!line) return "/logo.webp";
  const hit = Object.entries(NAMED_STILL).find(([key]) =>
    line.itemId.includes(key),
  );
  return hit?.[1] ?? "/logo.webp";
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
  const [phase, setPhase] = useState<"in" | "drop" | "swirl" | "done">(
    reducedMotion ? "done" : "in",
  );
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (reducedMotion) {
      finishedRef.current();
      return;
    }
    const t1 = window.setTimeout(() => setPhase("drop"), 100);
    const t2 = window.setTimeout(() => setPhase("swirl"), 500);
    const t3 = window.setTimeout(() => setPhase("done"), 720);
    const t4 = window.setTimeout(() => finishedRef.current(), 800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [reducedMotion]);

  return (
    <div
      className={`pay-swirl pay-swirl--${phase}${reducedMotion ? " pay-swirl--reduced" : ""}`}
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
                  animationDelay: `${100 + i * 60}ms`,
                  ["--i" as string]: String(i),
                }}
              />
            ) : (
              <span
                key={s.key}
                className="pay-swirl__dot"
                style={{ animationDelay: `${100 + i * 60}ms` }}
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
  onPaid: () => void;
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
      setPaidOrder(data.order as AppOrder);
      if (reducedMotion) setShowPaidLabel(true);
      setStatus("swirling");
      onPaidRef.current();
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

  if ((status === "swirling" || status === "done") && paidOrder) {
    return (
      <div className="pay-success">
        <PaySwirl
          order={paidOrder}
          reducedMotion={reducedMotion}
          onFinished={onSwirlFinished}
        />
        {showPaidLabel ? (
          <p className="pay-success__paid">Paid · NOPA pickup</p>
        ) : (
          <p className="pay-success__paid pay-success__paid--slot" aria-hidden>
            &nbsp;
          </p>
        )}
        <p className="pay-success__meta">
          {formatUsd(paidOrder.totalCents)} · order{" "}
          <code>{paidOrder.id}</code>
        </p>
        <Link className="btn btn--primary" href="/admin">
          View in admin
        </Link>
      </div>
    );
  }

  return (
    <form className="pay-form" onSubmit={onSubmit}>
      {mode === "demo" ? (
        <div className="fake-pay">
          <p>
            <strong>Fake-pay (demo)</strong> — no card charged. Creates a paid
            pickup order in the local demo store.
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
