import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';
import { updateUserSchema } from '@/lib/schemas';

// PATCH /api/admin/users/[id] - Update user
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
        const { id } = await params;

        const body = await request.json();

        // Validate request body
        const validationResult = updateUserSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { role } = validationResult.data;

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!existingUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Update user
        const [updatedUser] = await db
            .update(users)
            .set({
                role,
                updatedAt: new Date(),
            })
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                mustChangePassword: users.mustChangePassword,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });

        return NextResponse.json({ user: updatedUser });
    } catch (error: any) {
        console.error('Update user error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin();
        const { id } = await params;

        // Check if user exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!existingUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Delete user (cascades to sessions)
        await db.delete(users).where(eq(users.id, id));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete user error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
