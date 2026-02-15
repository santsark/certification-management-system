import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function testAndResetPasswords() {
    try {
        console.log('Testing password verification for all users...\n');

        const allUsers = await db.query.users.findMany();
        const testPassword = 'test123!';

        console.log(`Testing password: "${testPassword}"\n`);
        console.log('='.repeat(80));

        for (const user of allUsers) {
            console.log(`\nUser: ${user.name} (${user.email})`);

            // Test if current password hash validates
            const isValid = await bcrypt.compare(testPassword, user.passwordHash);
            console.log(`  Current hash validates: ${isValid ? '✓ YES' : '✗ NO'}`);

            if (!isValid) {
                console.log(`  ⚠️  Password hash is invalid! Resetting...`);

                // Generate new hash
                const newHash = await bcrypt.hash(testPassword, 10);

                // Update user
                await db
                    .update(schema.users)
                    .set({ passwordHash: newHash })
                    .where(eq(schema.users.id, user.id));

                // Verify the new hash works
                const newValidation = await bcrypt.compare(testPassword, newHash);
                console.log(`  New hash validates: ${newValidation ? '✓ YES' : '✗ NO'}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ All users should now have working passwords: test123!');
        console.log('Please try logging in again.');

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

testAndResetPasswords()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
