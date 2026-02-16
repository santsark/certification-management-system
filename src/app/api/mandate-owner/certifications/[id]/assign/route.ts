import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certificationAssignments, certifications, mandates, users } from '@/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';
import { createNotification } from '@/lib/notifications';
import { assertCertNotClosed, AppError } from '@/lib/cert-guards';
import { z } from 'zod';

const assignmentSchema = z.object({
    userId: z.string().uuid(),
    levelGroupId: z.string().uuid().nullable().optional(),
});

const multiLevelAssignSchema = z.object({
    l1Attesters: z.array(assignmentSchema),
    l2Attesters: z.array(assignmentSchema).optional().default([]),
});

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await context.params;
        const body = await request.json();

        // Guard against closed certifications
        await assertCertNotClosed(certId);

        // Validate input
        const validationResult = multiLevelAssignSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { l1Attesters, l2Attesters } = validationResult.data;

        // Fetch certification and verify ownership
        const [cert] = await db
            .select({
                id: certifications.id,
                title: certifications.title,
                mandateId: certifications.mandateId,
            })
            .from(certifications)
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert) {
            return NextResponse.json(
                { error: 'Certification not found' },
                { status: 404 }
            );
        }

        const mandate = await db.query.mandates.findFirst({
            where: and(
                eq(mandates.id, cert.mandateId),
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

        // Combine all new assignments to check for existing
        const allNewAttesterIds = [
            ...l1Attesters.map(a => a.userId),
            ...l2Attesters.map(a => a.userId)
        ];

        // Get current assignments to determine who to notify (newly assigned)
        const existingAssignments = await db
            .select({ attesterId: certificationAssignments.attesterId })
            .from(certificationAssignments)
            .where(eq(certificationAssignments.certificationId, certId));

        const existingAttesterIds = new Set(existingAssignments.map((a) => a.attesterId));
        const newlyAssignedIds = allNewAttesterIds.filter((id) => !existingAttesterIds.has(id));

        // Validations:
        // 1. Ensure L2 attesters are not also L1 attesters (already handled by UI likely, but good to check)
        const l1Ids = new Set(l1Attesters.map(a => a.userId));
        for (const l2 of l2Attesters) {
            if (l1Ids.has(l2.userId)) {
                return NextResponse.json(
                    { error: `User ${l2.userId} cannot be both L1 and L2 attester.` },
                    { status: 400 }
                );
            }
        }

        // Transaction: Replace all assignments
        await db.transaction(async (tx) => {
            // 1. Delete all existing assignments for this certification
            await tx
                .delete(certificationAssignments)
                .where(eq(certificationAssignments.certificationId, certId));

            // 2. Insert L1 assignments
            if (l1Attesters.length > 0) {
                await tx.insert(certificationAssignments).values(
                    l1Attesters.map((a) => ({
                        certificationId: certId,
                        attesterId: a.userId,
                        level: 1,
                        levelGroupId: a.levelGroupId || null,
                    }))
                );
            }

            // 3. Insert L2 assignments
            if (l2Attesters.length > 0) {
                await tx.insert(certificationAssignments).values(
                    l2Attesters.map((a) => ({
                        certificationId: certId,
                        attesterId: a.userId,
                        level: 2,
                        levelGroupId: a.levelGroupId,
                    }))
                );
            }
        });

        // Send notifications to newly assigned users
        // (Note: we notifications are sent even to L2s, but they will see a locked state or just be informed)
        // The requirement says: "Show info message: Level 2 reviewers will be notified once all Level 1 attesters in their group submit."
        // implying we might NOT want to notify L2s right now?
        // But "L2 reviewers are NOT notified yet (locked until L1 done)" suggests we should skip notification creation for L2s here.
        // Let's filter newlyAssignedIds to only include L1s for now?
        // Or just notify them they have been assigned, but they can't do anything?
        // "L2 reviewers are NOT notified yet (locked until L1 done)." -> This implies NO notification at assignment time for L2.

        const l2Ids = new Set(l2Attesters.map(a => a.userId));

        for (const attesterId of newlyAssignedIds) {
            // Skip notification for L2s as per requirement
            if (l2Ids.has(attesterId)) continue;

            await createNotification(
                attesterId,
                'certification_assigned',
                'New Certification Assigned',
                `You have been assigned to complete: ${cert.title}`,
                `/attester/certifications/${certId}`
            );
        }

        return NextResponse.json({
            message: `Successfully updated assignments.`,
            assignedCount: allNewAttesterIds.length
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
