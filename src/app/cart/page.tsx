import { CartCheckout } from "@/components/CartCheckout";
import { DemoBanner } from "@/components/DemoBanner";
import { getAppMode } from "@/lib/env";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const mode = getAppMode();
  return (
    <main>
      <div className="section" style={{ paddingBottom: 0, paddingTop: "0.5rem" }}>
        <DemoBanner mode={mode} />
      </div>
      <div className="page-head">
        <p className="fine-print">
          <Link href="/#menu">← Keep shopping</Link>
        </p>
        <h1>Cart &amp; pickup</h1>
        <p className="lede">NOPA pickup only. Pay here, pick up at the counter.</p>
      </div>
      <CartCheckout mode={mode} />
    </main>
  );
}
