'use server';

import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateSession, verifyPassword, hashPassword, validatePassword } from '@/lib/auth';

interface ChangePasswordResult {
    success: boolean;
    error?: string;
}

export async function changePasswordAction(formData: FormData): Promise<ChangePasswordResult> {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
        // Validate session
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session')?.value;

        if (!sessionId) {
            return {
                success: false,
                error: 'Unauthorized - Please log in',
            };
        }

        const session = await validateSession(sessionId);

        if (!session) {
            return {
                success: false,
                error: 'Invalid or expired session',
            };
        }

        // Validate inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            return {
                success: false,
                error: 'All fields are required',
            };
        }

        // Check if new password matches confirm password
        if (newPassword !== confirmPassword) {
            return {
                success: false,
                error: 'New password and confirm password do not match',
            };
        }

        // Validate new password
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return {
                success: false,
                error: passwordValidation.errors.join(', '),
            };
        }

        // Get user's current password hash
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

        if (!user) {
            return {
                success: false,
                error: 'User not found',
            };
        }

        // Verify current password
        const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            return {
                success: false,
                error: 'Current password is incorrect',
            };
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

        return {
            success: true,
        };
    } catch (error) {
        console.error('Change password action error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
}
