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
  const mode = getAppMode();

  // Fail-closed board: no ADMIN_PASSWORD → no login form, no order APIs.
  // Show a clear offline page instead of a cryptic Next.js 404.
  if (!isAdminConfigured()) {
    return (
      <main>
        <DemoBanner mode={mode} />
        <div className="page-head">
          <p className="fine-print">
            <Link href="/">← Loving Cup</Link>
          </p>
          <h1>Kitchen board offline</h1>
          <p className="lede">
            Admin is fail-closed until <code>ADMIN_PASSWORD</code> is set in
            the Vercel project env (Preview and Production), then redeploy. Do
            not commit the password.
          </p>
        </div>
      </main>
    );
  }

  const authed = await readAdminSessionFromCookies();

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
