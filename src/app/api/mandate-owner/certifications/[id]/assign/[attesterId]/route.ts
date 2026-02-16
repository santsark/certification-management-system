
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certificationAssignments, certifications, mandates } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';
import { assertCertNotClosed, AppError } from '@/lib/cert-guards';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; attesterId: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId, attesterId } = await params;

        // Guard against closed certifications
        await assertCertNotClosed(certId);

        // Fetch certification and verify ownership
        const cert = await db
            .select({
                id: certifications.id,
                mandateId: certifications.mandateId,
            })
            .from(certifications)
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert || cert.length === 0) {
            return NextResponse.json(
                { error: 'Certification not found' },
                { status: 404 }
            );
        }

        const mandate = await db.query.mandates.findFirst({
            where: and(
                eq(mandates.id, cert[0].mandateId),
                or(
                    eq(mandates.ownerId, user.id),
                    eq(mandates.backupOwnerId, user.id)
                )
            ),
        });

        if (!mandate) {
            return NextResponse.json(
                { error: 'You do not have permission to manage assignments for this certification' },
                { status: 403 }
            );
        }

        // Delete assignment
        const result = await db
            .delete(certificationAssignments)
            .where(
                and(
                    eq(certificationAssignments.certificationId, certId),
                    eq(certificationAssignments.attesterId, attesterId)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: 'Assignment not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ message: 'Attester unassigned successfully' });

    } catch (error) {
        console.error('Remove attester error:', error);
        if (error instanceof AppError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return NextResponse.json(
            { error: 'Failed to remove attester assignment' },
            { status: 500 }
        );
    }
}
