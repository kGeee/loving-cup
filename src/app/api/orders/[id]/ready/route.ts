import { requireAdminApi } from "@/lib/admin-auth";
import { markOrderReady } from "@/lib/orders";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  try {
    const order = await markOrderReady(id);
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mark ready failed" },
      { status: 400 },
    );
  }
}
