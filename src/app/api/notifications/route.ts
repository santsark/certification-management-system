
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireUser } from '@/lib/server-auth';

export async function GET(request: NextRequest) {
    try {
        const user = await requireUser();

        const userNotifications = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, user.id))
            .orderBy(desc(notifications.createdAt))
            .limit(50);

        return NextResponse.json(userNotifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}
