import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, mandates } from '@/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
    try {
        // Require admin role
        await requireAdmin();

        // Get total users count by role
        const userStats = await db
            .select({
                role: users.role,
                count: count(),
            })
            .from(users)
            .groupBy(users.role);

        // Get total mandates count
        const [mandatesCount] = await db
            .select({ count: count() })
            .from(mandates);

        // Get mandates by status
        const mandatesByStatus = await db
            .select({
                status: mandates.status,
                count: count(),
            })
            .from(mandates)
            .groupBy(mandates.status);

        // Format response
        const stats = {
            users: {
                total: userStats.reduce((sum, stat) => sum + stat.count, 0),
                byRole: {
                    admin: userStats.find(s => s.role === 'admin')?.count || 0,
                    mandate_owner: userStats.find(s => s.role === 'mandate_owner')?.count || 0,
                    attester: userStats.find(s => s.role === 'attester')?.count || 0,
                },
            },
            mandates: {
                total: mandatesCount.count,
                byStatus: {
                    open: mandatesByStatus.find(s => s.status === 'open')?.count || 0,
                    closed: mandatesByStatus.find(s => s.status === 'closed')?.count || 0,
                },
            },
        };

        return NextResponse.json(stats);
    } catch (error: any) {
        console.error('Stats API error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
