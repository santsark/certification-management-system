import { z } from 'zod';

// User schemas
export const createUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'mandate_owner', 'attester'], {
        message: 'Role is required',
    }),
});

export const updateUserSchema = z.object({
    role: z.enum(['admin', 'mandate_owner', 'attester']).optional(),
});

// Mandate schemas
export const createMandateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    ownerId: z.string().uuid('Invalid owner ID'),
    backupOwnerId: z.string().uuid('Invalid backup owner ID').optional(),
    status: z.enum(['open', 'closed']).default('open'),
});

export const updateMandateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    ownerId: z.string().uuid().optional(),
    backupOwnerId: z.string().uuid().optional(),
    status: z.enum(['open', 'closed']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateMandateInput = z.infer<typeof createMandateSchema>;
export type UpdateMandateInput = z.infer<typeof updateMandateSchema>;
