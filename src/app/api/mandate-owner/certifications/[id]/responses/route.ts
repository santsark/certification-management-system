
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certificationAssignments, attestationResponses, users, certifications, mandates } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await params;

        // Verify ownership (can refactor this into a helper but inline for now)
        const cert = await db
            .select({
                id: certifications.id,
                mandateId: certifications.mandateId,
                title: certifications.title,
                status: certifications.status,
                description: certifications.description,
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

        // Fetch all assigned attesters
        const assignments = await db
            .select({
                attesterId: users.id,
                name: users.name,
                email: users.email,
            })
            .from(certificationAssignments)
            .innerJoin(users, eq(certificationAssignments.attesterId, users.id))
            .where(eq(certificationAssignments.certificationId, certId));

        // Fetch all responses
        const responses = await db
            .select({
                attesterId: attestationResponses.attesterId,
                status: attestationResponses.status,
                submittedAt: attestationResponses.submittedAt,
            })
            .from(attestationResponses)
            .where(eq(attestationResponses.certificationId, certId));

        // Map responses to assignments
        const responseMap = new Map();
        responses.forEach(r => responseMap.set(r.attesterId, r));

        const result = assignments.map(assignment => {
            const response = responseMap.get(assignment.attesterId);
            return {
                attester: {
                    id: assignment.attesterId,
                    name: assignment.name,
                    email: assignment.email,
                },
                status: response ? response.status : 'pending',
                submittedAt: response ? response.submittedAt : null,
            };
        });

        const stats = {
            total: assignments.length,
            submitted: responses.filter(r => r.status === 'submitted').length,
            percentage: assignments.length > 0
                ? Math.round((responses.filter(r => r.status === 'submitted').length / assignments.length) * 100)
                : 0
        };

        return NextResponse.json({
            certification: cert[0],
            attesters: result,
            stats
        });

    } catch (error) {
        console.error('Get responses error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch responses' },
            { status: 500 }
        );
    }
}
