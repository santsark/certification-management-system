
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, mandates, certificationAssignments, attestationResponses } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await params;

        // Verify ownership
        const cert = await db
            .select({
                id: certifications.id,
                mandateId: certifications.mandateId,
                status: certifications.status,
            })
            .from(certifications)
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert || cert.length === 0) {
            return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
        }

        const mandate = await db.query.mandates.findFirst({
            where: and(
                eq(mandates.id, cert[0].mandateId),
                or(eq(mandates.ownerId, user.id), eq(mandates.backupOwnerId, user.id))
            )
        });

        if (!mandate) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        if (cert[0].status === 'closed') {
            return NextResponse.json({ message: 'Certification is already closed' });
        }

        // Validate completion
        // Get all assigned attesters
        const assignments = await db
            .select({ attesterId: certificationAssignments.attesterId })
            .from(certificationAssignments)
            .where(eq(certificationAssignments.certificationId, certId));

        if (assignments.length === 0) {
            return NextResponse.json({ error: 'Cannot close a certification with no assignments' }, { status: 400 });
        }

        // Get count of submitted responses
        const submittedCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(attestationResponses)
            .where(and(
                eq(attestationResponses.certificationId, certId),
                eq(attestationResponses.status, 'submitted')
            ));

        // Check if all assigned attesters have submitted
        // NOTE: This assumes 1:1 assignment to response. If an attester is assigned, they MUST submit.
        // We need to double check if there are duplicate assignments or responses, but schema enforces uniqueness.
        // A better check matches the set of IDs, but count is faster if we trust data integrity (and we do).

        const totalAssigned = assignments.length;
        const totalSubmitted = Number(submittedCount[0].count);

        if (totalSubmitted < totalAssigned) {
            return NextResponse.json({
                error: `Cannot close certification. Only ${totalSubmitted} of ${totalAssigned} attesters have submitted.`
            }, { status: 400 });
        }

        // Close it
        await db
            .update(certifications)
            .set({
                status: 'closed',
                closedAt: new Date(),
            })
            .where(eq(certifications.id, certId));

        return NextResponse.json({ message: 'Certification closed successfully' });

    } catch (error) {
        console.error('Close certification error:', error);
        return NextResponse.json(
            { error: 'Failed to close certification' },
            { status: 500 }
        );
    }
}
