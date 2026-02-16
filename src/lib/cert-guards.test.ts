
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertCertNotClosed, AppError } from './cert-guards';
import { db } from '@/db';

// Mock the db module
vi.mock('@/db', () => ({
    db: {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn(),
    },
}));

describe('assertCertNotClosed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not throw if certification is open', async () => {
        // Mock db response for open cert
        (db.limit as any).mockResolvedValue([{ status: 'open' }]);

        await expect(assertCertNotClosed('cert-123')).resolves.not.toThrow();
    });

    it('should not throw if certification is scheduled', async () => {
        // Mock db response for scheduled cert
        (db.limit as any).mockResolvedValue([{ status: 'scheduled' }]);

        await expect(assertCertNotClosed('cert-123')).resolves.not.toThrow();
    });

    it('should throw AppError(400) if certification is closed', async () => {
        // Mock db response for closed cert
        (db.limit as any).mockResolvedValue([{ status: 'closed' }]);

        await expect(assertCertNotClosed('cert-123')).rejects.toThrow(AppError);
        await expect(assertCertNotClosed('cert-123')).rejects.toThrow('Cannot modify assignments on a closed certification');

        try {
            await assertCertNotClosed('cert-123');
        } catch (error: any) {
            expect(error.status).toBe(400);
        }
    });

    it('should throw AppError(404) if certification not found', async () => {
        // Mock db response for missing cert (empty array)
        (db.limit as any).mockResolvedValue([]);

        await expect(assertCertNotClosed('cert-123')).rejects.toThrow(AppError);
        await expect(assertCertNotClosed('cert-123')).rejects.toThrow('Certification not found');

        try {
            await assertCertNotClosed('cert-123');
        } catch (error: any) {
            expect(error.status).toBe(404);
        }
    });
});
