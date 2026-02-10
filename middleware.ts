import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiRateLimiter, isRateLimitEnabled } from "@/lib/ratelimit";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  if (realIp) return realIp;
  return "unknown";
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
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
  matcher: ["/api/:path*"],
};
