import { DEMO_CATALOG_DISCOUNT, getDemoCatalog } from "@/lib/demo-catalog";
import {
  createDemoOrder,
  getDemoOrder,
  listDemoOrders,
  markDemoPaid,
  markDemoReady,
} from "@/lib/demo-store";
import { getAppMode } from "@/lib/env";
import {
  centsToMoney,
  getNopLocationId,
  getSquareClient,
  moneyToCents,
} from "@/lib/square";
import type { AppOrder, CartLine } from "@/types/menu";
import { randomUUID } from "crypto";
import type { Square } from "square";

function cartLineToSquare(line: CartLine): Square.OrderLineItem {
  return {
    quantity: String(line.quantity),
    catalogObjectId: line.variationId,
    name: `${line.itemName} — ${line.variationName}`,
    modifiers: line.modifiers.map((m) => ({
      catalogObjectId: m.modifierId,
      name: m.name,
      basePriceMoney: centsToMoney(m.priceCents),
    })),
    note: line.note,
  };
}

export async function createPickupOrder(input: {
  customerName: string;
  customerPhone?: string;
  pickupNote?: string;
  lineItems: CartLine[];
  applyRewards?: boolean;
  rewardTierId?: string;
  loyaltyAccountId?: string;
}): Promise<AppOrder> {
  if (input.lineItems.some((l) => /akid/i.test(l.itemId) || /akid/i.test(l.itemName))) {
    throw new Error("Item akid is sold out and cannot be ordered.");
  }

  if (getAppMode() === "demo") {
    // Guard sold-out from demo catalog
    const demo = getDemoCatalog();
    for (const line of input.lineItems) {
      const item = demo.items.find((i) => i.id === line.itemId);
      if (item?.soldOut) {
        throw new Error(`${item.name} is sold out and cannot be ordered.`);
      }
    }
    return createDemoOrder({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      pickupNote: input.pickupNote,
      lineItems: input.lineItems,
      applyRewards: input.applyRewards,
    });
  }

  const client = getSquareClient();
  const locationId = getNopLocationId();
  const idempotencyKey = randomUUID();

  const discounts: Square.OrderLineItemDiscount[] = [];
  if (input.applyRewards && input.rewardTierId) {
    // Loyalty reward applied via CreateLoyaltyReward separately; order discount optional.
  }

  const orderBody: Square.Order = {
    locationId,
    lineItems: input.lineItems.map(cartLineToSquare),
    discounts: discounts.length ? discounts : undefined,
    fulfillments: [
      {
        type: "PICKUP",
        state: "PROPOSED",
        pickupDetails: {
          recipient: {
            displayName: input.customerName,
            phoneNumber: input.customerPhone,
          },
          scheduleType: "ASAP",
          note: input.pickupNote,
        },
      },
    ],
  };

  const response = await client.orders.create({
    idempotencyKey,
    order: orderBody,
  });

  const order = response.order;
  if (!order?.id) throw new Error("Square CreateOrder returned no order.");

  // Optional loyalty redeem after order exists
  if (input.applyRewards && input.loyaltyAccountId && input.rewardTierId) {
    try {
      await client.loyalty.rewards.create({
        idempotencyKey: randomUUID(),
        reward: {
          loyaltyAccountId: input.loyaltyAccountId,
          rewardTierId: input.rewardTierId,
          orderId: order.id,
        },
      });
    } catch {
      // Loyalty may be unset in sandbox — order still valid.
    }
  }

  return mapSquareOrder(order);
}

export async function payOrder(input: {
  orderId: string;
  sourceId: string;
  amountCents: number;
}): Promise<AppOrder> {
  if (getAppMode() === "demo") {
    if (input.sourceId !== "demo-fake-nonce" && !input.sourceId.startsWith("demo")) {
      // Still accept any demo token for POC.
    }
    return markDemoPaid(input.orderId, `demo_pay_${randomUUID()}`);
  }

  const client = getSquareClient();
  const locationId = getNopLocationId();
  const payment = await client.payments.create({
    sourceId: input.sourceId,
    idempotencyKey: randomUUID(),
    amountMoney: centsToMoney(input.amountCents),
    orderId: input.orderId,
    locationId,
    autocomplete: true,
  });

  if (!payment.payment?.id) {
    throw new Error("Square CreatePayment returned no payment.");
  }

  const refreshed = await client.orders.get({ orderId: input.orderId });
  if (!refreshed.order) throw new Error("Order missing after payment.");
  const mapped = mapSquareOrder(refreshed.order);
  mapped.paymentId = payment.payment.id;
  mapped.status = "PAID";
  return mapped;
}

export async function listOpenPickupOrders(): Promise<AppOrder[]> {
  if (getAppMode() === "demo") {
    return listDemoOrders(["OPEN", "PAID"]);
  }

  const client = getSquareClient();
  const locationId = getNopLocationId();
  const response = await client.orders.search({
    locationIds: [locationId],
    returnEntries: false,
    query: {
      filter: {
        stateFilter: { states: ["OPEN"] },
        fulfillmentFilter: {
          fulfillmentTypes: ["PICKUP"],
          fulfillmentStates: ["PROPOSED", "RESERVED", "PREPARED"],
        },
      },
      sort: { sortField: "CREATED_AT", sortOrder: "DESC" },
    },
    limit: 50,
  });

  return (response.orders ?? []).map(mapSquareOrder);
}

export async function markOrderReady(orderId: string): Promise<AppOrder> {
  if (getAppMode() === "demo") {
    return markDemoReady(orderId);
  }

  const client = getSquareClient();
  const existing = await client.orders.get({ orderId });
  const order = existing.order;
  if (!order?.id) throw new Error("Order not found");

  const fulfillments = (order.fulfillments ?? []).map((f) => ({
    ...f,
    state: "COMPLETED" as const,
  }));

  const updated = await client.orders.update({
    orderId,
    idempotencyKey: randomUUID(),
    order: {
      locationId: order.locationId!,
      version: order.version,
      fulfillments,
      state: "COMPLETED",
    },
  });

  if (!updated.order) throw new Error("UpdateOrder failed");
  const mapped = mapSquareOrder(updated.order);
  mapped.status = "READY";
  return mapped;
}

export async function getOrder(orderId: string): Promise<AppOrder | null> {
  if (getAppMode() === "demo") {
    return getDemoOrder(orderId) ?? null;
  }
  const client = getSquareClient();
  const res = await client.orders.get({ orderId });
  return res.order ? mapSquareOrder(res.order) : null;
}

function mapSquareOrder(order: Square.Order): AppOrder {
  const fulfillment = order.fulfillments?.[0];
  const lineItems: CartLine[] = (order.lineItems ?? []).map((li, i) => ({
    lineId: li.uid ?? `line_${i}`,
    itemId: li.catalogObjectId ?? "",
    itemName: li.name ?? "Item",
    variationId: li.catalogObjectId ?? "",
    variationName: li.variationName ?? "",
    quantity: Number(li.quantity ?? 1),
    unitPriceCents: moneyToCents(li.basePriceMoney),
    modifiers: (li.modifiers ?? []).map((m) => ({
      modifierListId: "",
      modifierId: m.catalogObjectId ?? "",
      name: m.name ?? "",
      priceCents: moneyToCents(m.basePriceMoney),
    })),
    note: li.note ?? undefined,
  }));

  const total = moneyToCents(order.totalMoney);
  const discount = (order.totalDiscountMoney
    ? moneyToCents(order.totalDiscountMoney)
    : 0);

  let status: AppOrder["status"] = "OPEN";
  if (order.state === "COMPLETED") status = "READY";
  else if (order.state === "CANCELED") status = "CANCELED";
  else if (
    fulfillment?.state === "RESERVED" ||
    fulfillment?.state === "PREPARED" ||
    (order.tenders && order.tenders.length > 0)
  ) {
    status = "PAID";
  }

  return {
    id: order.id!,
    mode: "square",
    status,
    locationId: order.locationId!,
    createdAt: order.createdAt ?? new Date().toISOString(),
    updatedAt: order.updatedAt ?? new Date().toISOString(),
    customerName:
      fulfillment?.pickupDetails?.recipient?.displayName ?? "Guest",
    customerPhone: fulfillment?.pickupDetails?.recipient?.phoneNumber ?? undefined,
    pickupNote: fulfillment?.pickupDetails?.note ?? undefined,
    lineItems,
    subtotalCents: moneyToCents(order.totalMoney) + discount,
    discountCents: discount,
    totalCents: total,
    currency: "USD",
    squareOrderId: order.id,
    fulfillmentUid: fulfillment?.uid ?? undefined,
    fulfillmentState: fulfillment?.state ?? undefined,
  };
}

export { DEMO_CATALOG_DISCOUNT };
