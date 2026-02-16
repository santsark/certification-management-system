'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AIAssistant } from '@/components/certification/AIAssistant';
import { QuestionBuilder } from '@/components/certification/QuestionBuilder';
import { certificationFormSchema, type CertificationFormData, type CertificationQuestion } from '@/lib/validations/certification';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import DeadlineBadge from '@/components/DeadlineBadge';

interface Mandate {
    id: string;
    name: string;
}

interface CertificationData {
    id: string;
    mandateId: string;
    title: string;
    description: string | null;
    status: string;
    questions: any[];
    publishedAt: Date | null;
    deadline?: Date | string | null;
}

export default function EditCertificationPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const certId = resolvedParams.id;

    const router = useRouter();
    const { toast } = useToast();
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [certification, setCertification] = useState<CertificationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<CertificationFormData>({
        resolver: zodResolver(certificationFormSchema),
        defaultValues: {
            mandateId: '',
            title: '',
            description: '',
            questions: [],
            deadline: null,
        },
    });

    // Fetch mandates and certification data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch mandates
                const mandatesResponse = await fetch('/api/mandate-owner/mandates');
                if (!mandatesResponse.ok) throw new Error('Failed to fetch mandates');
                const mandatesData = await mandatesResponse.json();
                setMandates(mandatesData);

                // Fetch certification
                const certResponse = await fetch(`/api/mandate-owner/certifications/${certId}`);
                if (!certResponse.ok) throw new Error('Failed to fetch certification');
                const certData = await certResponse.json();
                setCertification(certData);

                // Populate form
                reset({
                    mandateId: certData.mandateId,
                    title: certData.title,
                    description: certData.description || '',
                    questions: certData.questions || [],
                    deadline: certData.deadline ? new Date(certData.deadline).toISOString() : null,
                });
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to load certification',
                    variant: 'destructive',
                });
                router.push('/mandate-owner/certifications');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [certId, reset, router, toast]);

    const handleAIQuestionsGenerated = (questions: CertificationQuestion[]) => {
        const currentQuestions = watch('questions') || [];
        const availableSlots = 5 - currentQuestions.length;

        if (availableSlots <= 0) {
            toast({
                title: 'Cannot add questions',
                description: 'You have reached the maximum of 5 questions',
                variant: 'destructive',
            });
            return;
        }

        const questionsToAdd = questions.slice(0, availableSlots);
        setValue('questions', [...currentQuestions, ...questionsToAdd]);

        toast({
            title: 'Questions added',
            description: `Added ${questionsToAdd.length} AI-generated question(s)`,
        });
    };

    const onSubmit = async (data: CertificationFormData, publish: boolean = false) => {
        if (publish) {
            setIsPublishing(true);
        } else {
            setIsSaving(true);
        }

        try {
            // Update certification
            const response = await fetch(`/api/mandate-owner/certifications/${certId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update certification');
            }

            // If publishing and was draft, call publish endpoint
            if (publish && certification?.status === 'draft') {
                const publishResponse = await fetch(
                    `/api/mandate-owner/certifications/${certId}/publish`,
                    {
                        method: 'POST',
                    }
                );

                if (!publishResponse.ok) {
                    throw new Error('Failed to publish certification');
                }
            }

            toast({
                title: publish && certification?.status === 'draft' ? 'Certification published' : 'Changes saved',
                description: publish && certification?.status === 'draft'
                    ? 'Certification has been published and attesters will be notified'
                    : 'Your changes have been saved',
            });

            router.push('/mandate-owner/certifications');
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
            setIsPublishing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container max-w-4xl mx-auto py-8">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    const isPublished = certification?.status === 'open' || certification?.status === 'closed';

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Edit Certification</h1>
                    <p className="text-muted-foreground">
                        Modify certification details and questions
                    </p>
                </div>
                <Button
                    variant="ghost"
                    onClick={() => router.push('/mandate-owner/certifications')}
                >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                </Button>
            </div>

            {isPublished && (
                <Alert className="border-yellow-500">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <AlertDescription>
                        This certification has been published. Any changes you make will update the live certification
                        and may affect attesters who are currently completing it.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit((data) => onSubmit(data, false))} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>
                            Select the mandate and provide certification details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="mandate">Mandate *</Label>
                            <Select
                                value={watch('mandateId')}
                                onValueChange={(value) => setValue('mandateId', value)}
                            >
                                <SelectTrigger id="mandate">
                                    <SelectValue placeholder="Select a mandate" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mandates.map((mandate) => (
                                        <SelectItem key={mandate.id} value={mandate.id}>
                                            {mandate.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.mandateId && (
                                <p className="text-sm text-destructive">{errors.mandateId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                {...register('title')}
                                placeholder="Q1 2026 Security Compliance"
                            />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                {...register('description')}
                                placeholder="Optional description of the certification requirements..."
                                rows={3}
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            )}
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <Label>Attestation Deadline</Label>
                            <div className="flex items-center gap-4">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[240px] pl-3 text-left font-normal",
                                                !watch('deadline') && "text-muted-foreground"
                                            )}
                                        >
                                            {watch('deadline') ? (
                                                format(new Date(watch('deadline')!), "PPP")
                                            ) : (
                                                <span>Select a deadline (required to publish)</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={watch('deadline') ? new Date(watch('deadline')!) : undefined}
                                            onSelect={(date) => setValue('deadline', date ? date.toISOString() : null)}
                                            disabled={(date) => {
                                                const today = new Date(new Date().setHours(0, 0, 0, 0));
                                                // If open and has a deadline, cannot select earlier than current deadline (unless extending)
                                                // Requirement: "If certification is open, allow deadline to be extended (not moved earlier)"
                                                // Wait, the requirement says "not moved earlier". This implies stricter check.
                                                // But UI disabled check handles individual dates.
                                                // If status is open, disable all dates before (original deadline OR today).

                                                if (certification?.status === 'open' && certification.deadline) {
                                                    const currentDeadline = new Date(certification.deadline);
                                                    // If selecting a new date, it must be >= currentDeadline
                                                    // Also must be >= today (implicitly covered if currentDeadline >= today, but if passed...)
                                                    return date < currentDeadline || date < today;
                                                }
                                                return date < today;
                                            }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {watch('deadline') && (
                                    <DeadlineBadge deadline={new Date(watch('deadline')!)} />
                                )}
                            </div>
                            {errors.deadline && (
                                <p className="text-sm text-destructive">{errors.deadline.message}</p>
                            )}
                            <p className="text-[0.8rem] text-muted-foreground">
                                {certification?.status === 'open'
                                    ? "For published certifications, deadlines can only be extended."
                                    : "Only certifications with a deadline can be published."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {certification?.status === 'draft' && (
                    <AIAssistant onQuestionsGenerated={handleAIQuestionsGenerated} />
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Question Builder</CardTitle>
                        <CardDescription>
                            Create questions for attesters to answer
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <QuestionBuilder
                            control={control}
                            register={register}
                            watch={watch}
                            setValue={setValue}
                        />
                        {errors.questions && (
                            <p className="text-sm text-destructive mt-2">
                                {errors.questions.message || 'At least one question is required'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="flex gap-3 justify-end sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border rounded-lg">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/mandate-owner/certifications')}
                        disabled={isSaving || isPublishing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="secondary"
                        disabled={isSaving || isPublishing}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                    {certification?.status === 'draft' && (
                        <Button
                            type="button"
                            onClick={handleSubmit((data) => onSubmit(data, true))}
                            disabled={isSaving || isPublishing}
                        >
                            {isPublishing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Publishing...
                                </>
                            ) : (
                                'Save and Publish'
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
