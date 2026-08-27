import { getAppMode, getSquareEnv, hasSquareSecrets, NOPA } from "@/lib/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const mode = getAppMode();
  const env = getSquareEnv();
  return NextResponse.json({
    mode,
    squareConfigured: hasSquareSecrets(),
    environment: mode === "square" ? env.environment : null,
    location: NOPA,
    // Never echo secret values — names only.
    envVarsExpected: [
      "SQUARE_APPLICATION_ID",
      "SQUARE_ACCESS_TOKEN",
      "SQUARE_LOCATION_ID",
      "SQUARE_WEBHOOK_SIGNATURE_KEY",
    ],
  });
}
