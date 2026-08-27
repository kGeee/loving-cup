import {
  createAdminSessionToken,
  getAdminPassword,
  isAdminConfigured,
  passwordMatches,
  adminSessionCookieOptions,
} from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Exchange ADMIN_PASSWORD for a signed httpOnly cookie. Fail-closed if unset. */
export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!passwordMatches(body.password ?? "")) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token || !getAdminPassword()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  const opts = adminSessionCookieOptions(token);
  res.cookies.set(opts);
  return res;
}
