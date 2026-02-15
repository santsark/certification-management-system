/**
 * Database Seed Script
 * 
 * Seeds the database with initial data including the default admin user.
 * Run with: npm run seed
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { users } from '@/db/schema';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const ADMIN_USER = {
    email: 'admin@certificationhub.com',
    name: 'System Admin',
    password: 'Admin@123', // User must change on first login
    role: 'admin' as const,
};

async function seed() {
    console.log('🌱 Starting database seed...\n');

    // Validate environment variables
    if (!process.env.DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL environment variable is not set');
        console.error('   Please create .env.local file with DATABASE_URL');
        process.exit(1);
    }

    try {
        // Initialize database connection
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const db = drizzle(pool);

        console.log('✓ Connected to database');

        // Check if admin user already exists
        const existingAdmin = await db
            .select()
            .from(users)
            .where(eq(users.email, ADMIN_USER.email))
            .limit(1);

        if (existingAdmin.length > 0) {
            console.log('⚠️  Admin user already exists');
            console.log(`   Email: ${ADMIN_USER.email}`);
            console.log('   Skipping admin user creation');
        } else {
            // Hash password
            const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 10);

            // Insert admin user
            await db.insert(users).values({
                email: ADMIN_USER.email,
                name: ADMIN_USER.name,
                passwordHash: hashedPassword,
                role: ADMIN_USER.role,
                mustChangePassword: true, // Force password change on first login
            });

            console.log('✓ Admin user created successfully');
            console.log(`   Email: ${ADMIN_USER.email}`);
            console.log(`   Password: ${ADMIN_USER.password}`);
            console.log('   ⚠️  User must change password on first login');
        }

        console.log('\n🎉 Seed completed successfully!');

        // Close pool
        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seed failed with error:');
        console.error(error);
        process.exit(1);
    }
}

// Run seed
seed();
