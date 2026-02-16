import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, attestationResponses, certificationAssignments, mandates, users, notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';
import { checkLevelUnlock } from '@/lib/attestation-levels';

interface Answer {
    question_id: string;
    answer: any;
    comments?: string;
}

interface Question {
    id: string;
    question: string;
    required: boolean;
    type: string;
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // Get current user session
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session')?.value;

        if (!sessionId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await validateSession(sessionId);

        if (!session || session.user.role !== 'attester') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id: certId } = await context.params;
        const userId = session.user.id;
        const body = await request.json();
        const { answers } = body as { answers: Answer[] };

        // Verify user is assigned to this certification
        const assignment = await db.query.certificationAssignments.findFirst({
            where: and(
                eq(certificationAssignments.certificationId, certId),
                eq(certificationAssignments.attesterId, userId)
            )
        });

        if (!assignment) {
            return NextResponse.json({ error: 'Not assigned to this certification' }, { status: 403 });
        }

        // Get certification details
        const [cert] = await db
            .select({
                id: certifications.id,
                title: certifications.title,
                status: certifications.status,
                questions: certifications.questions,
                mandateId: certifications.mandateId,
            })
            .from(certifications)
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert) {
            return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
        }

        if (cert.status === 'closed') {
            return NextResponse.json({ error: 'This certification is closed' }, { status: 400 });
        }

        // Check if already submitted
        const [existingResponse] = await db
            .select({ id: attestationResponses.id, status: attestationResponses.status })
            .from(attestationResponses)
            .where(
                and(
                    eq(attestationResponses.certificationId, certId),
                    eq(attestationResponses.attesterId, userId)
                )
            )
            .limit(1);

        if (existingResponse?.status === 'submitted') {
            return NextResponse.json({ error: 'Cannot modify a submitted attestation' }, { status: 400 });
        }

        // Validate required questions
        const questions = cert.questions as Question[];
        const answerMap = new Map(answers.map(a => [a.question_id, a]));
        const fieldErrors: Record<string, string> = {};

        for (const question of questions) {
            if (question.required) {
                const answer = answerMap.get(question.id);
                if (!answer || answer.answer === null || answer.answer === undefined || answer.answer === '') {
                    fieldErrors[question.id] = 'This question is required';
                } else if (question.type === 'multiple_choice') {
                    if (!Array.isArray(answer.answer) || answer.answer.length === 0) {
                        fieldErrors[question.id] = 'Please select at least one option';
                    }
                }
            }
        }

        if (Object.keys(fieldErrors).length > 0) {
            return NextResponse.json({
                error: 'Validation failed',
                fieldErrors,
            }, { status: 400 });
        }

        const now = new Date();

        // Update or insert response with submitted status
        if (existingResponse) {
            await db
                .update(attestationResponses)
                .set({
                    responses: answers,
                    status: 'submitted',
                    submittedAt: now,
                    lastSavedAt: now,
                })
                .where(eq(attestationResponses.id, existingResponse.id));
        } else {
            await db.insert(attestationResponses).values({
                certificationId: certId,
                attesterId: userId,
                responses: answers,
                status: 'submitted',
                submittedAt: now,
                lastSavedAt: now,
            });
        }

        // Multi-Level Attestation: Check for L2 unlock
        try {
            const unlockResult = await checkLevelUnlock(certId, userId);
            if (unlockResult.shouldUnlockL2 && unlockResult.l2AttesterId) {
                await db.insert(notifications).values({
                    userId: unlockResult.l2AttesterId,
                    type: 'level_unlocked',
                    title: 'Action Required: Level 2 Review Unlocked',
                    message: `All Level 1 attesters in your group have submitted. You can now proceed with your attestation for "${cert.title}".`,
                    link: `/attester/certifications/${certId}`,
                });
                console.log(`L2 Unlocked: Notification sent to ${unlockResult.l2AttesterId}`);
            }
        } catch (unlockError) {
            // Non-blocking error logging
            console.error('Error checking level unlock:', unlockError);
        }

        // Get mandate details for notifications (Mandate Owner)
        const mandate = await db.query.mandates.findFirst({
            where: eq(mandates.id, cert.mandateId),
            columns: {
                ownerId: true,
                backupOwnerId: true,
            }
        });

        // Get attester name
        const attesterUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: {
                name: true,
            }
        });

        // Create notifications for mandate owner and backup owner
        const notificationsToCreate = [];

        if (mandate?.ownerId) {
            notificationsToCreate.push({
                userId: mandate.ownerId,
                type: 'attestation_submitted',
                title: 'Attestation Submitted',
                message: `${attesterUser?.name || 'An attester'} has completed certification: ${cert.title}`,
                link: `/mandate-owner/certifications/${certId}/responses/${userId}`,
            });
        }

        if (mandate?.backupOwnerId) {
            notificationsToCreate.push({
                userId: mandate.backupOwnerId,
                type: 'attestation_submitted',
                title: 'Attestation Submitted',
                message: `${attesterUser?.name || 'An attester'} has completed certification: ${cert.title}`,
                link: `/mandate-owner/certifications/${certId}/responses/${userId}`,
            });
        }

        if (notificationsToCreate.length > 0) {
            await db.insert(notifications).values(notificationsToCreate);
        }

        return NextResponse.json({
            message: 'Attestation submitted successfully',
            submittedAt: now,
        });

    } catch (error) {
        console.error('Error submitting attestation:', error);
        return NextResponse.json({ error: 'Failed to submit attestation' }, { status: 500 });
    }
}
