import bcrypt from 'bcrypt';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

const SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Password Hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

// Password Validation
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// Session Management
export async function createSession(userId: string): Promise<string> {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    const [session] = await db
        .insert(sessions)
        .values({
            userId,
            expiresAt,
        })
        .returning({ id: sessions.id });

    return session.id;
}

export async function validateSession(sessionId: string) {
    const [session] = await db
        .select({
            id: sessions.id,
            userId: sessions.userId,
            expiresAt: sessions.expiresAt,
            user: {
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                mustChangePassword: users.mustChangePassword,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            },
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
            and(
                eq(sessions.id, sessionId),
                gt(sessions.expiresAt, new Date())
            )
        )
        .limit(1);

    if (!session) {
        return null;
    }

    return session;
}

export async function invalidateSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function extendSession(sessionId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await db
        .update(sessions)
        .set({ expiresAt })
        .where(eq(sessions.id, sessionId));
}
