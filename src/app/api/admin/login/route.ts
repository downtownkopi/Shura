import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, checkPassword, createSessionToken } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body ?? {};

  if (typeof password !== "string" || !checkPassword(password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
