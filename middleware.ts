import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie } from "@/lib/auth";

// Gate for the dashboard. This is a UX redirect, not the security boundary:
// the backend rejects any admin request without a valid bearer token, so a
// forged cookie buys you an empty dashboard and nothing else.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The login page and the login API must stay reachable while logged out.
  if (pathname === "/admin/login" || pathname === "/api/auth/login") {
    return NextResponse.next();
  }

  if (hasSessionCookie(req)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not signed in." } },
      { status: 401 }
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
