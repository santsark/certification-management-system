'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { verifyPassword, createSession } from '@/lib/auth';

interface LoginResult {
    success: boolean;
    error?: string;
    mustChangePassword?: boolean;
    role?: string;
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        // Validate inputs
        if (!email || !password) {
            return {
                success: false,
                error: 'Email and password are required',
            };
        }

        // Look up user by email (case-insensitive)
        const [user] = await db
            .select()
            .from(users)
            .where(sql`LOWER(${users.email}) = LOWER(${email})`)
            .limit(1);

        if (!user) {
            return {
                success: false,
                error: 'Invalid email or password',
            };
        }

        // Verify password
        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return {
                success: false,
                error: 'Invalid email or password',
            };
        }

        // Create session
        const sessionId = await createSession(user.id);

        // Set httpOnly cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        });

        // Return success with redirect info
        return {
            success: true,
            mustChangePassword: user.mustChangePassword,
            role: user.role,
        };
    } catch (error) {
        console.error('Login action error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
};
