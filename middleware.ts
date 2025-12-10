import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = [
        "/login",
        "/onboarding",
        "/demo",
        "/contact",
        "/health",
    ];

    // Check if current path is public
    const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
    );

    // Allow public routes
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get("tt_session");

    // If no session cookie, redirect to login
    if (!sessionCookie) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Allow authenticated requests
    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public directory)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
