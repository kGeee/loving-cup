/**
 * Environment + mode detection.
 * When SQUARE_* secrets are present → live Square.
 * Otherwise → labeled demo/POC mode (no invented secrets).
 */

export type AppMode = "square" | "demo";

export function getSquareEnv() {
  const applicationId = process.env.SQUARE_APPLICATION_ID?.trim() || "";
  const accessToken = process.env.SQUARE_ACCESS_TOKEN?.trim() || "";
  const locationId = process.env.SQUARE_LOCATION_ID?.trim() || "";
  const webhookSignatureKey =
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim() || "";
  const environment =
    process.env.SQUARE_ENVIRONMENT?.trim().toLowerCase() === "production"
      ? "production"
      : "sandbox";
  const webhookNotificationUrl =
    process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim() || "";

  return {
    applicationId,
    accessToken,
    locationId,
    webhookSignatureKey,
    environment,
    webhookNotificationUrl,
  };
}

/** Live Square requires app id, access token, and NOPA location id. */
export function hasSquareSecrets(): boolean {
  const { applicationId, accessToken, locationId } = getSquareEnv();
  return Boolean(applicationId && accessToken && locationId);
}

export function getAppMode(): AppMode {
  return hasSquareSecrets() ? "square" : "demo";
}

/** Public application id for Web Payments SDK (client-safe). */
export function getPublicSquareApplicationId(): string | null {
  const id = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID?.trim();
  if (id) return id;
  // Server can expose the same app id used by the API when set.
  const serverId = process.env.SQUARE_APPLICATION_ID?.trim();
  return serverId || null;
}

export const NOPA = {
  name: "NOPA",
  address: "608 Divisadero St",
  phone: "415-859-3112",
  /** Home hours lock — not Square Online “Tomorrow …” and not lovingcup.com “WE'RE OPEN”. */
  hours: "11–10 daily",
} as const;
