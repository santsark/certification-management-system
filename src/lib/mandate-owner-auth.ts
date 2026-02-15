import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function requireMandateOwner() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
        redirect('/login');
    }

    const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
        with: {
            user: true,
        },
    });

    if (!session || new Date(session.expiresAt) < new Date()) {
        redirect('/login');
    }

    if (session.user.role !== 'mandate_owner') {
        redirect('/');
    }

    return session.user;
}
