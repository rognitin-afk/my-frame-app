import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiRateLimiter, isRateLimitEnabled } from "@/lib/ratelimit";
import { verifyAdminCookie, getAdminSessionSecret } from "@/lib/auth-admin";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  if (realIp) return realIp;
  return "unknown";
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect admin portal pages (except login): require valid admin session
  if (path.startsWith("/admin-portal-99")) {
    if (path === "/admin-portal-99/login" || path.startsWith("/admin-portal-99/login/")) {
      return NextResponse.next();
    }
    const secret = getAdminSessionSecret();
    const isProd = process.env.NODE_ENV === "production";
    if (!secret) {
      if (isProd) {
        return NextResponse.redirect(new URL("/admin-portal-99/login", request.url));
      }
      return NextResponse.next();
    }
    const cookieHeader = request.headers.get("cookie");
    const result = await verifyAdminCookie(cookieHeader, secret);
    if (!result.valid) {
      return NextResponse.redirect(new URL("/admin-portal-99/login", request.url));
    }
    return NextResponse.next();
  }

  // API rate limiting
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Admin login is rate limited inside the API route (Node runtime has env)
  if (path === "/api/auth/admin-login") {
    return NextResponse.next();
  }

  // General API: 120 per 60 s per IP
  if (isRateLimitEnabled()) {
    const apiRateLimiter = getApiRateLimiter();
    if (apiRateLimiter) {
      const ip = getClientIp(request);
      const { success, limit, remaining, reset } = await apiRateLimiter.limit(ip);
      if (!success) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests. Please slow down.",
          }),
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
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin-portal-99", "/admin-portal-99/:path*"],
};
