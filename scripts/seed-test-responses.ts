import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedTestResponses() {
    console.log('Starting test data seeding for responses...');

    try {
        // Find an existing open certification
        const certifications = await db.query.certifications.findMany({
            where: (certs, { eq }) => eq(certs.status, 'open'),
            limit: 1,
        });

        if (certifications.length === 0) {
            console.log('No open certifications found. Please create one first.');
            return;
        }

        const cert = certifications[0];
        console.log(`Found certification: ${cert.title} (${cert.id})`);

        // Get assignments for this certification
        const assignments = await db.query.certificationAssignments.findMany({
            where: (assgn, { eq }) => eq(assgn.certificationId, cert.id),
            with: {
                attester: true,
            },
        });

        if (assignments.length === 0) {
            console.log('No attesters assigned to this certification. Please assign some first.');
            return;
        }

        console.log(`Found ${assignments.length} assigned attesters`);

        // Seed responses for the first 2 attesters (to test both complete and incomplete states)
        const attestersToSeed = assignments.slice(0, Math.min(2, assignments.length));

        for (const assignment of attestersToSeed) {
            // Check if response already exists
            const existing = await db.query.attestationResponses.findFirst({
                where: (resp, { and, eq }) => and(
                    eq(resp.certificationId, cert.id),
                    eq(resp.attesterId, assignment.attesterId)
                ),
            });

            if (existing) {
                console.log(`Response already exists for ${assignment.attester.name}, skipping...`);
                continue;
            }

            // Create sample answers based on questions
            const questions = cert.questions as any[];
            const answers = questions.map((q: any) => {
                let answer: any;

                switch (q.type) {
                    case 'yes_no':
                        answer = Math.random() > 0.5 ? true : false;
                        return {
                            question_id: q.id,
                            answer,
                            comments: answer === false ? 'This requires attention and follow-up.' : undefined,
                        };
                    case 'text':
                        return {
                            question_id: q.id,
                            answer: 'This is a sample text response for testing purposes.',
                        };
                    case 'date':
                        return {
                            question_id: q.id,
                            answer: new Date().toISOString(),
                        };
                    case 'dropdown':
                        return {
                            question_id: q.id,
                            answer: q.options?.[0] || 'Option 1',
                        };
                    case 'multiple_choice':
                        return {
                            question_id: q.id,
                            answer: q.options?.slice(0, 2) || ['Option 1', 'Option 2'],
                        };
                    default:
                        return {
                            question_id: q.id,
                            answer: 'Default answer',
                        };
                }
            });

            await db.insert(schema.attestationResponses).values({
                certificationId: cert.id,
                attesterId: assignment.attesterId,
                responses: answers,
                status: 'submitted',
                submittedAt: new Date(),
            });

            console.log(`✓ Created test response for ${assignment.attester.name}`);
        }

        console.log('\n✅ Test data seeding complete!');
        console.log(`\nYou can now test the response viewing at:`);
        console.log(`  http://localhost:3000/mandate-owner/certifications/${cert.id}/responses`);

    } catch (error) {
        console.error('Error seeding test data:', error);
        throw error;
    }
}

seedTestResponses()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
