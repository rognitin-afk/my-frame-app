import { NextResponse } from "next/server";
import {
  createSignedCookie,
  constantTimeEqual,
  getAdminSessionSecret,
} from "@/lib/auth-admin";
import { getAdminLoginRateLimiter } from "@/lib/ratelimit";

function getAdminPassword(): string {
  const raw = (process.env.ADMIN_PASSWORD || "").trim();
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    return raw.slice(1, -1);
  }
  return raw;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: Request) {
  // Rate limit: 30 per 15 min per IP (runs in Node so env is available)
  const limiter = getAdminLoginRateLimiter();
  if (limiter) {
    const ip = getClientIp(request);
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        }
      );
    }
  }

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
