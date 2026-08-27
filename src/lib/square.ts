import { getSquareEnv, hasSquareSecrets } from "@/lib/env";
import { SquareClient, SquareEnvironment } from "square";

let client: SquareClient | null = null;

export function getSquareClient(): SquareClient {
  if (!hasSquareSecrets()) {
    throw new Error(
      "Square secrets are not configured. Running in demo mode — live Catalog/Orders/Payments unavailable.",
    );
  }
  if (!client) {
    const { accessToken, environment } = getSquareEnv();
    client = new SquareClient({
      token: accessToken,
      environment:
        environment === "production"
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });
  }
  return client;
}

export function getNopLocationId(): string {
  const { locationId } = getSquareEnv();
  if (!locationId) {
    throw new Error("SQUARE_LOCATION_ID (NOPA) is not set.");
  }
  return locationId;
}

/** Serialize Square Money (bigint) to cents number for JSON. */
export function moneyToCents(
  money?: { amount?: bigint | number | null } | null,
): number {
  if (!money?.amount && money?.amount !== 0) return 0;
  return Number(money.amount);
}

export function centsToMoney(cents: number): {
  amount: bigint;
  currency: "USD";
} {
  return { amount: BigInt(Math.round(cents)), currency: "USD" };
}
