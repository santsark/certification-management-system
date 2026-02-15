'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { CertificationQuestion } from '@/lib/validations/certification';

interface AIAssistantProps {
    onQuestionsGenerated: (questions: CertificationQuestion[]) => void;
}

export function AIAssistant({ onQuestionsGenerated }: AIAssistantProps) {
    const [requirement, setRequirement] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<CertificationQuestion[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleGenerate = async () => {
        if (!requirement.trim()) {
            setError('Please enter a requirement description');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const response = await fetch('/api/ai/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requirement }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate questions');
            }

            const data = await response.json();

            // Add client-side IDs to questions
            const questionsWithIds = data.questions.map((q: any, index: number) => ({
                ...q,
                id: `ai-${Date.now()}-${index}`,
            }));

            setGeneratedQuestions(questionsWithIds);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseQuestions = () => {
        if (generatedQuestions) {
            onQuestionsGenerated(generatedQuestions);
            setGeneratedQuestions(null);
            setRequirement('');
        }
    };

    const handleRegenerate = () => {
        setGeneratedQuestions(null);
        handleGenerate();
    };

    const getQuestionTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            yes_no: 'Yes/No',
            dropdown: 'Dropdown',
            multiple_choice: 'Multiple Choice',
            text: 'Text',
            date: 'Date',
        };
        return labels[type] || type;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        <CardTitle>AI Assistant</CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                </div>
                <CardDescription>
                    Describe your requirements and let AI generate relevant questions
                </CardDescription>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Requirement Description
                        </label>
                        <Textarea
                            placeholder="Example: I need to ensure all engineers have completed security training and are following secure coding practices..."
                            value={requirement}
                            onChange={(e) => setRequirement(e.target.value)}
                            rows={4}
                            disabled={isGenerating}
                        />
                        <p className="text-xs text-muted-foreground">
                            Be specific about what you want attesters to certify. The AI will generate 3-5 relevant questions.
                        </p>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {!generatedQuestions && (
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || !requirement.trim()}
                            className="w-full"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Questions...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Questions with AI
                                </>
                            )}
                        </Button>
                    )}

                    {generatedQuestions && (
                        <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold">Generated Questions ({generatedQuestions.length})</h4>
                                <Badge variant="secondary">AI Generated</Badge>
                            </div>

                            <div className="space-y-3">
                                {generatedQuestions.map((q, index) => (
                                    <div key={q.id} className="border rounded p-3 bg-background">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <p className="text-sm font-medium flex-1">
                                                {index + 1}. {q.question}
                                            </p>
                                            <Badge variant="outline" className="shrink-0">
                                                {getQuestionTypeLabel(q.type)}
                                            </Badge>
                                        </div>

                                        {q.options && q.options.length > 0 && (
                                            <div className="text-xs text-muted-foreground mt-2">
                                                Options: {q.options.join(', ')}
                                            </div>
                                        )}

                                        <div className="flex gap-2 mt-2">
                                            {q.required && (
                                                <Badge variant="secondary" className="text-xs">Required</Badge>
                                            )}
                                            {q.allow_comments && (
                                                <Badge variant="secondary" className="text-xs">Comments Allowed</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleUseQuestions} className="flex-1">
                                    Use These Questions
                                </Button>
                                <Button onClick={handleRegenerate} variant="outline" disabled={isGenerating}>
                                    {isGenerating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        'Regenerate'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
