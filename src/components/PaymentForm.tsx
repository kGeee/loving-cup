"use client";

import { formatUsd } from "@/lib/pricing";
import type { AppOrder } from "@/types/menu";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  onPaid: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "ready" | "paying" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [paidOrder, setPaidOrder] = useState<AppOrder | null>(null);
  const [adminConfigured, setAdminConfigured] = useState(false);
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { adminConfigured?: boolean }) =>
        setAdminConfigured(Boolean(d.adminConfigured)),
      )
      .catch(() => setAdminConfigured(false));
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
        const payments = await window.Square.payments(applicationId, locationId);
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
      setStatus("done");
      onPaid();
    } catch (e) {
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

  if (status === "done" && paidOrder) {
    return (
      <div className="pay-success">
        <h3>You&apos;re paid — see you at NOPA</h3>
        <p>
          {formatUsd(paidOrder.totalCents)} · order{" "}
          <code>{paidOrder.id}</code>
        </p>
        {adminConfigured ? (
          <Link className="btn btn--primary" href="/admin">
            View in admin
          </Link>
        ) : (
          <p className="fine-print">
            Kitchen board is offline until <code>ADMIN_PASSWORD</code> is set
            in Vercel.
          </p>
        )}
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
