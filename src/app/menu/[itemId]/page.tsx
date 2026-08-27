import { CupCustomizer } from "@/components/CupCustomizer";
import { DemoBanner } from "@/components/DemoBanner";
import { fetchCatalogItem } from "@/lib/catalog";
import { getAppMode } from "@/lib/env";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MenuItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const mode = getAppMode();
  const item = await fetchCatalogItem(itemId);
  if (!item) notFound();

  return (
    <main>
      <div className="section" style={{ paddingBottom: 0, paddingTop: "0.5rem" }}>
        <DemoBanner mode={mode} />
      </div>
      <div className="page-head">
        <p className="fine-print">
          <Link href="/#menu">← Menu</Link>
        </p>
        <h1>{item.name}</h1>
        {item.description ? <p className="lede">{item.description}</p> : null}
      </div>
      <CupCustomizer item={item} />
    </main>
  );
}
