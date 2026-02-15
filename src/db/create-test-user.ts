import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { db } from './db';
import { users } from './schema';
import { hashPassword } from '@/lib/auth';

/**
 * Script to create a test admin user for testing authentication
 * Run this file to insert a test user into the database
 */
async function createTestUser() {
    try {
        const testPassword = 'test123!';
        const hashedPassword = await hashPassword(testPassword);

        const [user] = await db
            .insert(users)
            .values({
                email: 'admin@test.com',
                name: 'Test Admin',
                passwordHash: hashedPassword,
                role: 'admin',
                mustChangePassword: true,
            })
            .returning();

        console.log('Test user created successfully!');
        console.log('Email: admin@test.com');
        console.log('Password: test123!');
        console.log('Role: admin');
        console.log('Must change password: true');
        console.log('\nUser ID:', user.id);
    } catch (error) {
        console.error('Error creating test user:', error);
    }
}

createTestUser();
