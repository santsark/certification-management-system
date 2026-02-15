import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, attestationResponses } from '@/db/schema';
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

        // Get certification details
        const [cert] = await db
            .select({
                id: certifications.id,
                title: certifications.title,
                questions: certifications.questions,
            })
            .from(certifications)
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert) {
            return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
        }

        // Get attester's response
        const [response] = await db
            .select({
                id: attestationResponses.id,
                status: attestationResponses.status,
                responses: attestationResponses.responses,
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

        return NextResponse.json({
            certification: {
                id: cert.id,
                title: cert.title,
            },
            questions: cert.questions,
            response: response ? {
                status: response.status,
                answers: response.responses,
                submittedAt: response.submittedAt,
            } : null,
        });

    } catch (error) {
        console.error('Error fetching attester response:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
