// Quick Reference: Using the Database Schema

import { db, users, mandates, sessions } from '@/db';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// ============================================
// Example: Creating a New User
// ============================================

async function createUser(
    email: string,
    name: string,
    password: string,
    role: 'admin' | 'mandate_owner' | 'attester'
) {
    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db
        .insert(users)
        .values({
            email,
            name,
            passwordHash,
            role,
            mustChangePassword: true,
        })
        .returning();

    return newUser;
}

// ============================================
// Example: User Authentication
// ============================================

async function authenticateUser(email: string, password: string) {
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (!user) {
        return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
        return null;
    }

    return user;
}

// ============================================
// Example: Creating a Session
// ============================================

async function createSession(userId: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const [session] = await db
        .insert(sessions)
        .values({
            userId,
            expiresAt,
        })
        .returning();

    return session;
}

// ============================================
// Example: Creating a Mandate
// ============================================

async function createMandate(
    name: string,
    description: string,
    ownerId: string,
    backupOwnerId?: string
) {
    const [mandate] = await db
        .insert(mandates)
        .values({
            name,
            description,
            ownerId,
            backupOwnerId,
            status: 'open',
        })
        .returning();

    return mandate;
}

// ============================================
// Example: Getting User with Their Mandates
// ============================================

async function getUserWithMandates(userId: string) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
            ownedMandates: true,
            backupMandates: true,
        },
    });

    return user;
}

// ============================================
// Example: Getting Active Sessions
// ============================================

async function getActiveSessions(userId: string) {
    // Note: This example needs the sql operator for date comparison
    // import { sql } from 'drizzle-orm';
    // const activeSessions = await db
    //     .select()
    //     .from(sessions)
    //     .where(
    //         and(
    //             eq(sessions.userId, userId),
    //             gt(sessions.expiresAt, sql`NOW()`)
    //         )
    //     );

    // For now, get all user sessions
    const activeSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId));

    return activeSessions;
}

// ============================================
// Example: Deleting Expired Sessions
// ============================================

async function deleteExpiredSessions() {
    // Note: This example needs the sql operator for date comparison
    // import { sql, lt } from 'drizzle-orm';
    // await db
    //     .delete(sessions)
    //     .where(lt(sessions.expiresAt, sql`NOW()`));

    // For now, delete sessions that have expired before a specific date
    const now = new Date();
    // Implement with proper SQL operators as needed
}

// ============================================
// Example: Updating User Password
// ============================================

async function updatePassword(
    userId: string,
    newPassword: string,
    mustChangePassword = false
) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const [updatedUser] = await db
        .update(users)
        .set({
            passwordHash,
            mustChangePassword,
            updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

    return updatedUser;
}

// ============================================
// Example: Closing a Mandate
// ============================================

async function closeMandate(mandateId: string) {
    const [closedMandate] = await db
        .update(mandates)
        .set({
            status: 'closed',
            updatedAt: new Date(),
        })
        .where(eq(mandates.id, mandateId))
        .returning();

    return closedMandate;
}

// ============================================
// Example: Getting All Attesters
// ============================================

async function getAttesters() {
    const attesters = await db
        .select()
        .from(users)
        .where(eq(users.role, 'attester'));

    return attesters;
}

// ============================================
// TypeScript Types (Auto-generated)
// ============================================

// Import these from '@/db/schema'
import type { User, NewUser, Mandate, NewMandate, Session, NewSession } from '@/db/schema';

// User - Full user object from database
// NewUser - For inserting new users (optional fields excluded)
// Mandate - Full mandate object from database
// NewMandate - For inserting new mandates
// Session - Full session object from database
// NewSession - For inserting new sessions
