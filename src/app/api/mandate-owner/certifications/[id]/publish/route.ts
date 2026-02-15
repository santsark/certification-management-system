import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certifications, mandates } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireMandateOwner();
        const { id: certId } = await params;

        // Fetch certification
        const cert = await db.query.certifications.findFirst({
            where: eq(certifications.id, certId),
        });

        if (!cert) {
            return NextResponse.json(
                { error: 'Certification not found' },
                { status: 404 }
            );
        }

        // Verify user owns the mandate
        const mandate = await db.query.mandates.findFirst({
            where: and(
                eq(mandates.id, cert.mandateId),
                or(
                    eq(mandates.ownerId, user.id),
                    eq(mandates.backupOwnerId, user.id)
                )
            ),
        });

        if (!mandate) {
            return NextResponse.json(
                { error: 'You do not have permission to publish this certification' },
                { status: 403 }
            );
        }

        // Check if already published
        if (cert.status === 'open' || cert.status === 'closed') {
            return NextResponse.json(
                { error: 'Certification is already published' },
                { status: 400 }
            );
        }

        // Validate certification has questions
        const questions = cert.questions as any;
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json(
                { error: 'Cannot publish certification without questions' },
                { status: 400 }
            );
        }

        // Update status to open and set published_at
        const result = await db
            .update(certifications)
            .set({
                status: 'open',
                publishedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(certifications.id, certId))
            .returning();

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error('Publish certification error:', error);
        return NextResponse.json(
            { error: 'Failed to publish certification' },
            { status: 500 }
        );
    }
}
