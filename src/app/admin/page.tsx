import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminOrders } from "@/components/AdminOrders";
import { DemoBanner } from "@/components/DemoBanner";
import {
  isAdminConfigured,
  readAdminSessionFromCookies,
} from "@/lib/admin-auth";
import { getAppMode } from "@/lib/env";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const authed = configured ? await readAdminSessionFromCookies() : false;
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
      {configured && authed ? (
        <AdminOrders />
      ) : (
        <AdminLoginForm configured={configured} />
      )}
    </main>
  );
}
