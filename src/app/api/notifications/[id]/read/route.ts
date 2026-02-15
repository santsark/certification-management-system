
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUser } from '@/lib/server-auth';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireUser();
        const { id: notificationId } = await params;

        // Verify notification belongs to user
        const notification = await db.query.notifications.findFirst({
            where: and(
                eq(notifications.id, notificationId),
                eq(notifications.userId, user.id)
            ),
        });

        if (!notification) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 }
            );
        }

        const updated = await db
            .update(notifications)
            .set({ read: true })
            .where(eq(notifications.id, notificationId))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error('Mark notification read error:', error);
        return NextResponse.json(
            { error: 'Failed to mark notification as read' },
            { status: 500 }
        );
    }
}
