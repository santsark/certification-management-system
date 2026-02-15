import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, mandates, attestationResponses, certificationAssignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
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

        const { id: certId } = await params;
        const userId = session.user.id;

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
                description: certifications.description,
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

        // Get mandate details
        const mandate = await db.query.mandates.findFirst({
            where: eq(mandates.id, cert.mandateId),
            columns: {
                name: true,
            }
        });

        // Get user's existing response if any
        const [response] = await db
            .select({
                id: attestationResponses.id,
                status: attestationResponses.status,
                responses: attestationResponses.responses,
                lastSavedAt: attestationResponses.lastSavedAt,
                submittedAt: attestationResponses.submittedAt,
            })
            .from(attestationResponses)
            .where(
                and(
                    eq(attestationResponses.certificationId, certId),
                    eq(attestationResponses.attesterId, userId)
                )
            )
            .limit(1);

        // Determine if readonly
        const readonly = (response?.status === 'submitted') || (cert.status === 'closed');

        return NextResponse.json({
            certification: {
                id: cert.id,
                title: cert.title,
                description: cert.description,
                status: cert.status,
                questions: cert.questions,
            },
            mandate: {
                name: mandate?.name || 'Unknown Mandate',
            },
            response: response ? {
                id: response.id,
                status: response.status,
                answers: response.responses,
                lastSavedAt: response.lastSavedAt,
                submittedAt: response.submittedAt,
            } : null,
            readonly,
        });

    } catch (error) {
        console.error('Error fetching certification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
