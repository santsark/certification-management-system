
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireMandateOwner } from '@/lib/mandate-owner-auth';

export async function GET(request: NextRequest) {
    try {
        await requireMandateOwner();

        const searchParams = request.nextUrl.searchParams;
        const role = searchParams.get('role');

        let query = db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
        }).from(users);

        if (role) {
            // Check if role is valid enum
            if (['admin', 'mandate_owner', 'attester'].includes(role)) {
                // @ts-ignore
                query.where(eq(users.role, role));
            }
        }

        // Add where clause if query object supports it directly or compose it
        // Drizzle query building:
        const conditions = [];
        if (role && ['admin', 'mandate_owner', 'attester'].includes(role)) {
            conditions.push(eq(users.role, role as any));
        }

        const result = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
            })
            .from(users)
            .where(conditions.length ? conditions[0] : undefined);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
