
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, mandates, certificationAssignments } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';
import { certificationFormSchema } from '@/lib/validations/certification';
import { createNotification } from '@/lib/notifications';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // ... existing GET implementation ...
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await params;

        // Fetch certification with mandate info
        const cert = await db
            .select({
                id: certifications.id,
                mandateId: certifications.mandateId,
                title: certifications.title,
                description: certifications.description,
                status: certifications.status,
                questions: certifications.questions,
                createdAt: certifications.createdAt,
                updatedAt: certifications.updatedAt,
                publishedAt: certifications.publishedAt,
                mandateName: mandates.name,
            })
            .from(certifications)
            .innerJoin(mandates, eq(certifications.mandateId, mandates.id))
            .where(eq(certifications.id, certId))
            .limit(1);

        if (!cert || cert.length === 0) {
            return NextResponse.json(
                { error: 'Certification not found' },
                { status: 404 }
            );
        }

        // Verify user owns the mandate
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
                { error: 'You do not have permission to view this certification' },
                { status: 403 }
            );
        }

        return NextResponse.json(cert[0]);
    } catch (error) {
        console.error('Get certification error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch certification' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await params;
        const body = await request.json();

        // Validate input
        const validationResult = certificationFormSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { mandateId, title, description, questions } = validationResult.data;

        // Verify certification exists and user owns the mandate
        const existing = await db.query.certifications.findFirst({
            where: eq(certifications.id, certId),
        });

        if (!existing) {
            return NextResponse.json(
                { error: 'Certification not found' },
                { status: 404 }
            );
        }

        // Verify user owns the mandate
        const mandate = await db.query.mandates.findFirst({
            where: and(
                eq(mandates.id, mandateId),
                or(
                    eq(mandates.ownerId, user.id),
                    eq(mandates.backupOwnerId, user.id)
                )
            ),
        });

        if (!mandate) {
            return NextResponse.json(
                { error: 'You do not have permission to update this certification' },
                { status: 403 }
            );
        }

        // Update certification
        const result = await db
            .update(certifications)
            .set({
                mandateId,
                title,
                description: description || null,
                questions: questions as any,
                updatedAt: new Date(),
            })
            .where(eq(certifications.id, certId))
            .returning();

        // Check if certification is published (status is 'open' or 'closed', usually 'open' means published for this context?)
        // The requirements say "after published". existing.status or result[0].status
        // existing.status should be checked. 
        // If status is 'open', notify assigned attesters.
        if (existing.status === 'open') {
            const assignments = await db
                .select({ attesterId: certificationAssignments.attesterId })
                .from(certificationAssignments)
                .where(eq(certificationAssignments.certificationId, certId));

            for (const assignment of assignments) {
                await createNotification(
                    assignment.attesterId,
                    'certification_updated',
                    'Certification Updated',
                    `${result[0].title} has been updated. Please review the changes.`,
                    `/attester/certifications/${certId}`
                );
            }
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Update certification error:', error);
        return NextResponse.json(
            { error: 'Failed to update certification' },
            { status: 500 }
        );
    }
}
