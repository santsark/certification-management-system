import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mandates, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { updateMandateSchema } from '@/lib/schemas';

// PATCH /api/admin/mandates/[id] - Update mandate
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();

        // Validate request body
        const validationResult = updateMandateSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { name, description, ownerId, backupOwnerId, status } = validationResult.data;

        // Check if mandate exists
        const [existingMandate] = await db
            .select()
            .from(mandates)
            .where(eq(mandates.id, id))
            .limit(1);

        if (!existingMandate) {
            return NextResponse.json(
                { error: 'Mandate not found' },
                { status: 404 }
            );
        }

        // Validate owner if provided
        if (ownerId) {
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

        // Update mandate
        const updateData: any = {
            updatedAt: new Date(),
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (ownerId !== undefined) updateData.ownerId = ownerId;
        if (backupOwnerId !== undefined) updateData.backupOwnerId = backupOwnerId;
        if (status !== undefined) updateData.status = status;

        const [updatedMandate] = await db
            .update(mandates)
            .set(updateData)
            .where(eq(mandates.id, id))
            .returning();

        return NextResponse.json({ mandate: updatedMandate });
    } catch (error: any) {
        console.error('Update mandate error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to update mandate' },
            { status: 500 }
        );
    }
}
