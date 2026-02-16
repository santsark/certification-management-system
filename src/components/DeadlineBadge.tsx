import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { getDeadlineStatus } from '@/lib/deadline';
import { cn } from '@/lib/utils';

interface DeadlineBadgeProps {
    deadline: Date | null;
    size?: 'sm' | 'md';
    className?: string;
}

export default function DeadlineBadge({ deadline, size = 'md', className }: DeadlineBadgeProps) {
    const { status, label, variant } = getDeadlineStatus(deadline);

    if (status === 'none') {
        return null; // Or render a gray badge if preferred, but usually no badge is better for no deadline
    }

    const colorClasses = {
        destructive: 'bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20',
        warning: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
        success: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    };

    const sizeClasses = {
        sm: 'text-[10px] px-1.5 py-0.5 [&>svg]:size-2.5',
        md: 'text-xs px-2.5 py-0.5 [&>svg]:size-3',
    };

    return (
        <Badge
            variant="outline" // Use outline as base to minimize default style interference
            className={cn(
                'font-normal border',
                colorClasses[variant as keyof typeof colorClasses],
                sizeClasses[size],
                className
            )}
        >
            <Clock className="mr-1 inline-block" />
            {label}
        </Badge>
    );
}
