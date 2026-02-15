'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AIAssistant } from '@/components/certification/AIAssistant';
import { QuestionBuilder } from '@/components/certification/QuestionBuilder';
import { certificationFormSchema, type CertificationFormData, type CertificationQuestion } from '@/lib/validations/certification';
import { v4 as uuidv4 } from 'uuid';

interface Mandate {
    id: string;
    name: string;
}

export default function NewCertificationPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [isLoadingMandates, setIsLoadingMandates] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CertificationFormData>({
        resolver: zodResolver(certificationFormSchema),
        defaultValues: {
            mandateId: '',
            title: '',
            description: '',
            questions: [],
        },
    });

    // Fetch mandates on mount
    useEffect(() => {
        const fetchMandates = async () => {
            try {
                const response = await fetch('/api/mandate-owner/mandates');
                if (!response.ok) throw new Error('Failed to fetch mandates');
                const data = await response.json();
                setMandates(data);
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Failed to load mandates',
                    variant: 'destructive',
                });
            } finally {
                setIsLoadingMandates(false);
            }
        };

        fetchMandates();
    }, [toast]);

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
            // Create certification
            const response = await fetch('/api/mandate-owner/certifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create certification');
            }

            const certification = await response.json();

            // If publishing, call publish endpoint
            if (publish) {
                const publishResponse = await fetch(
                    `/api/mandate-owner/certifications/${certification.id}/publish`,
                    {
                        method: 'POST',
                    }
                );

                if (!publishResponse.ok) {
                    throw new Error('Failed to publish certification');
                }
            }

            toast({
                title: publish ? 'Certification published' : 'Draft saved',
                description: publish
                    ? 'Certification has been published and attesters will be notified'
                    : 'Your certification draft has been saved',
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

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Create Certification</h1>
                    <p className="text-muted-foreground">
                        Build a new certification with AI assistance
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
                            {isLoadingMandates ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading mandates...
                                </div>
                            ) : (
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
                            )}
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
                    </CardContent>
                </Card>

                <AIAssistant onQuestionsGenerated={handleAIQuestionsGenerated} />

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
                            'Save as Draft'
                        )}
                    </Button>
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
                </div>
            </form>
        </div>
    );
}
