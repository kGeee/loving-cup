/**
 * Demo order store for POC click-through without Square secrets.
 * Persists the last ~10 orders in an httpOnly cookie so create/pay/list/ready
 * survive across Vercel lambda instances (in-memory alone is not enough).
 */

import type { AppOrder, CartLine, OrderStatus } from "@/types/menu";
import { DEMO_CATALOG_DISCOUNT } from "@/lib/demo-catalog";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const DEMO_ORDERS_COOKIE = "lc_demo_orders";

const MAX_DEMO_ORDERS = 10;
/** Stay under typical ~4KB cookie limits after base64url encoding. */
const MAX_COOKIE_CHARS = 3500;

function decodeOrders(raw: string | undefined | null): AppOrder[] {
  if (!raw) return [];
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is AppOrder =>
        Boolean(o) &&
        typeof o === "object" &&
        typeof (o as AppOrder).id === "string" &&
        typeof (o as AppOrder).status === "string",
    );
  } catch {
    return [];
  }
}

function encodeOrders(orders: AppOrder[]): string {
  return Buffer.from(JSON.stringify(orders), "utf8").toString("base64url");
}

/** Newest first, capped to ~10 and cookie size budget. */
function capOrders(orders: AppOrder[]): AppOrder[] {
  let capped = [...orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  if (capped.length > MAX_DEMO_ORDERS) {
    capped = capped.slice(0, MAX_DEMO_ORDERS);
  }
  while (
    capped.length > 0 &&
    encodeOrders(capped).length > MAX_COOKIE_CHARS
  ) {
    capped = capped.slice(0, -1);
  }
  return capped;
}

export function demoOrdersCookieOptions(orders: AppOrder[]) {
  return {
    name: DEMO_ORDERS_COOKIE,
    value: encodeOrders(capOrders(orders)),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7d
  };
}

async function readOrders(): Promise<AppOrder[]> {
  const jar = await cookies();
  return decodeOrders(jar.get(DEMO_ORDERS_COOKIE)?.value);
}

async function writeOrders(orders: AppOrder[]): Promise<AppOrder[]> {
  const capped = capOrders(orders);
  const jar = await cookies();
  jar.set(demoOrdersCookieOptions(capped));
  return capped;
}

export function lineTotalCents(line: CartLine): number {
  const mods = line.modifiers.reduce((s, m) => s + m.priceCents, 0);
  return (line.unitPriceCents + mods) * line.quantity;
}

export async function createDemoOrder(input: {
  customerName: string;
  customerPhone?: string;
  pickupNote?: string;
  lineItems: CartLine[];
  applyRewards?: boolean;
}): Promise<AppOrder> {
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
  const existing = await readOrders();
  await writeOrders([order, ...existing.filter((o) => o.id !== id)]);
  return order;
}

export async function markDemoPaid(
  orderId: string,
  paymentId: string,
): Promise<AppOrder> {
  const existing = await readOrders();
  const idx = existing.findIndex((o) => o.id === orderId);
  if (idx < 0) throw new Error("Order not found");
  const order: AppOrder = {
    ...existing[idx],
    status: "PAID",
    paymentId,
    fulfillmentState: "RESERVED",
    updatedAt: new Date().toISOString(),
  };
  const next = [...existing];
  next[idx] = order;
  await writeOrders(next);
  return order;
}

export async function markDemoReady(orderId: string): Promise<AppOrder> {
  const existing = await readOrders();
  const idx = existing.findIndex((o) => o.id === orderId);
  if (idx < 0) throw new Error("Order not found");
  const order: AppOrder = {
    ...existing[idx],
    status: "READY",
    fulfillmentState: "COMPLETED",
    updatedAt: new Date().toISOString(),
  };
  const next = [...existing];
  next[idx] = order;
  await writeOrders(next);
  return order;
}

export async function listDemoOpenOrders(): Promise<AppOrder[]> {
  return listDemoOrders(["PAID", "OPEN"]);
}

export async function listDemoOrders(
  statuses?: OrderStatus[],
): Promise<AppOrder[]> {
  const all = await readOrders();
  const filtered = statuses?.length
    ? all.filter((o) => statuses.includes(o.status))
    : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDemoOrder(
  id: string,
): Promise<AppOrder | undefined> {
  const all = await readOrders();
  return all.find((o) => o.id === id);
}
