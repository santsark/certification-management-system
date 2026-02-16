"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Trash2, Lock, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from 'uuid';

interface Attester {
    id: string;
    name: string;
    email: string;
}

interface AssignedAttester {
    id: string; // assignment id
    attesterId: string;
    level: number;
    levelGroupId: string | null;
    status: string; // attestation status (for display)
}

interface L2Group {
    id: string; // local uuid for the group
    l2UserId: string | null;
    l1UserIds: string[];
}

export default function AssignAttestersPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const certId = resolvedParams.id;

    // Data State
    const [availableAttesters, setAvailableAttesters] = useState<Attester[]>([]);
    const [attesterMap, setAttesterMap] = useState<Map<string, Attester>>(new Map());

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const [certTitle, setCertTitle] = useState("");

    // Assignment State
    const [selectedL1Ids, setSelectedL1Ids] = useState<string[]>([]);
    const [enableL2, setEnableL2] = useState(false);
    const [l2Groups, setL2Groups] = useState<L2Group[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Cert Details
                const certRes = await fetch("/api/mandate-owner/certifications/" + certId);
                if (!certRes.ok) throw new Error("Failed to fetch certification");
                const certData = await certRes.json();
                setCertTitle(certData.title);
                setIsClosed(certData.status === 'closed');

                // 2. Fetch All Attesters
                const attestersRes = await fetch("/api/users?role=attester");
                const attestersData = await attestersRes.json();
                setAvailableAttesters(attestersData);
                const map = new Map<string, Attester>();
                attestersData.forEach((a: Attester) => map.set(a.id, a));
                setAttesterMap(map);

                // 3. Fetch Existing Assignments
                const assignmentsRes = await fetch("/api/mandate-owner/certifications/" + certId + "/assignments");
                const assignmentsData: AssignedAttester[] = await assignmentsRes.json();

                // Parse Assignments into State
                const l1Assignments = assignmentsData.filter(a => a.level === 1);
                const l2Assignments = assignmentsData.filter(a => a.level === 2);

                const l1Ids = l1Assignments.map(a => a.attesterId);
                setSelectedL1Ids(l1Ids);

                if (l2Assignments.length > 0) {
                    setEnableL2(true);

                    // Reconstruct Groups
                    const groupsMap = new Map<string, L2Group>();

                    // First create groups from L2s
                    l2Assignments.forEach(l2 => {
                        if (l2.levelGroupId) {
                            if (!groupsMap.has(l2.levelGroupId)) {
                                groupsMap.set(l2.levelGroupId, {
                                    id: l2.levelGroupId,
                                    l2UserId: l2.attesterId,
                                    l1UserIds: []
                                });
                            } else {
                                // Logic error in DB if multiple L2s have same group ID?
                                // Our model supports one L2 per group for now per UI requirements.
                            }
                        }
                    });

                    // Then add L1s to groups
                    l1Assignments.forEach(l1 => {
                        if (l1.levelGroupId && groupsMap.has(l1.levelGroupId)) {
                            groupsMap.get(l1.levelGroupId)!.l1UserIds.push(l1.attesterId);
                        }
                    });

                    setL2Groups(Array.from(groupsMap.values()));
                }

            } catch (error) {
                console.error("Error fetching data:", error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [certId]);

    // Handlers
    const toggleL1Selection = (userId: string) => {
        if (isClosed) return;

        setSelectedL1Ids(prev => {
            if (prev.includes(userId)) {
                // Removing L1: also remove from any L2 groups
                setL2Groups(groups => groups.map(g => ({
                    ...g,
                    l1UserIds: g.l1UserIds.filter(id => id !== userId)
                })));
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const addGroup = () => {
        setL2Groups(prev => [
            ...prev,
            { id: uuidv4(), l2UserId: null, l1UserIds: [] }
        ]);
    };

    const removeGroup = (groupId: string) => {
        setL2Groups(prev => prev.filter(g => g.id !== groupId));
    };

    const updateGroupL2 = (groupId: string, userId: string) => {
        // Validation: user cannot be L1
        if (selectedL1Ids.includes(userId)) {
            toast.error("An L1 attester cannot also be an L2 reviewer.");
            return;
        }
        setL2Groups(prev => prev.map(g => g.id === groupId ? { ...g, l2UserId: userId } : g));
    };

    const toggleGroupL1 = (groupId: string, userId: string) => {
        setL2Groups(prev => prev.map(g => {
            if (g.id !== groupId) {
                // If adding to this group, remove from others (Exclusive membership)
                if (g.l1UserIds.includes(userId)) {
                    return { ...g, l1UserIds: g.l1UserIds.filter(id => id !== userId) };
                }
                return g;
            } else {
                // Toggle in this group
                if (g.l1UserIds.includes(userId)) {
                    return { ...g, l1UserIds: g.l1UserIds.filter(id => id !== userId) };
                } else {
                    return { ...g, l1UserIds: [...g.l1UserIds, userId] };
                }
            }
        }));
    };

    const handleSave = async () => {
        if (selectedL1Ids.length === 0) {
            toast.error("At least one L1 attester is required.");
            return;
        }

        if (enableL2) {
            // Validation Rules
            const assignedL1s = new Set<string>();

            for (const group of l2Groups) {
                if (!group.l2UserId) {
                    toast.error("All groups must have a Level 2 Reviewer selected.");
                    return;
                }
                if (group.l1UserIds.length === 0) {
                    toast.error("All groups must have at least one L1 Attester.");
                    return;
                }
                group.l1UserIds.forEach(id => assignedL1s.add(id));
            }

            // Check for orphan L1s
            const orphanL1s = selectedL1Ids.filter(id => !assignedL1s.has(id));
            if (orphanL1s.length > 0) {
                toast.error("All L1 attesters must be assigned to a group. Unassigned: " + orphanL1s.map(id => attesterMap.get(id)?.name).join(", "));
                return;
            }
        }

        setSaving(true);
        try {
            // Construct Payload
            const l1Payload = selectedL1Ids.map(userId => {
                const group = enableL2 ? l2Groups.find(g => g.l1UserIds.includes(userId)) : null;
                return {
                    userId,
                    levelGroupId: group ? group.id : null
                };
            });

            const l2Payload = enableL2 ? l2Groups.map(group => ({
                userId: group.l2UserId!, // Verified not null above
                levelGroupId: group.id
            })) : [];

            const res = await fetch("/api/mandate-owner/certifications/" + certId + "/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    l1Attesters: l1Payload,
                    l2Attesters: l2Payload
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save assignments");
            }

            toast.success("Assignments saved successfully.");
            if (enableL2) {
                toast.info("Level 2 reviewers will be notified once groups are complete.");
            }

        } catch (error: unknown) {
            console.error(error);
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("An unknown error occurred");
            }
        } finally {
            setSaving(false);
        }
    };

    const filteredAvailableAttesters = availableAttesters.filter((attester) =>
        attester.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attester.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
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
                        <p className="text-muted-foreground">{certTitle}</p>
                    </div>
                </div>
                {!isClosed && (
                    <Button onClick={handleSave} disabled={saving} className="min-w-[150px]">
                        {saving ? "Saving..." : "Save Assignments"}
                    </Button>
                )}
            </div>

            {/* Panels Container */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">

                {/* Left Panel: L1 Selection */}
                <Card className="flex flex-col h-full overflow-hidden">
                    <CardHeader className="shrink-0 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Level 1 — Primary Attesters
                                    <Badge variant="secondary" className="ml-2">Required</Badge>
                                </CardTitle>
                                <CardDescription>Select users who must complete the attestation</CardDescription>
                            </div>
                            <div className="bg-muted px-3 py-1 rounded-full text-sm font-medium">
                                {selectedL1Ids.length} Selected
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                    disabled={isClosed}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="flex-1 overflow-y-auto p-0">
                        <div className="divide-y">
                            {filteredAvailableAttesters.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">No attesters found</div>
                            ) : (
                                filteredAvailableAttesters.map(attester => (
                                    <div
                                        key={attester.id}
                                        className={cn(
                                            "flex items-center gap-3 p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                                            selectedL1Ids.includes(attester.id) && "bg-muted/50"
                                        )}
                                        onClick={() => toggleL1Selection(attester.id)}
                                    >
                                        <Checkbox
                                            checked={selectedL1Ids.includes(attester.id)}
                                            onCheckedChange={() => toggleL1Selection(attester.id)}
                                            disabled={isClosed}
                                        />
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback>{attester.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{attester.name}</div>
                                            <div className="text-sm text-muted-foreground truncate">{attester.email}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Panel: L2 Configuration */}
                <Card className="flex flex-col h-full overflow-hidden bg-slate-50/50">
                    <CardHeader className="shrink-0 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Level 2 — Reviewers
                                    <Badge variant="outline" className="ml-2">Optional</Badge>
                                </CardTitle>
                                <CardDescription>Group L1 attesters under a reviewer</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={enableL2}
                                    onCheckedChange={setEnableL2}
                                    disabled={isClosed}
                                />
                                <Label className="text-sm font-medium">{enableL2 ? "Enabled" : "Disabled"}</Label>
                            </div>
                        </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
                        {!enableL2 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-60">
                                <Users className="h-12 w-12 mb-4" />
                                <h3 className="text-lg font-medium mb-1">Level 2 Reviews Disabled</h3>
                                <p className="max-w-xs text-sm">Enable this to assign reviewers who must approve attestations after Level 1 completion.</p>
                            </div>
                        ) : (
                            <>
                                {l2Groups.map((group, index) => (
                                    <Card key={group.id} className="relative border-slate-200 shadow-sm">
                                        <div className="absolute top-4 right-4">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeGroup(group.id)}
                                                disabled={isClosed}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <CardHeader className="pb-3 pt-4">
                                            <Badge variant="outline" className="w-fit mb-2">Group {index + 1}</Badge>
                                            <div className="space-y-2">
                                                <Label>Level 2 Reviewer</Label>
                                                <Select
                                                    value={group.l2UserId || ""}
                                                    onValueChange={(val) => updateGroupL2(group.id, val)}
                                                    disabled={isClosed}
                                                >
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select a reviewer" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableAttesters
                                                            .filter(a => !selectedL1Ids.includes(a.id)) // Filter out L1s
                                                            .map(reviewer => (
                                                                <SelectItem key={reviewer.id} value={reviewer.id}>
                                                                    {reviewer.name} ({reviewer.email})
                                                                </SelectItem>
                                                            ))
                                                        }
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardHeader>
                                        <Separator />
                                        <CardContent className="pt-4 pb-4">
                                            <Label className="mb-3 block">Linked L1 Attesters</Label>
                                            <div className="space-y-2">
                                                {selectedL1Ids.length === 0 && (
                                                    <div className="text-sm text-muted-foreground italic">No L1 attesters selected in left panel.</div>
                                                )}

                                                {selectedL1Ids.map(l1Id => {
                                                    const user = attesterMap.get(l1Id);
                                                    if (!user) return null;

                                                    // Check if assigned to another group
                                                    const assignedToOther = l2Groups.some(g => g.id !== group.id && g.l1UserIds.includes(l1Id));

                                                    return (
                                                        <div
                                                            key={l1Id}
                                                            className={cn(
                                                                "flex items-center justify-between p-2 rounded border bg-white text-sm transition-opacity",
                                                                assignedToOther && "opacity-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="h-6 w-6">
                                                                    <AvatarFallback className="text-[10px]">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="truncate max-w-[150px]">{user.name}</span>
                                                            </div>
                                                            <Button
                                                                variant={group.l1UserIds.includes(l1Id) ? "default" : "outline"}
                                                                size="sm"
                                                                className={cn("h-7 text-xs", group.l1UserIds.includes(l1Id) ? "bg-green-600 hover:bg-green-700" : "")}
                                                                onClick={() => toggleGroupL1(group.id, l1Id)}
                                                                disabled={isClosed}
                                                            >
                                                                {group.l1UserIds.includes(l1Id) ? "Linked" : "Link"}
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {!isClosed && (
                                    <Button onClick={addGroup} variant="outline" className="w-full border-dashed py-6 text-muted-foreground hover:text-primary hover:border-primary hover:bg-accent/50">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Reviewer Group
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
