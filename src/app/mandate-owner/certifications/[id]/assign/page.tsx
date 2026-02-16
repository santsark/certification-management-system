

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Trash2, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Attester {
    id: string;
    name: string;
    email: string;
}

interface AssignedAttester extends Attester {
    assignedAt: string;
}

interface CertificationDetails {
    id: string;
    title: string;
    description: string;
    status: string;
    deadline: string | null;
}

export default function AssignAttestersPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const certId = resolvedParams.id;

    const [certification, setCertification] = useState<CertificationDetails | null>(null);
    const [assignedAttesters, setAssignedAttesters] = useState<AssignedAttester[]>([]);
    const [availableAttesters, setAvailableAttesters] = useState<Attester[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAttesters, setSelectedAttesters] = useState<string[]>([]);
    const [assigning, setAssigning] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch certification details
                const certRes = await fetch(`/api/mandate-owner/certifications/${certId}`);
                if (!certRes.ok) throw new Error("Failed to fetch certification");
                const certData = await certRes.json();
                setCertification(certData);

                // Fetch assigned attesters
                const assignmentsRes = await fetch(`/api/mandate-owner/certifications/${certId}/assignments`);
                const assignmentsData = await assignmentsRes.json();
                setAssignedAttesters(assignmentsData);

                // Fetch all potential attesters
                const attestersRes = await fetch("/api/users?role=attester");
                const attestersData = await attestersRes.json();

                // Filter out already assigned attesters from available list
                const assignedIds = new Set(assignmentsData.map((a: AssignedAttester) => a.id));
                const available = attestersData.filter((a: Attester) => !assignedIds.has(a.id));
                setAvailableAttesters(available);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [certId]);

    const handleAssign = async () => {
        if (selectedAttesters.length === 0) return;

        setAssigning(true);
        try {
            const res = await fetch(`/api/mandate-owner/certifications/${certId}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attesterIds: selectedAttesters }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to assign attesters");
            }

            const data = await res.json();
            toast.success(data.message);

            // Refresh data
            const assignmentsRes = await fetch(`/api/mandate-owner/certifications/${certId}/assignments`);
            const assignmentsData = await assignmentsRes.json();
            setAssignedAttesters(assignmentsData);

            // Update available attesters
            const assignedIds = new Set(assignmentsData.map((a: AssignedAttester) => a.id));
            const attestersRes = await fetch("/api/users?role=attester");
            const attestersData = await attestersRes.json();
            const available = attestersData.filter((a: Attester) => !assignedIds.has(a.id));
            setAvailableAttesters(available);

            setSelectedAttesters([]);

        } catch (error: any) {
            console.error("Error assigning attesters:", error);
            toast.error(error.message || "Failed to assign attesters");
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (attesterId: string) => {
        try {
            const res = await fetch(`/api/mandate-owner/certifications/${certId}/assign/${attesterId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to remove assignment");
            }

            toast.success("Attester unassigned successfully");

            // Refresh data
            const assignmentsRes = await fetch(`/api/mandate-owner/certifications/${certId}/assignments`);
            const assignmentsData = await assignmentsRes.json();
            setAssignedAttesters(assignmentsData);

            // Update available attesters
            const assignedIds = new Set(assignmentsData.map((a: AssignedAttester) => a.id));
            const attestersRes = await fetch("/api/users?role=attester");
            const attestersData = await attestersRes.json();
            const available = attestersData.filter((a: Attester) => !assignedIds.has(a.id));
            setAvailableAttesters(available);

        } catch (error: any) {
            console.error("Error removing assignment:", error);
            toast.error(error.message || "Failed to remove assignment");
        }
    };

    const toggleAttesterSelection = (attesterId: string) => {
        if (isClosed) return;
        setSelectedAttesters((prev) =>
            prev.includes(attesterId)
                ? prev.filter((id) => id !== attesterId)
                : [...prev, attesterId]
        );
    };

    const filteredAvailableAttesters = availableAttesters.filter((attester) =>
        attester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attester.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isClosed = certification?.status === 'closed';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/mandate-owner/certifications">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {isClosed ? "Assignment History (Read Only)" : "Assign Attesters"}
                        {isClosed && <Lock className="h-5 w-5 text-muted-foreground" />}
                    </h1>
                    <p className="text-muted-foreground">
                        {certification?.title}
                    </p>
                </div>
            </div>

            {isClosed && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Locked</AlertTitle>
                    <AlertDescription>
                        This certification is closed. Assignments are locked and cannot be changed.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Available Attesters</CardTitle>
                        <CardDescription>Select attesters to assign to this certification</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        <Input
                            placeholder="Search attesters..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-background"
                            disabled={isClosed}
                        />

                        <div className="border rounded-md flex-1 overflow-y-auto min-h-[300px] p-2 space-y-2 max-h-[500px]">
                            {filteredAvailableAttesters.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No attesters found
                                </div>
                            ) : (
                                filteredAvailableAttesters.map((attester) => (
                                    <div
                                        key={attester.id}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                            !isClosed && "cursor-pointer hover:bg-accent",
                                            selectedAttesters.includes(attester.id) ? "bg-accent border-primary" : "bg-card",
                                            isClosed && "opacity-50 cursor-not-allowed"
                                        )}
                                        onClick={() => toggleAttesterSelection(attester.id)}
                                    >
                                        <Checkbox
                                            checked={selectedAttesters.includes(attester.id)}
                                            onCheckedChange={() => toggleAttesterSelection(attester.id)}
                                            disabled={isClosed}
                                        />
                                        <div className="flex-1 overflow-hidden">
                                            <div className="font-medium truncate">{attester.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{attester.email}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="text-sm text-muted-foreground">
                                {selectedAttesters.length} selected
                            </div>
                            {!isClosed ? (
                                <Button onClick={handleAssign} disabled={selectedAttesters.length === 0 || assigning}>
                                    {assigning ? "Assigning..." : "Assign Selected"}
                                </Button>
                            ) : (
                                <Button disabled variant="outline">
                                    Locked
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Assigned Attesters</CardTitle>
                        <CardDescription>
                            {assignedAttesters.length} attesters currently assigned
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="border rounded-md h-full overflow-y-auto min-h-[300px] p-2 space-y-2 max-h-[600px]">
                            {assignedAttesters.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    No attesters assigned yet
                                </div>
                            ) : (
                                assignedAttesters.map((attester) => (
                                    <div key={attester.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{attester.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{attester.name}</div>
                                                <div className="text-xs text-muted-foreground">{attester.email}</div>
                                            </div>
                                        </div>
                                        {!isClosed && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemove(attester.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
