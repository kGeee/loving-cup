/**
 * In-memory demo order store for POC click-through without Square secrets.
 * Not durable across cold starts — fine for local/demo.
 */

import type { AppOrder, CartLine, OrderStatus } from "@/types/menu";
import { DEMO_CATALOG_DISCOUNT } from "@/lib/demo-catalog";
import { randomUUID } from "crypto";

type Store = {
  orders: Map<string, AppOrder>;
};

function getStore(): Store {
  const g = globalThis as typeof globalThis & { __lovingCupDemo?: Store };
  if (!g.__lovingCupDemo) {
    g.__lovingCupDemo = { orders: new Map() };
  }
  return g.__lovingCupDemo;
}

export function lineTotalCents(line: CartLine): number {
  const mods = line.modifiers.reduce((s, m) => s + m.priceCents, 0);
  return (line.unitPriceCents + mods) * line.quantity;
}

export function createDemoOrder(input: {
  customerName: string;
  customerPhone?: string;
  pickupNote?: string;
  lineItems: CartLine[];
  applyRewards?: boolean;
}): AppOrder {
  const subtotal = input.lineItems.reduce((s, l) => s + lineTotalCents(l), 0);
  const discount = input.applyRewards
    ? Math.min(DEMO_CATALOG_DISCOUNT.discountCents, subtotal)
    : 0;
  const now = new Date().toISOString();
  const id = `demo_${randomUUID()}`;
  const order: AppOrder = {
    id,
    mode: "demo",
    status: "OPEN",
    locationId: "DEMO_NOPA",
    createdAt: now,
    updatedAt: now,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    pickupNote: input.pickupNote,
    lineItems: input.lineItems,
    subtotalCents: subtotal,
    discountCents: discount,
    totalCents: subtotal - discount,
    currency: "USD",
    squareOrderId: id,
    fulfillmentUid: "fulfillment_pickup",
    fulfillmentState: "PROPOSED",
    loyaltyRewardId: input.applyRewards
      ? DEMO_CATALOG_DISCOUNT.id
      : undefined,
  };
  getStore().orders.set(id, order);
  return order;
}

export function markDemoPaid(orderId: string, paymentId: string): AppOrder {
  const order = getStore().orders.get(orderId);
  if (!order) throw new Error("Order not found");
  order.status = "PAID";
  order.paymentId = paymentId;
  order.fulfillmentState = "RESERVED";
  order.updatedAt = new Date().toISOString();
  getStore().orders.set(orderId, order);
  return order;
}

export function markDemoReady(orderId: string): AppOrder {
  const order = getStore().orders.get(orderId);
  if (!order) throw new Error("Order not found");
  order.status = "READY";
  order.fulfillmentState = "COMPLETED";
  order.updatedAt = new Date().toISOString();
  getStore().orders.set(orderId, order);
  return order;
}

export function listDemoOpenOrders(): AppOrder[] {
  return [...getStore().orders.values()]
    .filter((o) => o.status === "PAID" || o.status === "OPEN")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listDemoOrders(statuses?: OrderStatus[]): AppOrder[] {
  const all = [...getStore().orders.values()];
  const filtered = statuses?.length
    ? all.filter((o) => statuses.includes(o.status))
    : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDemoOrder(id: string): AppOrder | undefined {
  return getStore().orders.get(id);
}
