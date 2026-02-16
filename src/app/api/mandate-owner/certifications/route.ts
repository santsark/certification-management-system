import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mandates, certifications, certificationAssignments, attestationResponses } from '@/db/schema';
import { eq, or, and, sql, inArray } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';
import { certificationFormSchema } from '@/lib/validations/certification';

export async function GET(request: NextRequest) {
    try {
        const user = await requireMandateOwner();
        const searchParams = request.nextUrl.searchParams;
        const mandateIdFilter = searchParams.get('mandateId');
        const statusFilter = searchParams.get('status');

        // Get all mandates owned by user
        const userMandates = await db
            .select({ id: mandates.id })
            .from(mandates)
            .where(
                or(
                    eq(mandates.ownerId, user.id),
                    eq(mandates.backupOwnerId, user.id)
                )
            );

        const mandateIds = userMandates.map(m => m.id);

        if (mandateIds.length === 0) {
            return NextResponse.json([]);
        }

        // Build where clause
        let whereClause = inArray(certifications.mandateId, mandateIds);

        if (mandateIdFilter) {
            whereClause = and(whereClause, eq(certifications.mandateId, mandateIdFilter))!;
        }

        if (statusFilter && statusFilter !== 'all') {
            whereClause = and(whereClause, eq(certifications.status, statusFilter as any))!;
        }

        // Fetch certifications with mandate info
        const certs = await db
            .select({
                id: certifications.id,
                title: certifications.title,
                mandateId: certifications.mandateId,
                status: certifications.status,
                createdAt: certifications.createdAt,
                mandateName: mandates.name,
            })
            .from(certifications)
            .innerJoin(mandates, eq(certifications.mandateId, mandates.id))
            .where(whereClause);

        // For each certification, get assignment and response counts
        const certificationsWithDetails = await Promise.all(
            certs.map(async (cert) => {
                // Count assigned attesters
                const assignedCountResult = await db
                    .select({
                        count: sql<number>`cast(count(*) as int)`,
                    })
                    .from(certificationAssignments)
                    .where(eq(certificationAssignments.certificationId, cert.id));

                const assignedCount = assignedCountResult[0]?.count || 0;

                // Count completed responses (submitted status)
                const completedCountResult = await db
                    .select({
                        count: sql<number>`cast(count(*) as int)`,
                    })
                    .from(attestationResponses)
                    .where(
                        and(
                            eq(attestationResponses.certificationId, cert.id),
                            eq(attestationResponses.status, 'submitted')
                        )
                    );

                const completedCount = completedCountResult[0]?.count || 0;

                // Calculate completion percentage
                const completionPercentage = assignedCount > 0
                    ? Math.round((completedCount / assignedCount) * 100)
                    : 0;

                return {
                    id: cert.id,
                    title: cert.title,
                    mandateId: cert.mandateId,
                    mandateName: cert.mandateName,
                    status: cert.status,
                    assignedCount,
                    completedCount,
                    completionPercentage,
                    createdAt: cert.createdAt,
                };
            })
        );

        return NextResponse.json(certificationsWithDetails);
    } catch (error) {
        console.error('Error fetching certifications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch certifications' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireMandateOwner();
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
                { error: 'Mandate not found or you do not have permission' },
                { status: 404 }
            );
        }

        // Create certification
        const result = await db
            .insert(certifications)
            .values({
                mandateId,
                title,
                description: description || null,
                status: 'draft',
                questions: questions as any, // JSONB type
                deadline: validationResult.data.deadline ? new Date(validationResult.data.deadline) : null,
                createdBy: user.id,
            })
            .returning();

        return NextResponse.json(result[0], { status: 201 });
    } catch (error: any) {
        console.error('Create certification error:', error);
        return NextResponse.json(
            { error: 'Failed to create certification' },
            { status: 500 }
        );
    }
}
