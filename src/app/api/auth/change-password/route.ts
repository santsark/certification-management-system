import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateSession, verifyPassword, hashPassword, validatePassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        // Validate session
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session')?.value;

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const session = await validateSession(sessionId);

        if (!session) {
            return NextResponse.json(
                { error: 'Invalid or expired session' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { currentPassword, newPassword, confirmPassword } = body;

        // Validate inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Check if new password matches confirm password
        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: 'New password and confirm password do not match' },
                { status: 400 }
            );
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { error: passwordValidation.errors.join(', ') },
                { status: 400 }
            );
        }

        // Get user's current password hash
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Verify current password
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update password and set must_change_password to false
        await db
            .update(users)
            .set({
                passwordHash: newPasswordHash,
                mustChangePassword: false,
                updatedAt: new Date(),
            })
            .where(eq(users.id, session.userId));

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'An error occurred while changing password' },
            { status: 500 }
        );
    }
}
