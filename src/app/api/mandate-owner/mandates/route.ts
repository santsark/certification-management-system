import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mandates, certifications } from '@/db/schema';
import { eq, or, and, sql } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function GET() {
    try {
        const user = await requireMandateOwner();

        // Get mandates where user is owner or backup owner
        const userMandates = await db
            .select({
                id: mandates.id,
                name: mandates.name,
                description: mandates.description,
                status: mandates.status,
                ownerId: mandates.ownerId,
                backupOwnerId: mandates.backupOwnerId,
            })
            .from(mandates)
            .where(
                or(
                    eq(mandates.ownerId, user.id),
                    eq(mandates.backupOwnerId, user.id)
                )
            );

        // For each mandate, get certification counts by status
        const mandatesWithCounts = await Promise.all(
            userMandates.map(async (mandate) => {
                const counts = await db
                    .select({
                        status: certifications.status,
                        count: sql<number>`cast(count(*) as int)`,
                    })
                    .from(certifications)
                    .where(eq(certifications.mandateId, mandate.id))
                    .groupBy(certifications.status);

                const draftCount = counts.find(c => c.status === 'draft')?.count || 0;
                const openCount = counts.find(c => c.status === 'open')?.count || 0;
                const closedCount = counts.find(c => c.status === 'closed')?.count || 0;

                return {
                    ...mandate,
                    draftCount,
                    openCount,
                    closedCount,
                };
            })
        );

        return NextResponse.json(mandatesWithCounts);
    } catch (error) {
        console.error('Error fetching mandates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch mandates' },
            { status: 500 }
        );
    }
}
