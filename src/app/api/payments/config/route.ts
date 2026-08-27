import { getAppMode, getPublicSquareApplicationId, getSquareEnv } from "@/lib/env";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Public Web Payments config — application id + location only, never the access token. */
export async function GET() {
  const mode = getAppMode();
  if (mode === "demo") {
    return NextResponse.json({
      mode,
      applicationId: null,
      locationId: null,
    });
  }
  const { locationId, environment } = getSquareEnv();
  return NextResponse.json({
    mode,
    applicationId: getPublicSquareApplicationId(),
    locationId,
    environment,
  });
}
