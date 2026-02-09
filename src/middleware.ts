import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCookie, getAdminSessionSecret } from "@/lib/auth-admin";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Only protect routes under /admin-portal-99, except the login page
  if (!pathname.startsWith("/admin-portal-99")) {
    return NextResponse.next();
  }
  if (pathname === "/admin-portal-99/login" || pathname.startsWith("/admin-portal-99/login/")) {
    return NextResponse.next();
  }

  const secret = getAdminSessionSecret();
  const isProd = process.env.NODE_ENV === "production";
  if (!secret) {
    if (isProd) {
      const loginUrl = new URL("/admin-portal-99/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie");
  const result = await verifyAdminCookie(cookieHeader, secret);

  if (!result.valid) {
    const loginUrl = new URL("/admin-portal-99/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin-portal-99", "/admin-portal-99/:path*"],
};
