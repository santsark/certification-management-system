import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'No session found' },
                { status: 401 }
            );
        }

        const session = await validateSession(sessionId);

        if (!session) {
            return NextResponse.json(
                { error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        // Return user data
        return NextResponse.json({
            user: session.user,
        });
    } catch (error) {
        console.error('Session validation error:', error);
        return NextResponse.json(
            { error: 'An error occurred validating session' },
            { status: 500 }
        );
    }
}
