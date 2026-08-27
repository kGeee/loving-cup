import { getSquareEnv } from "@/lib/env";
import { getOrder, markOrderReady } from "@/lib/orders";
import { WebhooksHelper } from "square";

/**
 * Signature-verified Square webhook (shape similar to typical order apps).
 * Keeps order fulfillment state in sync — no homemade ledger.
 */
export async function verifySquareWebhook(opts: {
  body: string;
  signatureHeader: string | null;
}): Promise<boolean> {
  const { webhookSignatureKey, webhookNotificationUrl } = getSquareEnv();
  if (!webhookSignatureKey) {
    return false;
  }
  if (!opts.signatureHeader) return false;

  const notificationUrl =
    webhookNotificationUrl ||
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""}/api/webhooks/square`;

  if (!notificationUrl) return false;

  return WebhooksHelper.verifySignature({
    requestBody: opts.body,
    signatureHeader: opts.signatureHeader,
    signatureKey: webhookSignatureKey,
    notificationUrl,
  });
}

export async function handleSquareWebhookEvent(payload: {
  type?: string;
  data?: {
    id?: string;
    object?: {
      order_updated?: { order_id?: string };
      order?: { id?: string };
      payment?: { order_id?: string };
    };
  };
}): Promise<{ ok: true; action: string }> {
  const type = payload.type ?? "";
  const orderId =
    payload.data?.object?.order_updated?.order_id ||
    payload.data?.object?.order?.id ||
    payload.data?.object?.payment?.order_id ||
    payload.data?.id;

  if (!orderId) {
    return { ok: true, action: "ignored_no_order" };
  }

  // Refresh / sync: fetch current order from Square (or demo store).
  const order = await getOrder(orderId);
  if (!order) {
    return { ok: true, action: "order_not_found" };
  }

  // If Square marked fulfillment completed externally, mirror READY.
  if (
    type.includes("fulfillment") &&
    order.fulfillmentState === "COMPLETED" &&
    order.status !== "READY"
  ) {
    // Already completed on Square side — map as ready via getOrder.
    return { ok: true, action: "synced_ready" };
  }

  if (type.startsWith("order.") || type.startsWith("payment.")) {
    return { ok: true, action: `synced_${order.status.toLowerCase()}` };
  }

  return { ok: true, action: "noop" };
}

/** Admin Mark ready path (also callable without webhook). */
export async function completeFulfillment(orderId: string) {
  return markOrderReady(orderId);
}
