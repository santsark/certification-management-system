
import { db } from '@/db';
import { notifications } from '@/db/schema';

export async function createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string
) {
    try {
        await db.insert(notifications).values({
            userId,
            type,
            title,
            message,
            link,
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
        // We don't want to fail the main request if notification fails
    }
}
