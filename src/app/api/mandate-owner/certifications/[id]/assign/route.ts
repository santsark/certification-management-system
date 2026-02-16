import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certificationAssignments, certifications, mandates, users } from '@/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';
import { createNotification } from '@/lib/notifications';
import { assertCertNotClosed, AppError } from '@/lib/cert-guards';
import { z } from 'zod';

const assignAttestersSchema = z.object({
    attesterIds: z.array(z.string().uuid()),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await params;
        const body = await request.json();

        // Guard against closed certifications
        await assertCertNotClosed(certId);

        // Validate input
        const validationResult = assignAttestersSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { attesterIds } = validationResult.data;

        // Fetch certification and verify ownership
        const cert = await db
            .select({
                id: certifications.id,
                title: certifications.title,
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
                { error: 'You do not have permission to assign attesters to this certification' },
                { status: 403 }
            );
        }

        // Filter out attesters that are already assigned
        const existingAssignments = await db
            .select({ attesterId: certificationAssignments.attesterId })
            .from(certificationAssignments)
            .where(
                and(
                    eq(certificationAssignments.certificationId, certId),
                    inArray(certificationAssignments.attesterId, attesterIds)
                )
            );

        const existingAttesterIds = new Set(existingAssignments.map((a) => a.attesterId));
        const newAttesterIds = attesterIds.filter((id) => !existingAttesterIds.has(id));

        if (newAttesterIds.length === 0) {
            return NextResponse.json({ message: 'All selected attesters are already assigned' });
        }

        // Verify that the users exist and have the 'attester' role (optional but good practice)
        // For now, we assume if the ID is passed, it's valid, or let FK constraint fail if not exists.
        // But better to check role if we want to enforce it strict.
        // Let's rely on the UI filtering for now + FK constraints for existence.

        // Insert new assignments
        await db.insert(certificationAssignments).values(
            newAttesterIds.map((attesterId) => ({
                certificationId: certId,
                attesterId,
            }))
        );

        // Send notifications
        // We can do this asynchronously or simply await it. detailed result not critical for response.
        for (const attesterId of newAttesterIds) {
            await createNotification(
                attesterId,
                'certification_assigned',
                'New Certification Assigned',
                `You have been assigned to complete: ${cert[0].title}`,
                `/attester/certifications/${certId}`
            );
        }

        return NextResponse.json({
            message: `Successfully assigned ${newAttesterIds.length} attesters`,
            assignedCount: newAttesterIds.length
        });

    } catch (error) {
        console.error('Assign attesters error:', error);
        if (error instanceof AppError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        return NextResponse.json(
            { error: 'Failed to assign attesters' },
            { status: 500 }
        );
    }
}
