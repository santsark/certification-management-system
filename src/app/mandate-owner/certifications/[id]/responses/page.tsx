
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

            // Update local state
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

    const isComplete = stats.total > 0 && stats.total === stats.submitted;
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
                        <CardTitle>Attester Progress</CardTitle>
                        <CardDescription>
                            {stats.submitted} of {stats.total} attesters have submitted responses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Completion</span>
                                <span className="font-medium">{stats.percentage}%</span>
                            </div>
                            <Progress value={stats.percentage} className="h-2" />
                        </div>
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
                                            This action cannot be undone. Once closed, no further changes can be made, and attesters can no longer submit responses.
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
                                All attesters must submit before closing.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Attesters</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Attester</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submitted On</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attesters.map((item) => (
                                <TableRow key={item.attester.id}>
                                    <TableCell>
                                        <div className="font-medium">{item.attester.name}</div>
                                        <div className="text-xs text-muted-foreground">{item.attester.email}</div>
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
        </div>
    );
}
