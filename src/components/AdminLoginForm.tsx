"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const UNCONFIGURED_COPY =
  "Admin isn't configured on this deploy. Set `ADMIN_PASSWORD` on Vercel, then reload.";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 503
            ? ((data.error as string) || UNCONFIGURED_COPY)
            : (data.error as string) || "Login failed",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <div className="checkout-panel">
        <h1 style={{ fontFamily: "var(--font-display)", margin: 0 }}>Admin</h1>
        <p className="lede">{UNCONFIGURED_COPY}</p>
      </div>
    );
  }

  return (
    <form className="checkout-panel" onSubmit={onSubmit}>
      <h1 style={{ fontFamily: "var(--font-display)", margin: 0 }}>Admin</h1>
      <p className="lede">Kitchen board — password required.</p>
      <label className="field">
        Password
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? "Checking…" : "Enter"}
      </button>
    </form>
  );
}
