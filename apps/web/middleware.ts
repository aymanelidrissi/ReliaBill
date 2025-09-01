import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
    const protectedPaths = ["/invoices", "/clients", "/settings"];
    const needsAuth = protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p));

    if (needsAuth) {
        const sessionCookie = process.env.NEXT_PUBLIC_SESSION_COOKIE || "rb.session";

        const token =
            req.cookies.get(sessionCookie)?.value ||
            req.cookies.get("rb.token")?.value ||
            "";

        if (!token) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/invoices/:path*", "/clients/:path*", "/settings/:path*"],
};
