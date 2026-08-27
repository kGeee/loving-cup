import { AdminOrders } from "@/components/AdminOrders";
import { DemoBanner } from "@/components/DemoBanner";
import { getAppMode } from "@/lib/env";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminPage() {
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
      <AdminOrders />
    </main>
  );
}
