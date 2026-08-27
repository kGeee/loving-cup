"use client";

import { useCart } from "@/components/CartProvider";
import { PaymentForm } from "@/components/PaymentForm";
import { cartLineTotal, formatUsd } from "@/lib/pricing";
import type { AppOrder, LoyaltyPreview } from "@/types/menu";
import Link from "next/link";
import { useEffect, useState } from "react";

export function CartCheckout({ mode }: { mode: "demo" | "square" }) {
  const { lines, removeLine, clear, subtotalCents } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [applyRewards, setApplyRewards] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltyPreview | null>(null);
  const [order, setOrder] = useState<AppOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = phone ? `?phone=${encodeURIComponent(phone)}` : "";
    fetch(`/api/loyalty${q}`)
      .then((r) => r.json())
      .then((d: { loyalty: LoyaltyPreview }) => setLoyalty(d.loyalty))
      .catch(() => setLoyalty(null));
  }, [phone]);

  const rewardCents =
    applyRewards && loyalty?.rewardTiers?.[0]?.discountCents
      ? loyalty.rewardTiers[0].discountCents
      : applyRewards && loyalty?.catalogDiscount
        ? loyalty.catalogDiscount.discountCents
        : 0;
  const due = Math.max(0, subtotalCents - rewardCents);

  async function createOrder() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone || undefined,
          pickupNote: note || undefined,
          lineItems: lines,
          applyRewards,
          rewardTierId: loyalty?.rewardTiers?.[0]?.id,
          loyaltyAccountId: loyalty?.accountId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create order");
      setOrder(data.order as AppOrder);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  if (lines.length === 0 && !order) {
    return (
      <div className="empty-cart">
        <p>Your cart is empty.</p>
        <Link href="/#menu" className="btn btn--primary">
          See menu
        </Link>
      </div>
    );
  }

  if (order) {
    return (
      <div className="checkout-panel">
        <h2>Pay for pickup</h2>
        <p className="lede">
          Order <code>{order.id}</code> · {formatUsd(order.totalCents)} · NOPA
          pickup
        </p>
        <PaymentForm
          mode={mode}
          order={order}
          onPaid={() => {
            clear();
          }}
        />
      </div>
    );
  }

  return (
    <div className="checkout-panel">
      <ul className="cart-lines">
        {lines.map((line) => (
          <li key={line.lineId} className="cart-line">
            <div>
              <strong>
                {line.itemName} · {line.variationName}
              </strong>
              <p>
                {line.modifiers.map((m) => m.name).join(", ") || "No extras"}
              </p>
              <p>{formatUsd(cartLineTotal(line))}</p>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => removeLine(line.lineId)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="totals">
        <div>
          <span>Subtotal</span>
          <span>{formatUsd(subtotalCents)}</span>
        </div>
        {rewardCents > 0 ? (
          <div>
            <span>Rewards</span>
            <span>−{formatUsd(rewardCents)}</span>
          </div>
        ) : null}
        <div className="totals__due">
          <span>Due</span>
          <span>{formatUsd(due)}</span>
        </div>
      </div>

      <label className="field">
        Pickup name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name for the counter"
          required
        />
      </label>
      <label className="field">
        Phone (rewards lookup)
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="415…"
          inputMode="tel"
        />
      </label>
      <label className="field">
        Pickup note
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
        />
      </label>

      {loyalty?.available ? (
        <label className="check">
          <input
            type="checkbox"
            checked={applyRewards}
            onChange={(e) => setApplyRewards(e.target.checked)}
          />
          Redeem rewards — {loyalty.message}
        </label>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <button
        type="button"
        className="btn btn--primary"
        disabled={busy || !name.trim()}
        onClick={createOrder}
      >
        {busy ? "Creating order…" : "Continue to payment"}
      </button>
      <p className="fine-print">Pickup only at NOPA · 608 Divisadero St · Hours 11–10 · no delivery</p>
    </div>
  );
}
