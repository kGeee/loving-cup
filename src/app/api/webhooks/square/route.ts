import {
  handleSquareWebhookEvent,
  verifySquareWebhook,
} from "@/lib/webhook";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature =
    req.headers.get("x-square-hmacsha256-signature") ||
    req.headers.get("X-Square-HmacSha256-Signature");

  const valid = await verifySquareWebhook({
    body,
    signatureHeader: signature,
  });

  if (!valid) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await handleSquareWebhookEvent(
    payload as Parameters<typeof handleSquareWebhookEvent>[0],
  );
  return NextResponse.json(result);
}
