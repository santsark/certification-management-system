import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function listUsers() {
    try {
        console.log('Fetching all users from database...\n');

        const users = await db.query.users.findMany({
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: (users, { asc }) => [asc(users.role), asc(users.email)],
        });

        if (users.length === 0) {
            console.log('No users found in the database.');
            return;
        }

        console.log(`Found ${users.length} user(s):\n`);
        console.log('='.repeat(80));

        users.forEach((user, index) => {
            console.log(`\n${index + 1}. ${user.name}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Created: ${user.createdAt?.toLocaleString() || 'N/A'}`);
            console.log(`   Password: test123! (default for all test users)`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('\nNOTE: All passwords are hashed in the database.');
        console.log('The default password for test users should be: test123!');
        console.log('\nIf login still fails, you may need to reset a user\'s password.');

    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

listUsers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
