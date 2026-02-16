import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mandates, users, certifications } from '@/db/schema';
import { eq, sql, and, min } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { createMandateSchema } from '@/lib/schemas';

// GET /api/admin/mandates - List all mandates with owner info
export async function GET() {
    try {
        await requireAdmin();

        const mandatesList = await db
            .select({
                id: mandates.id,
                name: mandates.name,
                description: mandates.description,
                ownerId: mandates.ownerId,
                ownerName: users.name,
                ownerEmail: users.email,
                backupOwnerId: mandates.backupOwnerId,
                status: mandates.status,
                createdAt: mandates.createdAt,
                updatedAt: mandates.updatedAt,
            })
            .from(mandates)
            .leftJoin(users, eq(mandates.ownerId, users.id))
            .orderBy(mandates.createdAt);

        // Get backup owner names separately
        const mandatesWithBackupOwner = await Promise.all(
            mandatesList.map(async (mandate) => {
                let backupOwnerName = null;
                let backupOwnerEmail = null;

                if (mandate.backupOwnerId) {
                    const [backupOwner] = await db
                        .select({
                            name: users.name,
                            email: users.email,
                        })
                        .from(users)
                        .where(eq(users.id, mandate.backupOwnerId))
                        .limit(1);

                    if (backupOwner) {
                        backupOwnerName = backupOwner.name;
                        backupOwnerEmail = backupOwner.email;
                    }
                }

                return {
                    ...mandate,
                    backupOwnerName,
                    backupOwnerEmail,
                };
            })
        );

        // Fetch next deadline for each mandate
        const mandatesWithDetails = await Promise.all(
            mandatesWithBackupOwner.map(async (mandate) => {
                const [nextDeadlineResult] = await db
                    .select({
                        nextDeadline: min(certifications.deadline),
                    })
                    .from(certifications)
                    .where(
                        and(
                            eq(certifications.mandateId, mandate.id),
                            eq(certifications.status, 'open')
                        )
                    );

                return {
                    ...mandate,
                    nextDeadline: nextDeadlineResult?.nextDeadline || null,
                };
            })
        );

        return NextResponse.json({ mandates: mandatesWithDetails });
    } catch (error: unknown) {
        console.error('Get mandates error:', error);

        return NextResponse.json(
            { error: 'Failed to fetch mandates' },
            { status: 500 }
        );
    }
}

// POST /api/admin/mandates - Create new mandate
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const body = await request.json();

        // Validate request body
        const validationResult = createMandateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { name, description, ownerId, backupOwnerId, status } = validationResult.data;

        // Validate owner exists and has mandate_owner role
        const [owner] = await db
            .select()
            .from(users)
            .where(eq(users.id, ownerId))
            .limit(1);

        if (!owner) {
            return NextResponse.json(
                { error: 'Owner not found' },
                { status: 400 }
            );
        }

        if (owner.role !== 'mandate_owner') {
            return NextResponse.json(
                { error: 'Owner must have mandate_owner role' },
                { status: 400 }
            );
        }

        // Validate backup owner if provided
        if (backupOwnerId) {
            const [backupOwner] = await db
                .select()
                .from(users)
                .where(eq(users.id, backupOwnerId))
                .limit(1);

            if (!backupOwner) {
                return NextResponse.json(
                    { error: 'Backup owner not found' },
                    { status: 400 }
                );
            }

            if (backupOwner.role !== 'mandate_owner') {
                return NextResponse.json(
                    { error: 'Backup owner must have mandate_owner role' },
                    { status: 400 }
                );
            }
        }

        // Create mandate
        const [newMandate] = await db
            .insert(mandates)
            .values({
                name,
                description,
                ownerId,
                backupOwnerId,
                status,
            })
            .returning();

        return NextResponse.json({ mandate: newMandate }, { status: 201 });
    } catch (error: unknown) {
        console.error('Create mandate error:', error);

        return NextResponse.json(
            { error: 'Failed to create mandate' },
            { status: 500 }
        );
    }
}
