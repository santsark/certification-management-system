import { NextRequest, NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session')?.value;

        // Invalidate session if it exists
        if (sessionId) {
            await invalidateSession(sessionId);
        }

        // Clear session cookie
        cookieStore.delete('session');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        // Always return success for logout
        return NextResponse.json({ success: true });
    }
}
