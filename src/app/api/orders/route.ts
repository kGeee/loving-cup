import {
  createPickupOrder,
  listOpenPickupOrders,
} from "@/lib/orders";
import type { CartLine } from "@/types/menu";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orders = await listOpenPickupOrders();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed", orders: [] },
      { status: 503 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      customerName?: string;
      customerPhone?: string;
      pickupNote?: string;
      lineItems?: CartLine[];
      applyRewards?: boolean;
      rewardTierId?: string;
      loyaltyAccountId?: string;
    };

    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { error: "Pickup name is required." },
        { status: 400 },
      );
    }
    if (!body.lineItems?.length) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    // Hard block akid
    for (const line of body.lineItems) {
      if (
        /\bakid\b/i.test(line.itemId) ||
        /\bakid\b/i.test(line.itemName) ||
        /\bakid\b/i.test(line.variationId)
      ) {
        return NextResponse.json(
          { error: "akid is sold out and cannot be ordered." },
          { status: 400 },
        );
      }
    }

    const order = await createPickupOrder({
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone?.trim(),
      pickupNote: body.pickupNote?.trim(),
      lineItems: body.lineItems,
      applyRewards: body.applyRewards,
      rewardTierId: body.rewardTierId,
      loyaltyAccountId: body.loyaltyAccountId,
    });

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "CreateOrder failed" },
      { status: 400 },
    );
  }
}
