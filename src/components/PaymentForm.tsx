"use client";

import { CupBuildAnimation } from "@/components/CupBuildAnimation";
import { formatUsd } from "@/lib/pricing";
import type { AppOrder } from "@/types/menu";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

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
  /** null until matchMedia resolves — avoids play→reduced abort race. */
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [forceMotion, setForceMotion] = useState(false);
  const cardRef = useRef<{
    tokenize: () => Promise<{ status: string; token?: string }>;
  } | null>(null);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForceMotion(params.get("motion") === "1");
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
      if (reducedMotion && !forceMotion) setShowPaidLabel(true);
      setStatus("swirling");
      onPaidRef.current(paid);
    } catch (e) {
      // Failure never plays the build; cart stays; Try again stays tappable.
      setMessage(e instanceof Error ? e.message : "Payment failed");
      setStatus("error");
    }
  }

  async function onSubmit(e: FormEvent) {
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

  function onBuildFinished() {
    setShowPaidLabel(true);
    setStatus("done");
  }

  const showOverlay =
    (status === "swirling" || status === "done") &&
    paidOrder &&
    reducedMotion !== null;

  return (
    <div className="pay-form-wrap">
      {showOverlay ? (
        <div className="pay-sheet-overlay" style={{ pointerEvents: "none" }}>
          <CupBuildAnimation
            order={paidOrder}
            reducedMotion={reducedMotion}
            forceMotion={forceMotion}
            onFinished={onBuildFinished}
            footer={
              <>
                {showPaidLabel ? (
                  <p className="cup-build-hero__paid">Paid · NOPA pickup</p>
                ) : null}
                {status === "done" ? (
                  <Link
                    className="btn btn--primary btn--pay cup-build-hero__cta"
                    href="/#menu"
                    style={{ pointerEvents: "auto" }}
                  >
                    See menu
                  </Link>
                ) : null}
              </>
            }
          />
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
