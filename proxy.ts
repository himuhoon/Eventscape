import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(req: NextRequest) {
    // In development, allow all routes so the UI can be previewed freely
    if (process.env.NODE_ENV === 'development') {
        return NextResponse.next();
    }

    const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isLoginPage = req.nextUrl.pathname === '/admin/login';

    const sessionToken =
        req.cookies.get('authjs.session-token')?.value ||
        req.cookies.get('__Secure-authjs.session-token')?.value ||
        req.cookies.get('next-auth.session-token')?.value ||
        req.cookies.get('__Secure-next-auth.session-token')?.value;

    const isAuthenticated = !!sessionToken;

    if (isAdminRoute && !isLoginPage && !isAuthenticated) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    if (isLoginPage && isAuthenticated) {
        return NextResponse.redirect(new URL('/admin', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
