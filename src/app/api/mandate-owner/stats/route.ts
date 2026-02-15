import { NextResponse } from 'next/server';
import { db } from '@/db';
import { mandates, certifications, certificationAssignments, attestationResponses } from '@/db/schema';
import { eq, or, and, sql, inArray } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function GET() {
    try {
        const user = await requireMandateOwner();

        // Get all mandates owned by user
        const userMandates = await db
            .select({ id: mandates.id })
            .from(mandates)
            .where(
                or(
                    eq(mandates.ownerId, user.id),
                    eq(mandates.backupOwnerId, user.id)
                )
            );

        const mandateIds = userMandates.map(m => m.id);

        if (mandateIds.length === 0) {
            return NextResponse.json({
                totalMandates: 0,
                totalCertifications: 0,
                activeCertifications: 0,
                completionData: [],
            });
        }

        // Count total mandates
        const totalMandates = mandateIds.length;

        // Count total certifications
        const totalCertsResult = await db
            .select({
                count: sql<number>`cast(count(*) as int)`,
            })
            .from(certifications)
            .where(inArray(certifications.mandateId, mandateIds));

        const totalCertifications = totalCertsResult[0]?.count || 0;

        // Count active (open) certifications
        const activeCertsResult = await db
            .select({
                count: sql<number>`cast(count(*) as int)`,
            })
            .from(certifications)
            .where(
                and(
                    inArray(certifications.mandateId, mandateIds),
                    eq(certifications.status, 'open')
                )
            );

        const activeCertifications = activeCertsResult[0]?.count || 0;

        // Get completion data for all open certifications
        const openCerts = await db
            .select({
                id: certifications.id,
                title: certifications.title,
            })
            .from(certifications)
            .where(
                and(
                    inArray(certifications.mandateId, mandateIds),
                    eq(certifications.status, 'open')
                )
            );

        const completionData = await Promise.all(
            openCerts.map(async (cert) => {
                // Count assigned attesters
                const assignedCountResult = await db
                    .select({
                        count: sql<number>`cast(count(*) as int)`,
                    })
                    .from(certificationAssignments)
                    .where(eq(certificationAssignments.certificationId, cert.id));

                const assignedCount = assignedCountResult[0]?.count || 0;

                // Count completed responses
                const completedCountResult = await db
                    .select({
                        count: sql<number>`cast(count(*) as int)`,
                    })
                    .from(attestationResponses)
                    .where(
                        and(
                            eq(attestationResponses.certificationId, cert.id),
                            eq(attestationResponses.status, 'submitted')
                        )
                    );

                const completedCount = completedCountResult[0]?.count || 0;

                const completionPercentage = assignedCount > 0
                    ? Math.round((completedCount / assignedCount) * 100)
                    : 0;

                return {
                    title: cert.title,
                    completionPercentage,
                };
            })
        );

        return NextResponse.json({
            totalMandates,
            totalCertifications,
            activeCertifications,
            completionData,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
