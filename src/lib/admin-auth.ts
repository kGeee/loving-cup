import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "lc_admin_session";

export const ADMIN_UNCONFIGURED_MESSAGE =
  "Admin isn't configured on this deploy. Set `ADMIN_PASSWORD` on Vercel, then reload.";

/** Admin is off unless ADMIN_PASSWORD is set (value never invented here). */
export function getAdminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  return pw ? pw : null;
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminPassword());
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminSessionToken(): string | null {
  const password = getAdminPassword();
  if (!password) return null;
  const payload = `ok.${Date.now()}`;
  return `${payload}.${sign(payload, password)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  const password = getAdminPassword();
  if (!password || !token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  if (!payload.startsWith("ok.")) return false;
  const expected = sign(payload, password);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function passwordMatches(candidate: string): boolean {
  const password = getAdminPassword();
  if (!password) return false;
  try {
    const a = Buffer.from(candidate);
    const b = Buffer.from(password);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function readAdminSessionFromCookies(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const jar = await cookies();
  return verifyAdminSessionToken(jar.get(ADMIN_COOKIE)?.value);
}

/** For Route Handlers — returns a NextResponse error or null if authorized. */
export function requireAdminApi(req: Request): NextResponse | null {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: ADMIN_UNCONFIGURED_MESSAGE },
      { status: 503 },
    );
  }
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  const token = match ? decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1)) : null;
  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export function adminSessionCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  };
}
