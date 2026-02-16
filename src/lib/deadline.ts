import { format, addDays, isBefore, startOfDay } from 'date-fns';

export type DeadlineStatus = 'overdue' | 'warning' | 'ok' | 'none';

export interface DeadlineInfo {
    status: DeadlineStatus;
    label: string;
    variant: 'destructive' | 'warning' | 'success' | 'secondary';
}

export function getDeadlineStatus(deadline: Date | null): DeadlineInfo {
    if (!deadline) {
        return {
            status: 'none',
            label: 'No deadline',
            variant: 'secondary'
        };
    }

    const today = startOfDay(new Date());
    const deadlineDate = startOfDay(new Date(deadline));
    const warningThreshold = addDays(today, 3); // Warning if due within 3 days

    if (isBefore(deadlineDate, today)) {
        return {
            status: 'overdue',
            label: 'Overdue',
            variant: 'destructive'
        };
    }

    if (isBefore(deadlineDate, warningThreshold) || deadlineDate.getTime() === warningThreshold.getTime()) {
        const daysLeft = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
            status: 'warning',
            label: daysLeft === 0 ? 'Due today' : `${daysLeft} days left`,
            variant: 'warning'
        };
    }

    return {
        status: 'ok',
        label: `Due ${format(deadline, 'dd MMM yyyy')}`,
        variant: 'success'
    };
}
