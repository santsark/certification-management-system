'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock, AlertCircle, FileText, Calendar } from 'lucide-react';
import DeadlineBadge from '@/components/DeadlineBadge';

interface Attestation {
    id: string;
    certificationId: string;
    certificationTitle: string;
    certificationDescription: string | null;
    mandateName: string;
    status: 'pending' | 'in_progress' | 'submitted';
    deadline: string | null;
    dueDate: string | null;
    submittedAt: string | null;
    assignedAt: string;
    totalQuestions: number;
    answeredQuestions: number;
    level: number;
    isLocked: boolean;
    l1Progress: {
        total: number;
        submitted: number;
    } | null;
}

export default function AttesterDashboard() {
    const router = useRouter();
    const [attestations, setAttestations] = useState<Attestation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterMandate, setFilterMandate] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('assigned');

    useEffect(() => {
        fetchAttestations();
    }, []);

    async function fetchAttestations() {
        try {
            const res = await fetch('/api/attester/attestations');
            if (!res.ok) throw new Error('Failed to fetch attestations');
            const data = await res.json();
            setAttestations(data.attestations || []);
        } catch (error) {
            console.error('Error fetching attestations:', error);
        } finally {
            setLoading(false);
        }
    }

    // Filter and sort
    const filteredAndSorted = attestations
        .filter(a => filterMandate === 'all' || a.mandateName === filterMandate)
        .sort((a, b) => {
            // Priority:
            // 1. Unlocked & Overdue
            // 2. Unlocked & Warning
            // 3. Unlocked & Normal
            // 4. Locked (Pending)
            // 5. Submitted

            // Helper to get urgency score (lower is more urgent)
            const getUrgencyScore = (item: Attestation) => {
                if (item.status === 'submitted') return 5;
                if (item.isLocked) return 4;

                if (!item.deadline) return 3;
                const now = new Date().getTime();
                const deadline = new Date(item.deadline).getTime();
                if (deadline < now) return 0; // Overdue
                const daysDiff = (deadline - now) / (1000 * 60 * 60 * 24);
                if (daysDiff <= 3) return 1; // Warning
                return 2; // Ok
            };

            const scoreA = getUrgencyScore(a);
            const scoreB = getUrgencyScore(b);

            if (scoreA !== scoreB) return scoreA - scoreB;

            // If scores equal, sort by actual deadline
            if (a.deadline && b.deadline) {
                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }

            if (sortBy === 'assigned') {
                return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
            } else if (sortBy === 'title') {
                return a.certificationTitle.localeCompare(b.certificationTitle);
            }
            return 0;
        });

    // Split into sections
    // 1. Pending (Locked L2)
    // 2. Action Required (Unlocked L1 + Unlocked L2)
    // 3. Completed
    const pending = filteredAndSorted.filter(a => a.status !== 'submitted' && a.isLocked);
    const actionRequired = filteredAndSorted.filter(a => a.status !== 'submitted' && !a.isLocked);
    const completed = filteredAndSorted.filter(a => a.status === 'submitted');

    // Get unique mandates for filter
    const uniqueMandates = Array.from(new Set(attestations.map(a => a.mandateName)));

    // Updated stats
    const totalCount = attestations.length;
    const openCount = attestations.filter(a => a.status !== 'submitted').length;
    const completedCount = attestations.filter(a => a.status === 'submitted').length;

    const truncateText = (text: string | null, maxLength: number) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Certifications</h1>
                <p className="text-muted-foreground mt-2">
                    View and complete your assigned certification attestations
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">All certifications</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Action Required</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{openCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">Submitted</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Filter by Mandate</label>
                    <Select value={filterMandate} onValueChange={setFilterMandate}>
                        <SelectTrigger>
                            <SelectValue placeholder="All mandates" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Mandates</SelectItem>
                            {uniqueMandates.map(mandate => (
                                <SelectItem key={mandate} value={mandate}>{mandate}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="assigned">Assigned Date</SelectItem>
                            <SelectItem value="title">Title</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : (
                <>
                    {/* Pending / Locked Section */}
                    {pending.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-slate-500" />
                                <h2 className="text-2xl font-semibold text-slate-700">Pending — Awaiting Level 1</h2>
                                <Badge variant="secondary">{pending.length}</Badge>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {pending.map((attestation) => (
                                    <Card key={attestation.id} className="bg-slate-50 border-slate-200 opacity-90">
                                        <CardHeader>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg text-slate-700">{attestation.certificationTitle}</CardTitle>
                                                    <CardDescription className="mt-1">
                                                        {attestation.mandateName}
                                                    </CardDescription>
                                                </div>
                                                <Badge variant="outline" className="bg-slate-200 text-slate-600 border-slate-300">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Locked
                                                </Badge>
                                            </div>
                                            <div className="mt-2 flex gap-2">
                                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
                                                    Level 2 — Reviewer
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {attestation.certificationDescription && (
                                                <p className="text-sm text-muted-foreground">
                                                    {truncateText(attestation.certificationDescription, 120)}
                                                </p>
                                            )}

                                            <div className="bg-white p-3 rounded-md border text-sm text-slate-600 flex items-center gap-3">
                                                <AlertCircle className="w-4 h-4 text-slate-400" />
                                                <span>
                                                    Waiting for <strong>{attestation.l1Progress?.submitted || 0}</strong> of <strong>{attestation.l1Progress?.total || 0}</strong> Level 1 attesters to complete.
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    Assigned {new Date(attestation.assignedAt).toLocaleDateString()}
                                                </div>
                                                <Button size="sm" disabled variant="secondary" className="cursor-not-allowed">
                                                    Available when L1 completes
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* Action Required Section */}
                    {actionRequired.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                                <h2 className="text-2xl font-semibold">Action Required</h2>
                                <Badge variant="destructive">{actionRequired.length}</Badge>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {actionRequired.map((attestation) => {
                                    const progress = attestation.totalQuestions > 0
                                        ? (attestation.answeredQuestions / attestation.totalQuestions) * 100
                                        : 0;

                                    return (
                                        <Card key={attestation.id} className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
                                            <CardHeader>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-lg">{attestation.certificationTitle}</CardTitle>
                                                        <CardDescription className="mt-1">
                                                            {attestation.mandateName}
                                                        </CardDescription>
                                                    </div>
                                                    <Badge variant={attestation.status === 'in_progress' ? 'outline' : 'secondary'}>
                                                        {attestation.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                                    </Badge>
                                                </div>
                                                <div className="mt-2 flex gap-2 flex-wrap">
                                                    <DeadlineBadge deadline={attestation.deadline ? new Date(attestation.deadline) : null} size="sm" />
                                                    {attestation.level === 2 ? (
                                                        <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
                                                            Level 2 — Reviewer
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                                                            Level 1
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {attestation.certificationDescription && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {truncateText(attestation.certificationDescription, 120)}
                                                    </p>
                                                )}

                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Progress</span>
                                                        <span className="font-medium">
                                                            {attestation.answeredQuestions} of {attestation.totalQuestions} questions
                                                        </span>
                                                    </div>
                                                    <Progress value={progress} className="h-2" />
                                                </div>

                                                <div className="flex items-center justify-between pt-2">
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Calendar className="w-3 h-3" />
                                                        Assigned {new Date(attestation.assignedAt).toLocaleDateString()}
                                                    </div>
                                                    <Button
                                                        onClick={() => router.push(`/attester/attestations/${attestation.certificationId}`)}
                                                        size="sm"
                                                    >
                                                        {attestation.status === 'in_progress' ? 'Continue' : 'Start'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Completed Section */}
                    {completed.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <h2 className="text-2xl font-semibold">Completed</h2>
                                <Badge variant="outline">{completed.length}</Badge>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {completed.map((attestation) => (
                                    <Card key={attestation.id} className="bg-muted/30">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <CardTitle className="text-base">{attestation.certificationTitle}</CardTitle>
                                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Submitted
                                                </Badge>
                                            </div>
                                            <CardDescription>{attestation.mandateName}</CardDescription>
                                            <div className="mt-2">
                                                {attestation.level === 2 ? (
                                                    <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 scale-90 origin-left">
                                                        Level 2 — Reviewer
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 scale-90 origin-left">
                                                        Level 1
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Submitted {attestation.submittedAt ? new Date(attestation.submittedAt).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => router.push(`/attester/attestations/${attestation.certificationId}/view`)}
                                            >
                                                <FileText className="w-4 h-4 mr-2" />
                                                View My Responses
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {filteredAndSorted.length === 0 && (
                        <Card>
                            <CardContent className="py-12">
                                <p className="text-center text-muted-foreground">
                                    {filterMandate !== 'all'
                                        ? 'No certifications found for this mandate'
                                        : 'No certifications assigned yet'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
