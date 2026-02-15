
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attestationResponses, users, certifications, mandates } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; attesterId: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId, attesterId } = await params;

        // Verify ownership
        const cert = await db
            .select({
                id: certifications.id,
                mandateId: certifications.mandateId,
                title: certifications.title,
                questions: certifications.questions,
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

        // Fetch Attester Details
        const attester = await db.query.users.findFirst({
            where: eq(users.id, attesterId),
            columns: {
                id: true,
                name: true,
                email: true,
            }
        });

        if (!attester) {
            return NextResponse.json({ error: 'Attester not found' }, { status: 404 });
        }

        // Fetch Response
        const response = await db.query.attestationResponses.findFirst({
            where: and(
                eq(attestationResponses.certificationId, certId),
                eq(attestationResponses.attesterId, attesterId)
            )
        });

        return NextResponse.json({
            attester,
            questions: cert[0].questions,
            response: response ? {
                status: response.status,
                answers: response.responses,
                submittedAt: response.submittedAt,
            } : null
        });

    } catch (error) {
        console.error('Get individual response error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch response' },
            { status: 500 }
        );
    }
}
