import { NextResponse } from 'next/server';
import { db } from '@/db';
import { certificationAssignments, certifications, mandates, attestationResponses } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

export async function GET() {
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

        const userId = session.user.id;

        // Get all attestation assignments for this user
        const assignments = await db
            .select({
                id: certificationAssignments.id,
                certificationId: certificationAssignments.certificationId,
                certificationTitle: certifications.title,
                certificationStatus: certifications.status,
                mandateName: mandates.name,
                assignedAt: certificationAssignments.assignedAt,
            })
            .from(certificationAssignments)
            .innerJoin(certifications, eq(certificationAssignments.certificationId, certifications.id))
            .innerJoin(mandates, eq(certifications.mandateId, mandates.id))
            .where(
                and(
                    eq(certificationAssignments.attesterId, userId),
                    or(
                        eq(certifications.status, 'open'),
                        eq(certifications.status, 'closed')
                    )
                )
            );

        // Get response status for each assignment
        const attestations = await Promise.all(
            assignments.map(async (assignment) => {
                const [response] = await db
                    .select({
                        id: attestationResponses.id,
                        status: attestationResponses.status,
                        submittedAt: attestationResponses.submittedAt,
                        responses: attestationResponses.responses,
                    })
                    .from(attestationResponses)
                    .where(
                        and(
                            eq(attestationResponses.certificationId, assignment.certificationId),
                            eq(attestationResponses.attesterId, userId)
                        )
                    )
                    .limit(1);

                // Get certification details including questions
                const [certDetails] = await db
                    .select({
                        description: certifications.description,
                        questions: certifications.questions,
                    })
                    .from(certifications)
                    .where(eq(certifications.id, assignment.certificationId))
                    .limit(1);

                // Calculate progress
                const questions = (certDetails?.questions as any[]) || [];
                const totalQuestions = questions.length;
                const answers = (response?.responses as any[]) || [];
                const answeredCount = answers.filter(
                    (a: any) => a.answer !== null && a.answer !== undefined && a.answer !== ''
                ).length;

                return {
                    id: assignment.id,
                    certificationId: assignment.certificationId,
                    certificationTitle: assignment.certificationTitle,
                    certificationDescription: certDetails?.description || null,
                    mandateName: assignment.mandateName,
                    status: response?.status || 'pending',
                    dueDate: null, // Could add due date logic later
                    submittedAt: response?.submittedAt,
                    assignedAt: assignment.assignedAt,
                    totalQuestions,
                    answeredQuestions: answeredCount,
                };
            })
        );

        return NextResponse.json({ attestations });
    } catch (error) {
        console.error('Error fetching attestations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
