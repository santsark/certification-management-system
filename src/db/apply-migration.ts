import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function applyMigration() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
    const db = drizzle(pool);

    try {
        console.log('Applying migration 0001_fearless_night_thrasher...');

        // Read the migration file
        const migrationPath = path.join(process.cwd(), 'drizzle/0001_fearless_night_thrasher.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Split into statements
        const statements = migrationSQL
            .split('-->statement-breakpoint')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        // Filter out enum creation statements that already exist
        const statementsToRun = statements.filter(stmt => {
            // Skip existing enums
            if (stmt.includes('CREATE TYPE') &&
                (stmt.includes('user_role') || stmt.includes('mandate_status'))) {
                console.log('Skipping existing enum:', stmt.substring(0, 50) + '...');
                return false;
            }
            return true;
        });

        console.log(`Executing ${statementsToRun.length} statements...`);

        // Execute each statement using pool
        for (const statement of statementsToRun) {
            if (statement.trim()) {
                console.log('Executing:', statement.substring(0, 60) + '...');
                await pool.query(statement);
            }
        }

        console.log('✓ Migration applied successfully!');

        // Verify tables were created
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('certifications', 'certification_assignments', 'attestation_responses', 'notifications')
            ORDER BY table_name
        `);

        console.log('\nVerification - New tables created:');
        result.rows.forEach((table: any) => {
            console.log(`  ✓ ${table.table_name}`);
        });

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error applying migration:', error);
        await pool.end();
        process.exit(1);
    }
}

applyMigration();
