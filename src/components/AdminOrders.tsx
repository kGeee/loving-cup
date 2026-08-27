"use client";

import { formatUsd } from "@/lib/pricing";
import type { AppOrder } from "@/types/menu";
import { useCallback, useEffect, useState } from "react";

export function AdminOrders() {
  const [orders, setOrders] = useState<AppOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data.orders as AppOrder[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  async function markReady(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/ready`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Mark ready failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mark ready failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin">
      <div className="admin__head">
        <h1>Pickup board</h1>
        <button type="button" className="btn btn--ghost" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {orders.length === 0 ? (
        <p className="empty-state">No open pickup orders.</p>
      ) : (
        <ul className="admin-list">
          {orders.map((o) => (
            <li key={o.id} className="admin-card">
              <div>
                <p className="admin-card__name">{o.customerName}</p>
                <p className="admin-card__meta">
                  {o.status} · {formatUsd(o.totalCents)} ·{" "}
                  {new Date(o.createdAt).toLocaleTimeString()}
                </p>
                <ul className="admin-card__items">
                  {o.lineItems.map((l) => (
                    <li key={l.lineId}>
                      {l.quantity}× {l.itemName} ({l.variationName})
                      {l.modifiers.length
                        ? ` — ${l.modifiers.map((m) => m.name).join(", ")}`
                        : ""}
                    </li>
                  ))}
                </ul>
                <p className="fine-print">
                  <code>{o.id}</code>
                </p>
              </div>
              {o.status !== "READY" && o.status !== "COMPLETED" ? (
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={busyId === o.id}
                  onClick={() => void markReady(o.id)}
                >
                  {busyId === o.id ? "…" : "Mark ready"}
                </button>
              ) : (
                <span className="pill">Ready</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
