import { fetchCatalog, getCatalogModeInfo } from "@/lib/catalog";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await fetchCatalog();
    const info = getCatalogModeInfo();
    return NextResponse.json({ ...catalog, ...info });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load catalog",
        mode: getCatalogModeInfo().mode,
        items: [],
        categories: [],
      },
      { status: 503 },
    );
  }
}
