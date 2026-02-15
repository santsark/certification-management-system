import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { validateSession } from './auth';

/**
 * Require admin role for API routes
 * Validates session and checks if user has admin role
 * Throws error if not authorized
 */
export async function requireAdmin() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
        throw new Error('Unauthorized: No session found');
    }

    const session = await validateSession(sessionId);

    if (!session) {
        throw new Error('Unauthorized: Invalid or expired session');
    }

    if (session.user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }

    return session.user;
}

/**
 * Generate a secure random password
 * Returns 8-character password with uppercase, lowercase, numbers, and special characters
 */
export function generatePassword(): string {
    const length = 8;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';

    const allChars = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('');
}
