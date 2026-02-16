import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDeadlineStatus } from './deadline';
import { addDays, subDays } from 'date-fns';

describe('getDeadlineStatus', () => {
    let systemTime: Date;

    beforeEach(() => {
        // Mock system time to a fixed date
        systemTime = new Date(2024, 0, 15); // Jan 15, 2024
        vi.useFakeTimers();
        vi.setSystemTime(systemTime);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return "none" status for null deadline', () => {
        const result = getDeadlineStatus(null);
        expect(result).toEqual({
            status: 'none',
            label: 'No deadline',
            variant: 'secondary'
        });
    });

    it('should return "overdue" status for past date', () => {
        const pastDate = subDays(systemTime, 1);
        const result = getDeadlineStatus(pastDate);
        expect(result).toEqual({
            status: 'overdue',
            label: 'Overdue',
            variant: 'destructive'
        });
    });

    it('should return "warning" (Due today) for today', () => {
        const today = systemTime;
        const result = getDeadlineStatus(today);
        expect(result).toEqual({
            status: 'warning',
            label: 'Due today',
            variant: 'warning'
        });
    });

    it('should return "warning" (1 day left) for tomorrow', () => {
        const tomorrow = addDays(systemTime, 1);
        const result = getDeadlineStatus(tomorrow);
        expect(result).toEqual({
            status: 'warning',
            label: '1 days left',
            variant: 'warning'
        });
    });

    it('should return "warning" (3 days left) for +3 days', () => {
        const threeDaysLater = addDays(systemTime, 3);
        const result = getDeadlineStatus(threeDaysLater);
        expect(result).toEqual({
            status: 'warning',
            label: '3 days left',
            variant: 'warning'
        });
    });

    it('should return "ok" for more than 3 days in future', () => {
        const fourDaysLater = addDays(systemTime, 4);
        const result = getDeadlineStatus(fourDaysLater);

        // Expected label format: Due DD MMM YYYY
        // Jan 19, 2024
        expect(result).toEqual({
            status: 'ok',
            label: 'Due 19 Jan 2024',
            variant: 'success'
        });
    });
});
