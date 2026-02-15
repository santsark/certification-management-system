
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { certificationAssignments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireMandateOwner();
        const { id: certId } = await params;

        const assignments = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                assignedAt: certificationAssignments.assignedAt,
            })
            .from(certificationAssignments)
            .innerJoin(users, eq(certificationAssignments.attesterId, users.id))
            .where(eq(certificationAssignments.certificationId, certId));

        return NextResponse.json(assignments);
    } catch (error) {
        console.error('Get assignments error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch assignments' },
            { status: 500 }
        );
    }
}
