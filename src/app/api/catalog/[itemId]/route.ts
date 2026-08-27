import { fetchCatalogItem } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;
  try {
    const item = await fetchCatalogItem(itemId);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 503 },
    );
  }
}
