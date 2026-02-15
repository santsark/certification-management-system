
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
    try {
        const user = await requireUser();

        await db
            .update(notifications)
            .set({ read: true })
            .where(
                and(
                    eq(notifications.userId, user.id),
                    eq(notifications.read, false)
                )
            );

        return NextResponse.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        return NextResponse.json(
            { error: 'Failed to mark all notifications as read' },
            { status: 500 }
        );
    }
}
