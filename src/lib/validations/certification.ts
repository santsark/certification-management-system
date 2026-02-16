import { z } from 'zod';

export const questionTypeEnum = z.enum(['yes_no', 'dropdown', 'multiple_choice', 'text', 'date']);

export const certificationQuestionSchema = z.object({
    id: z.string(),
    question: z.string().min(1, 'Question text is required'),
    type: questionTypeEnum,
    options: z.array(z.string()).optional(),
    allow_comments: z.boolean().optional(),
    required: z.boolean(),
}).refine((data) => {
    // Dropdown and multiple choice must have options
    if ((data.type === 'dropdown' || data.type === 'multiple_choice') && (!data.options || data.options.length < 2)) {
        return false;
    }
    return true;
}, {
    message: 'Dropdown and multiple choice questions must have at least 2 options',
});

export const certificationFormSchema = z.object({
    mandateId: z.string().uuid('Please select a valid mandate'),
    title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
    description: z.string().optional(),
    questions: z.array(certificationQuestionSchema).min(1, 'At least one question is required').max(5, 'Maximum 5 questions allowed'),
    deadline: z.string().optional().nullable(),
});

export type CertificationQuestion = z.infer<typeof certificationQuestionSchema>;
export type CertificationFormData = z.infer<typeof certificationFormSchema>;
