"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Question {
    id: string;
    question: string;
    type: 'yes_no' | 'dropdown' | 'multiple_choice' | 'text' | 'date';
    options?: string[];
}

interface Answer {
    question_id: string;
    answer: any;
    comments?: string;
}

interface ResponseData {
    certification: {
        id: string;
        title: string;
    };
    questions: Question[];
    response: {
        status: string;
        answers: Answer[];
        submittedAt: string;
    } | null;
}

export default function AttesterViewResponsePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const certId = resolvedParams.id;

    const [data, setData] = useState<ResponseData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/attester/attestations/${certId}/response`);
                if (!res.ok) throw new Error("Failed to load response");

                const responseData = await res.json();
                setData(responseData);
            } catch (error) {
                console.error("Error fetching response:", error);
                toast.error("Failed to load response");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [certId]);

    const getAnswerForQuestion = (questionId: string) => {
        return data?.response?.answers.find(a => a.question_id === questionId);
    };

    const renderAnswer = (question: Question, answer?: Answer) => {
        if (!answer) return <span className="text-muted-foreground italic">No answer provided</span>;

        const val = answer.answer;

        switch (question.type) {
            case 'yes_no':
                return (
                    <div className="space-y-2">
                        <Badge variant={val === true || val === 'true' ? 'default' : 'destructive'} className={val === true || val === 'true' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}>
                            {val === true || val === 'true' ? 'Yes' : 'No'}
                        </Badge>
                        {answer.comments && (
                            <div className="p-2 bg-muted rounded-md text-sm">
                                <span className="font-semibold text-xs">Comments: </span>
                                {answer.comments}
                            </div>
                        )}
                    </div>
                );
            case 'date':
                return <div>{new Date(val).toLocaleDateString()}</div>;
            case 'multiple_choice':
                return (
                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(val) ? val.map((v: string) => <Badge key={v} variant="outline">{v}</Badge>) : val}
                    </div>
                );
            default:
                return <div className="text-foreground">{String(val)}</div>;
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96">Loading...</div>;
    }

    if (!data || !data.response) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="py-12">
                        <p className="text-center text-muted-foreground">Response not found or not yet submitted</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/attester/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">My Response</h1>
                </div>
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{data.certification.title}</CardTitle>
                            <CardDescription className="mt-2">Your Attestation Response</CardDescription>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                            <div>Submitted on</div>
                            <div className="font-medium text-foreground">
                                {data.response.submittedAt ? new Date(data.response.submittedAt).toLocaleString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 space-y-8">
                    {data.questions.map((question, index) => {
                        const answer = getAnswerForQuestion(question.id);
                        return (
                            <div key={question.id} className="space-y-2 break-inside-avoid">
                                <div className="font-medium text-lg">
                                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                                    {question.question}
                                </div>
                                <div className="pl-6 md:pl-8">
                                    {renderAnswer(question, answer)}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
