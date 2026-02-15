
import { cookies } from 'next/headers';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, gt, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function requireUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
        redirect('/login');
    }

    const session = await db.query.sessions.findFirst({
        where: and(
            eq(sessions.id, sessionId),
            gt(sessions.expiresAt, new Date())
        ),
        with: {
            user: true,
        },
    });

    if (!session) {
        redirect('/login');
    }

    return session.user;
}
