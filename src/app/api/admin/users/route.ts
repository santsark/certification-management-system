import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { sql, like, or, eq } from 'drizzle-orm';
import { requireAdmin, generatePassword } from '@/lib/admin-auth';
import { hashPassword } from '@/lib/auth';
import { createUserSchema } from '@/lib/schemas';

// GET /api/admin/users - List all users with optional filters
export async function GET(request: NextRequest) {
    try {
        await requireAdmin();

        const searchParams = request.nextUrl.searchParams;
        const roleFilter = searchParams.get('role');
        const searchQuery = searchParams.get('search');

        let query = db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            mustChangePassword: users.mustChangePassword,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        }).from(users).$dynamic();

        // Apply filters
        const conditions = [];

        if (roleFilter && roleFilter !== 'all') {
            conditions.push(eq(users.role, roleFilter as any));
        }

        if (searchQuery) {
            conditions.push(
                or(
                    sql`LOWER(${users.name}) LIKE LOWER(${`%${searchQuery}%`})`,
                    sql`LOWER(${users.email}) LIKE LOWER(${`%${searchQuery}%`})`
                )
            );
        }

        if (conditions.length > 0) {
            query = query.where(sql`${sql.join(conditions, sql` AND `)}`);
        }

        const usersList = await query.orderBy(sql`${users.createdAt} DESC`);

        return NextResponse.json({ users: usersList });
    } catch (error: any) {
        console.error('Get users error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const body = await request.json();

        // Validate request body
        const validationResult = createUserSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { email, name, role } = validationResult.data;

        // Check if email already exists
        const [existingUser] = await db
            .select()
            .from(users)
            .where(sql`LOWER(${users.email}) = LOWER(${email})`)
            .limit(1);

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            );
        }

        // Generate password
        const generatedPassword = generatePassword();
        const passwordHash = await hashPassword(generatedPassword);

        // Create user
        const [newUser] = await db
            .insert(users)
            .values({
                email,
                name,
                role,
                passwordHash,
                mustChangePassword: true,
            })
            .returning({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                mustChangePassword: users.mustChangePassword,
                createdAt: users.createdAt,
            });

        return NextResponse.json({
            user: newUser,
            generatedPassword, // Return password only in this response
        }, { status: 201 });
    } catch (error: any) {
        console.error('Create user error:', error);

        if (error.message?.includes('Unauthorized')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (error.message?.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}
