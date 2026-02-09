import { NextResponse } from "next/server";
import {
  createSignedCookie,
  constantTimeEqual,
  getAdminSessionSecret,
} from "@/lib/auth-admin";

function getAdminPassword(): string {
  const raw = (process.env.ADMIN_PASSWORD || "").trim();
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  return raw;
}

export async function POST(request: Request) {
  const secret = getAdminSessionSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Admin login not configured" },
      { status: 503 }
    );
  }

  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    return NextResponse.json(
      { error: "Admin login not configured" },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const password = typeof body?.password === "string" ? body.password : "";
  if (!constantTimeEqual(password, expectedPassword)) {
    return NextResponse.json(
      { error: "Invalid password" },
      { status: 401 }
    );
  }

  const { header } = createSignedCookie(secret);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", header);
  return res;
}
