import { db } from './db';
import { users } from './schema';
import { hashPassword } from '@/lib/auth';

async function createTestUsers() {
    try {
        // Create a mandate owner user
        const password = await hashPassword('test123!');

        const [mandateOwner] = await db
            .insert(users)
            .values({
                email: 'owner@test.com',
                name: 'Test Mandate Owner',
                role: 'mandate_owner',
                passwordHash: password,
                mustChangePassword: true,
            })
            .returning();

        console.log('Created mandate owner:', mandateOwner);

        // Create an attester user
        const [attester] = await db
            .insert(users)
            .values({
                email: 'attester@test.com',
                name: 'Test Attester',
                role: 'attester',
                passwordHash: password,
                mustChangePassword: true,
            })
            .returning();

        console.log('Created attester:', attester);

        console.log('\nTest users created successfully!');
        console.log('Login credentials:');
        console.log('  Mandate Owner: owner@test.com / test123!');
        console.log('  Attester: attester@test.com / test123!');
        console.log('  Admin (existing): admin@test.com / NewPass123!');
    } catch (error) {
        console.error('Error creating test users:', error);
    }

    process.exit(0);
}

createTestUsers();
