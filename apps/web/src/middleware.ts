import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files, API routes, and public paths
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') ||
        publicPaths.some(path => pathname.startsWith(path))
    ) {
        return NextResponse.next();
    }

    // Check for access token in cookies or localStorage is not accessible in middleware
    // So we check for a cookie that should be set on login
    const accessToken = request.cookies.get('accessToken')?.value;

    // If no token and trying to access protected route, redirect to login
    if (!accessToken && !publicPaths.includes(pathname)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If has token and trying to access login page, redirect to dashboard
    if (accessToken && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
    ],
};
