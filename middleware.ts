import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  if (realIp) return realIp;
  return "unknown";
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
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
  matcher: ["/api/:path*"],
};
