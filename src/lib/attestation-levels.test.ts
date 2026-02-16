import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkLevelUnlock } from './attestation-levels';
import { db } from '@/db'; // This will be the mocked version

// Helper to create a chainable mock
const createMockBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn().mockReturnThis();
    builder.from = vi.fn().mockReturnThis();
    builder.innerJoin = vi.fn().mockReturnThis();
    builder.where = vi.fn().mockReturnThis();
    builder.limit = vi.fn().mockReturnThis();
    builder.then = vi.fn(); // For await
    return builder;
};

vi.mock('@/db', () => ({
    db: {
        select: vi.fn(),
    }
}));

vi.mock('@/db/schema', () => ({
    certificationAssignments: {
        certificationId: 'cert_id',
        attesterId: 'attester_id',
        level: 'level',
        levelGroupId: 'level_group_id',
    },
    attestationResponses: {
        certificationId: 'cert_id',
        attesterId: 'attester_id',
        status: 'status',
        id: 'id',
    },
    users: {},
}));

describe('checkLevelUnlock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should be defined', () => {
        expect(checkLevelUnlock).toBeDefined();
    });

    // Simplest test: Assignment not found
    it('should return false if assignment not found', async () => {
        // Mock chain for FIRST query: db.select(...).from(...).where(...).limit(1)
        const mockBuilder = createMockBuilder();

        // When db.select is called, return builder.
        // When .limit(1) is called, it should resolve to []
        // But since we await the chain, we need the "promise" part to work.
        // We can mock the 'then' method of the builder or the return of the LAST method.

        // In checkLevelUnlock:
        // const [assignment] = await db.select(...)...limit(1);

        // This implies .limit(1) returns a Promise-like object that resolves to [].
        mockBuilder.limit.mockResolvedValue([]);

        (db.select as any).mockReturnValue(mockBuilder);

        const result = await checkLevelUnlock('cert-1', 'user-1');
        expect(result).toEqual({ shouldUnlockL2: false });
    });
});
