import { lookupLoyalty } from "@/lib/loyalty";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const phone = new URL(req.url).searchParams.get("phone") ?? undefined;
  try {
    const loyalty = await lookupLoyalty(phone);
    return NextResponse.json({ loyalty });
  } catch (err) {
    return NextResponse.json(
      {
        loyalty: {
          available: false,
          mode: "demo",
          message: err instanceof Error ? err.message : "Loyalty failed",
        },
      },
      { status: 200 },
    );
  }
}
