
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock, Eye, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AttesterStatus {
    attester: {
        id: string;
        name: string;
        email: string;
    };
    status: 'pending' | 'in_progress' | 'submitted';
    submittedAt: string | null;
    level: number;
    levelGroupId: string | null;
}

interface CertificationStats {
    total: number;
    submitted: number;
    percentage: number;
}

interface CertificationDetails {
    id: string;
    title: string;
    description: string;
    status: 'draft' | 'open' | 'closed';
}


export default function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const certId = resolvedParams.id;

    const [certification, setCertification] = useState<CertificationDetails | null>(null);
    const [attesters, setAttesters] = useState<AttesterStatus[]>([]);
    const [stats, setStats] = useState<CertificationStats>({ total: 0, submitted: 0, percentage: 0 });
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/mandate-owner/certifications/${certId}/responses`);
                if (!res.ok) throw new Error("Failed to load responses");

                const data = await res.json();
                setCertification(data.certification);
                setAttesters(data.attesters);
                setStats(data.stats);
            } catch (error) {
                console.error("Error fetching responses:", error);
                toast.error("Failed to load responses");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [certId]);

    const handleCloseCertification = async () => {
        setClosing(true);
        try {
            const res = await fetch(`/api/mandate-owner/certifications/${certId}/close`, {
                method: "POST",
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to close certification");
            }

            toast.success("Certification closed successfully");
            setCertification(prev => prev ? { ...prev, status: 'closed' } : null);

        } catch (error: any) {
            console.error("Error closing certification:", error);
            toast.error(error.message);
        } finally {
            setClosing(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-96">Loading...</div>;
    }

    // Process Attesters into Groups
    const l1Attesters = attesters.filter(a => a.level === 1);
    const l2Attesters = attesters.filter(a => a.level === 2);

    // Group L1 by levelGroupId
    const l1Groups = new Map<string, AttesterStatus[]>(); // groupId -> attesters
    const orphanL1s: AttesterStatus[] = [];

    l1Attesters.forEach(a => {
        if (a.levelGroupId) {
            const group = l1Groups.get(a.levelGroupId) || [];
            group.push(a);
            l1Groups.set(a.levelGroupId, group);
        } else {
            orphanL1s.push(a);
        }
    });

    // Map L2 reviewers to their groups
    const l2GroupMap = new Map<string, AttesterStatus>();
    l2Attesters.forEach(a => {
        if (a.levelGroupId) l2GroupMap.set(a.levelGroupId, a);
    });

    // Stats Calculation
    const l1Total = l1Attesters.length;
    const l1Submitted = l1Attesters.filter(a => a.status === 'submitted').length;
    const l1Percent = l1Total > 0 ? Math.round((l1Submitted / l1Total) * 100) : 0;

    const l2Total = l2Attesters.length;
    const l2Submitted = l2Attesters.filter(a => a.status === 'submitted').length;
    const l2Percent = l2Total > 0 ? Math.round((l2Submitted / l2Total) * 100) : 0;

    const isComplete = (l1Total === l1Submitted) && (l2Total === l2Submitted);
    const isClosed = certification?.status === 'closed';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/mandate-owner/certifications">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">Responses: {certification?.title}</h1>
                        {isClosed && <Badge variant="secondary"><Lock className="w-3 h-3 mr-1" /> Closed</Badge>}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Attestation Progress</CardTitle>
                        <CardDescription>
                            Track completion across Level 1 and Level 2 reviewers
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* L1 Progress */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-700">Level 1: Attesters</span>
                                <span className="text-muted-foreground">{l1Submitted} / {l1Total} ({l1Percent}%)</span>
                            </div>
                            <Progress value={l1Percent} className="h-2 bg-slate-100" indicatorClassName="bg-blue-600" />
                        </div>

                        {/* L2 Progress */}
                        {l2Total > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-700">Level 2: Reviewers</span>
                                    <span className="text-muted-foreground">{l2Submitted} / {l2Total} ({l2Percent}%)</span>
                                </div>
                                <Progress value={l2Percent} className="h-2 bg-slate-100" indicatorClassName="bg-purple-600" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Actions</CardTitle>
                        <CardDescription>Manage certification status</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {!isClosed ? (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        className="w-full"
                                        variant={isComplete ? "default" : "secondary"}
                                        disabled={!isComplete || closing}
                                    >
                                        {closing ? "Closing..." : "Close Certification"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Close Certification?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. Once closed, no further changes can be made.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleCloseCertification}>
                                            Confirm Close
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        ) : (
                            <Button disabled className="w-full" variant="secondary">
                                Certification Closed
                            </Button>
                        )}

                        {!isComplete && !isClosed && (
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                <AlertTriangle className="w-3 h-3 inline mr-1" />
                                All attesters (L1 & L2) must submit before closing.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Attesters (Level 1)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Attester</TableHead>
                                <TableHead>Review Group</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted On</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Render Groups First */}
                            {Array.from(l1Groups.entries()).map(([groupId, members]) => {
                                const reviewer = l2GroupMap.get(groupId);
                                return members.map((item) => (
                                    <TableRow key={item.attester.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.attester.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.attester.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {reviewer ? (
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground">Reviewer:</span> {reviewer.attester.name}
                                                </div>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'submitted' ? 'default' : 'outline'}>
                                                {item.status === 'submitted' ? 'Submitted' :
                                                    item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.status === 'submitted' ? (
                                                <Link href={`/mandate-owner/certifications/${certId}/responses/${item.attester.id}`}>
                                                    <Button size="sm" variant="outline">
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        View
                                                    </Button>
                                                </Link>
                                            ) : (
                                                <span className="text-sm text-muted-foreground italic">No response</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ));
                            })}

                            {/* Render Orphans */}
                            {orphanL1s.map((item) => (
                                <TableRow key={item.attester.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.attester.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.attester.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-muted-foreground italic">No L2 Reviewer</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'submitted' ? 'default' : 'outline'}>
                                            {item.status === 'submitted' ? 'Submitted' :
                                                item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.status === 'submitted' ? (
                                            <Link href={`/mandate-owner/certifications/${certId}/responses/${item.attester.id}`}>
                                                <Button size="sm" variant="outline">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </Button>
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-muted-foreground italic">No response</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Level 2 Section */}
            {l2Attesters.length > 0 && (
                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-purple-900">Level 2 Reviewers</CardTitle>
                        <CardDescription>Reviewers validate submissions from their assigned groups.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Reviewer</TableHead>
                                    <TableHead>Assigned Group</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submitted On</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {l2Attesters.map((item) => {
                                    // Calculate if unlocked
                                    const groupId = item.levelGroupId;
                                    const groupMembers = groupId ? (l1Groups.get(groupId) || []) : [];
                                    const groupTotal = groupMembers.length;
                                    const groupSubmitted = groupMembers.filter(m => m.status === 'submitted').length;
                                    const isUnlocked = groupTotal > 0 && groupTotal === groupSubmitted;

                                    return (
                                        <TableRow key={item.attester.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.attester.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.attester.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    Linked to <strong>{groupTotal}</strong> L1 attesters
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {!isUnlocked && item.status !== 'submitted' ? (
                                                    <Badge variant="outline" className="bg-slate-200 text-slate-600 border-slate-300">
                                                        <Lock className="w-3 h-3 mr-1" />
                                                        Locked
                                                    </Badge>
                                                ) : (
                                                    <Badge variant={item.status === 'submitted' ? 'default' : 'outline'} className={item.status === 'submitted' ? "bg-purple-600 hover:bg-purple-700" : ""}>
                                                        {item.status === 'submitted' ? 'Review Complete' : 'In Progress'}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {item.status === 'submitted' ? (
                                                    <Link href={`/mandate-owner/certifications/${certId}/responses/${item.attester.id}`}>
                                                        <Button size="sm" variant="outline">
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground italic">
                                                        {!isUnlocked ? `Waiting for ${groupTotal - groupSubmitted} L1` : "Pending review"}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
