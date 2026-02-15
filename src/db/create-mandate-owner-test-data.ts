import * as dotenv from 'dotenv';
dotenv.config();

import { db } from './index';
import { users, mandates, certifications, certificationAssignments, attestationResponses } from './schema';
import * as bcrypt from 'bcrypt';

async function createTestData() {
    try {
        console.log('Creating test data for mandate owner dashboard...');

        // Create mandate owner user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const mandateOwnerResult = await db
            .insert(users)
            .values({
                email: 'owner@test.com',
                name: 'John Owner',
                passwordHash: hashedPassword,
                role: 'mandate_owner',
            })
            .returning();

        const mandateOwner = mandateOwnerResult[0];
        console.log('✓ Created mandate owner:', mandateOwner.email);

        // Create attesters
        const attesterResults = await db
            .insert(users)
            .values([
                {
                    email: 'attester1@test.com',
                    name: 'Alice Attester',
                    passwordHash: hashedPassword,
                    role: 'attester',
                },
                {
                    email: 'attester2@test.com',
                    name: 'Bob Attester',
                    passwordHash: hashedPassword,
                    role: 'attester',
                },
                {
                    email: 'attester3@test.com',
                    name: 'Carol Attester',
                    passwordHash: hashedPassword,
                    role: 'attester',
                },
            ])
            .returning();

        console.log('✓ Created 3 attesters');

        // Create mandates
        const mandateResults = await db
            .insert(mandates)
            .values([
                {
                    name: 'Engineering Compliance',
                    description: 'Annual engineering compliance certification',
                    ownerId: mandateOwner.id,
                    status: 'open',
                },
                {
                    name: 'Security Audit 2026',
                    description: 'Quarterly security compliance audit',
                    ownerId: mandateOwner.id,
                    status: 'open',
                },
            ])
            .returning();

        console.log('✓ Created 2 mandates');

        // Create certifications with different statuses
        const certificationResults = await db
            .insert(certifications)
            .values([
                {
                    mandateId: mandateResults[0].id,
                    title: 'Q1 Engineering Compliance',
                    description: 'First quarter compliance certification',
                    status: 'open',
                    questions: [
                        {
                            id: '1',
                            question: 'Have you completed code review training?',
                            type: 'yes_no',
                            allow_comments: true,
                            required: true,
                        },
                        {
                            id: '2',
                            question: 'Are all your systems up to date?',
                            type: 'yes_no',
                            allow_comments: false,
                            required: true,
                        },
                    ],
                    createdBy: mandateOwner.id,
                    publishedAt: new Date(),
                },
                {
                    mandateId: mandateResults[0].id,
                    title: 'Q2 Engineering Compliance',
                    description: 'Second quarter compliance certification',
                    status: 'draft',
                    questions: [
                        {
                            id: '1',
                            question: 'Draft question 1',
                            type: 'text',
                            required: true,
                        },
                    ],
                    createdBy: mandateOwner.id,
                },
                {
                    mandateId: mandateResults[1].id,
                    title: 'Security Policies Review',
                    description: 'Review of security policies and procedures',
                    status: 'open',
                    questions: [
                        {
                            id: '1',
                            question: 'Have you reviewed the security policies?',
                            type: 'yes_no',
                            allow_comments: true,
                            required: true,
                        },
                    ],
                    createdBy: mandateOwner.id,
                    publishedAt: new Date(),
                },
                {
                    mandateId: mandateResults[1].id,
                    title: 'Completed Security Audit',
                    description: 'Previous quarter audit - completed',
                    status: 'closed',
                    questions: [
                        {
                            id: '1',
                            question: 'Security question',
                            type: 'yes_no',
                            required: true,
                        },
                    ],
                    createdBy: mandateOwner.id,
                    publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    closedAt: new Date(),
                },
            ])
            .returning();

        console.log('✓ Created 4 certifications');

        // Assign attesters to open certifications
        const openCert1 = certificationResults[0]; // Q1 Engineering
        const openCert2 = certificationResults[2]; // Security Policies

        await db.insert(certificationAssignments).values([
            { certificationId: openCert1.id, attesterId: attesterResults[0].id },
            { certificationId: openCert1.id, attesterId: attesterResults[1].id },
            { certificationId: openCert1.id, attesterId: attesterResults[2].id },
            { certificationId: openCert2.id, attesterId: attesterResults[0].id },
            { certificationId: openCert2.id, attesterId: attesterResults[1].id },
        ]);

        console.log('✓ Assigned attesters to open certifications');

        // Create some completed responses
        await db.insert(attestationResponses).values([
            {
                certificationId: openCert1.id,
                attesterId: attesterResults[0].id,
                responses: [
                    { question_id: '1', answer: true, comments: 'Yes, completed training' },
                    { question_id: '2', answer: true },
                ],
                status: 'submitted',
                submittedAt: new Date(),
            },
            {
                certificationId: openCert1.id,
                attesterId: attesterResults[1].id,
                responses: [
                    { question_id: '1', answer: true },
                    { question_id: '2', answer: false, comments: 'Updating systems this week' },
                ],
                status: 'submitted',
                submittedAt: new Date(),
            },
            {
                certificationId: openCert2.id,
                attesterId: attesterResults[0].id,
                responses: [{ question_id: '1', answer: true, comments: 'Reviewed all policies' }],
                status: 'submitted',
                submittedAt: new Date(),
            },
        ]);

        console.log('✓ Created attestation responses');

        console.log('\n✅ Test data created successfully!');
        console.log('\nTest credentials:');
        console.log('Mandate Owner: owner@test.com / password123');
        console.log('Attesters: attester1@test.com, attester2@test.com, attester3@test.com / password123');

        process.exit(0);
    } catch (error) {
        console.error('Error creating test data:', error);
        process.exit(1);
    }
}

createTestData();
