import {
  ADMIN_COOKIE,
  isAdminConfigured,
} from "@/lib/admin-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
