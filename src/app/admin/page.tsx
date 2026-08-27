import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminOrders } from "@/components/AdminOrders";
import { DemoBanner } from "@/components/DemoBanner";
import {
  isAdminConfigured,
  readAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { getAppMode } from "@/lib/env";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Fail-closed: no ADMIN_PASSWORD → public demo must not expose the kitchen board.
  if (!isAdminConfigured()) {
    notFound();
  }

  const authed = await readAdminSessionFromCookies();
  const mode = getAppMode();

  return (
    <main>
      <div className="section" style={{ paddingBottom: 0, paddingTop: "0.5rem" }}>
        <DemoBanner mode={mode} />
      </div>
      <div className="page-head">
        <p className="fine-print">
          <Link href="/">← Loving Cup</Link>
        </p>
      </div>
      {authed ? <AdminOrders /> : <AdminLoginForm />}
    </main>
  );
}
