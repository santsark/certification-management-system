import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth';

// Public paths that don't require authentication
const publicPaths = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.includes(pathname)) {
        return NextResponse.next();
    }

    // Get session cookie
    const sessionId = request.cookies.get('session')?.value;

    // No session - redirect to login
    if (!sessionId) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Validate session
    try {
        const session = await validateSession(sessionId);

        // Invalid or expired session - redirect to login
        if (!session) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('session');
            return response;
        }

        // Check if user must change password
        if (session.user.mustChangePassword && pathname !== '/change-password') {
            return NextResponse.redirect(new URL('/change-password', request.url));
        }

        // User has valid session - allow request
        return NextResponse.next();
    } catch (error) {
        console.error('Middleware error:', error);
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session');
        return response;
    }
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
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$).*)',
    ],
};
