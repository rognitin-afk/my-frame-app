import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  if (realIp) return realIp;
  return "unknown";
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Admin portal: protect /admin-portal-99 only  (login is separate at /admin-login)
  if (path.startsWith("/admin-portal-99")) {
    try {
      const { verifyAdminCookie, getAdminSessionSecret } = await import("@/lib/auth-admin");
      const secret = getAdminSessionSecret();
      const isProd = process.env.NODE_ENV === "production";
      if (!secret) {
        if (isProd) {
          return NextResponse.redirect(new URL("/admin-login", request.url));
        }
        return NextResponse.next();
      }
      const cookieHeader = request.headers.get("cookie");
      const result = await verifyAdminCookie(cookieHeader, secret);
      if (!result.valid) {
        return NextResponse.redirect(new URL("/admin-login", request.url));
      }
    } catch {
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // API: rate limit (skip /api/auth/admin-login)
  if (!path.startsWith("/api/")) return NextResponse.next();
  if (path === "/api/auth/admin-login") return NextResponse.next();

  try {
    const { getApiRateLimiter, isRateLimitEnabled } = await import("@/lib/ratelimit");
    if (!isRateLimitEnabled()) return NextResponse.next();
    const limiter = getApiRateLimiter();
    if (!limiter) return NextResponse.next();
    const ip = getClientIp(request);
    const { success, limit, remaining, reset } = await limiter.limit(ip);
    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        }
      );
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin-portal-99", "/admin-portal-99/:path*"],
};
