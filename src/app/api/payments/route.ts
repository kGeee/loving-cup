import { payOrder } from "@/lib/orders";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      sourceId?: string;
      amountCents?: number;
    };
    if (!body.orderId || !body.sourceId || body.amountCents == null) {
      return NextResponse.json(
        { error: "orderId, sourceId, and amountCents are required." },
        { status: 400 },
      );
    }
    const order = await payOrder({
      orderId: body.orderId,
      sourceId: body.sourceId,
      amountCents: body.amountCents,
    });
    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment failed" },
      { status: 400 },
    );
  }
}
