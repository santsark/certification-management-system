"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Save, Send, Clock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import DeadlineBadge from "@/components/DeadlineBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface Question {
    id: string;
    question: string;
    type: 'yes_no' | 'dropdown' | 'multiple_choice' | 'text' | 'date';
    options?: string[];
    allow_comments?: boolean;
    required: boolean;
}

interface Answer {
    question_id: string;
    answer: any;
    comments?: string;
}

interface AttestationData {
    certification: {
        id: string;
        title: string;
        description: string;
        status: string;
        deadline: string | null;
        questions: Question[];
    };
    mandate: {
        name: string;
    };
    response: {
        id: string;
        status: string;
        answers: Answer[];
        lastSavedAt: string;
        submittedAt: string | null;
    } | null;
    readonly: boolean;
}

export default function AttestationFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const certId = resolvedParams.id;

    const [data, setData] = useState<AttestationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autoSaving, setAutoSaving] = useState(false);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    const { watch, setValue, getValues } = useForm<{ answers: Record<string, any> }>({
        defaultValues: { answers: {} }
    });

    const answers = watch('answers');
    const debouncedAnswers = useDebounce(answers, 30000);

    useEffect(() => {
        fetchData();
    }, [certId]);

    async function fetchData() {
        try {
            const res = await fetch(`/api/attester/certifications/${certId}`);
            if (!res.ok) throw new Error('Failed to load certification');

            const responseData: AttestationData = await res.json();
            setData(responseData);

            // Populate form with existing answers
            if (responseData.response?.answers) {
                const answersMap: Record<string, any> = {};
                responseData.response.answers.forEach((a: Answer) => {
                    answersMap[a.question_id] = {
                        answer: a.answer,
                        comments: a.comments || ''
                    };
                });
                setValue('answers', answersMap);
            }

            if (responseData.response?.lastSavedAt) {
                setLastSaved(new Date(responseData.response.lastSavedAt));
            }
        } catch (error) {
            console.error('Error fetching certification:', error);
            toast.error('Failed to load certification');
        } finally {
            setLoading(false);
        }
    }

    // Auto-save effect
    useEffect(() => {
        if (!data || data.readonly || !hasChanges) return;

        async function autoSave() {
            setAutoSaving(true);
            try {
                const formAnswers = getValues('answers');
                const answersArray = prepareAnswersForSubmit(formAnswers);

                const res = await fetch(`/api/attester/certifications/${certId}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answers: answersArray }),
                });

                if (res.ok) {
                    const result = await res.json();
                    setLastSaved(new Date(result.lastSavedAt));
                    setHasChanges(false);
                }
            } catch (error) {
                console.error('Auto-save error:', error);
            } finally {
                setAutoSaving(false);
            }
        }

        autoSave();
    }, [debouncedAnswers]);

    function prepareAnswersForSubmit(formAnswers: Record<string, any>): Answer[] {
        return Object.entries(formAnswers).map(([questionId, value]) => ({
            question_id: questionId,
            answer: value?.answer !== undefined ? value.answer : value,
            comments: value?.comments || undefined,
        }));
    }

    async function handleSave() {
        setSaving(true);
        try {
            const formAnswers = getValues('answers');
            const answersArray = prepareAnswersForSubmit(formAnswers);

            const res = await fetch(`/api/attester/certifications/${certId}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: answersArray }),
            });

            if (!res.ok) throw new Error('Failed to save');

            const result = await res.json();
            setLastSaved(new Date(result.lastSavedAt));
            setHasChanges(false);
            toast.success('Progress saved');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save progress');
        } finally {
            setSaving(false);
        }
    }

    async function handleSubmit() {
        setSubmitting(true);
        try {
            const formAnswers = getValues('answers');
            const answersArray = prepareAnswersForSubmit(formAnswers);

            const res = await fetch(`/api/attester/certifications/${certId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: answersArray }),
            });

            const result = await res.json();

            if (!res.ok) {
                if (result.fieldErrors) {
                    Object.entries(result.fieldErrors).forEach(([field, error]) => {
                        toast.error(`${error}`);
                    });
                } else {
                    throw new Error(result.error || 'Failed to submit');
                }
                return;
            }

            toast.success('Attestation submitted successfully!');
            setTimeout(() => router.push('/attester/dashboard'), 1000);
        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error.message || 'Failed to submit attestation');
        } finally {
            setSubmitting(false);
            setShowSubmitDialog(false);
        }
    }

    function handleAnswerChange(questionId: string, value: any, isComment: boolean = false) {
        const currentAnswer = getValues(`answers.${questionId}`) || {};

        if (isComment) {
            setValue(`answers.${questionId}`, { ...currentAnswer, comments: value });
        } else {
            setValue(`answers.${questionId}`, { ...currentAnswer, answer: value });
        }
        setHasChanges(true);
    }

    function calculateProgress() {
        if (!data) return 0;
        const totalQuestions = data.certification.questions.length;
        if (totalQuestions === 0) return 0;

        const answeredQuestions = data.certification.questions.filter(q => {
            const answer = answers[q.id]?.answer;
            return answer !== null && answer !== undefined && answer !== '';
        }).length;

        return Math.round((answeredQuestions / totalQuestions) * 100);
    }

    function allRequiredAnswered() {
        if (!data) return false;

        return data.certification.questions
            .filter(q => q.required)
            .every(q => {
                const answer = answers[q.id]?.answer;
                if (answer === null || answer === undefined || answer === '') return false;
                if (q.type === 'multiple_choice' && (!Array.isArray(answer) || answer.length === 0)) return false;
                return true;
            });
    }

    function renderQuestion(question: Question, index: number) {
        const currentAnswer = answers[question.id] || {};
        const readonly = data?.readonly || false;

        return (
            <Card key={question.id} className="break-inside-avoid">
                <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span className="flex-1">
                            {question.question}
                            {question.required && <span className="text-destructive ml-1">*</span>}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {question.type === 'yes_no' && (
                        <>
                            <RadioGroup
                                value={currentAnswer.answer?.toString()}
                                onValueChange={(value) => handleAnswerChange(question.id, value === 'true')}
                                disabled={readonly}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="true" id={`${question.id}-yes`} />
                                    <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="false" id={`${question.id}-no`} />
                                    <Label htmlFor={`${question.id}-no`}>No</Label>
                                </div>
                            </RadioGroup>
                            {question.allow_comments && (
                                <div className="space-y-2">
                                    <Label htmlFor={`${question.id}-comments`}>Comments (optional)</Label>
                                    <Textarea
                                        id={`${question.id}-comments`}
                                        value={currentAnswer.comments || ''}
                                        onChange={(e) => handleAnswerChange(question.id, e.target.value, true)}
                                        disabled={readonly}
                                        placeholder="Add any comments..."
                                        rows={3}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {question.type === 'dropdown' && (
                        <Select
                            value={currentAnswer.answer || ''}
                            onValueChange={(value) => handleAnswerChange(question.id, value)}
                            disabled={readonly}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                                {question.options?.map(option => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {question.type === 'multiple_choice' && (
                        <div className="space-y-3">
                            {question.options?.map(option => {
                                const isChecked = Array.isArray(currentAnswer.answer) && currentAnswer.answer.includes(option);
                                return (
                                    <div key={option} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${question.id}-${option}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                                const current = Array.isArray(currentAnswer.answer) ? currentAnswer.answer : [];
                                                const updated = checked
                                                    ? [...current, option]
                                                    : current.filter((o: string) => o !== option);
                                                handleAnswerChange(question.id, updated);
                                            }}
                                            disabled={readonly}
                                        />
                                        <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {question.type === 'text' && (
                        <Textarea
                            value={currentAnswer.answer || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            disabled={readonly}
                            placeholder="Enter your response..."
                            rows={4}
                        />
                    )}

                    {question.type === 'date' && (
                        <input
                            type="date"
                            value={currentAnswer.answer || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            disabled={readonly}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    )}
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="py-12">
                        <p className="text-center text-muted-foreground">Certification not found</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progress = calculateProgress();
    const canSubmit = allRequiredAnswered() && !data.readonly;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Link href="/attester/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">{data.certification.title}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{data.mandate.name}</Badge>
                            <DeadlineBadge deadline={data.certification.deadline ? new Date(data.certification.deadline) : null} />
                            {data.response?.status === 'submitted' && (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Submitted
                                </Badge>
                            )}
                            {data.certification.status === 'closed' && (
                                <Badge variant="secondary">Closed</Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Overdue Banner */}
                {data.certification.deadline && new Date(data.certification.deadline) < new Date() && data.response?.status !== 'submitted' && (
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="py-4 flex items-center gap-3 text-red-800">
                            <AlertTriangle className="h-5 w-5" />
                            <div>
                                <p className="font-semibold">This attestation is overdue!</p>
                                <p className="text-sm">The deadline was {new Date(data.certification.deadline).toLocaleDateString()}. Please submit your response as soon as possible.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {data.certification.description && (
                    <p className="text-muted-foreground">{data.certification.description}</p>
                )}

                {/* Progress and Save Status */}
                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-medium">{progress}% Complete</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                {lastSaved ? (
                                    <>Last saved: {lastSaved.toLocaleString()}</>
                                ) : (
                                    <>Not saved yet</>
                                )}
                            </div>
                            {autoSaving && (
                                <span className="text-muted-foreground italic">Auto-saving...</span>
                            )}
                            {!autoSaving && hasChanges && !data.readonly && (
                                <span className="text-orange-600 text-xs">Unsaved changes</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Read-only messages */}
                {data.readonly && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-6">
                            <p className="text-blue-900 font-medium">
                                {data.response?.status === 'submitted'
                                    ? `You submitted this attestation on ${data.response.submittedAt ? new Date(data.response.submittedAt).toLocaleDateString() : 'an earlier date'}`
                                    : 'This certification is closed and no longer accepting responses'}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {data.certification.questions.map((question, index) => renderQuestion(question, index))}
            </div>

            {/* Action Buttons */}
            {!data.readonly && (
                <div className="flex gap-3 sticky bottom-6 bg-background/95 backdrop-blur p-4 rounded-lg border shadow-lg">
                    <Button
                        onClick={handleSave}
                        disabled={saving || autoSaving}
                        variant="outline"
                        className="flex-1"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Progress'}
                    </Button>
                    <Button
                        onClick={() => setShowSubmitDialog(true)}
                        disabled={!canSubmit || submitting}
                        className="flex-1"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Attestation
                    </Button>
                </div>
            )}

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit Attestation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to submit? You cannot edit your responses after submission.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Confirm Submit'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
