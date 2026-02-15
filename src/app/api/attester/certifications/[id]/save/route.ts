import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, attestationResponses, certificationAssignments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';

export async function POST(
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
        const body = await request.json();
        const { answers } = body;

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

        // Get certification to check status
        const [cert] = await db
            .select({ status: certifications.status })
            .from(certifications)
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert) {
            return NextResponse.json({ error: 'Certification not found' }, { status: 404 });
        }

        if (cert.status === 'closed') {
            return NextResponse.json({ error: 'This certification is closed' }, { status: 400 });
        }

        // Check if response already exists
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

        const now = new Date();

        // Upsert response
        if (existingResponse) {
            // Update existing
            await db
                .update(attestationResponses)
                .set({
                    responses: answers,
                    status: 'in_progress',
                    lastSavedAt: now,
                })
                .where(eq(attestationResponses.id, existingResponse.id));
        } else {
            // Insert new
            await db.insert(attestationResponses).values({
                certificationId: certId,
                attesterId: userId,
                responses: answers,
                status: 'in_progress',
                lastSavedAt: now,
            });
        }

        return NextResponse.json({
            message: 'Progress saved',
            lastSavedAt: now,
        });

    } catch (error) {
        console.error('Error saving progress:', error);
        return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }
}
