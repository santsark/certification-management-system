'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Plus, MoreVertical, Eye, Edit, Send, Users, FileCheck, XCircle, ArrowUpDown } from 'lucide-react';
import DeadlineBadge from '@/components/DeadlineBadge';

export const dynamic = 'force-dynamic';

interface Certification {
    id: string;
    title: string;
    mandateId: string;
    mandateName: string;
    status: 'draft' | 'open' | 'closed';
    assignedCount: number;
    completedCount: number;
    completionPercentage: number;
    createdAt: Date;
    deadline: string | null;
}

interface Mandate {
    id: string;
    name: string;
}

export default function CertificationsPage() {
    const searchParams = useSearchParams();
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMandate, setSelectedMandate] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Check if mandateId is in URL params
        const mandateIdParam = searchParams.get('mandateId');
        if (mandateIdParam) {
            setSelectedMandate(mandateIdParam);
        }
    }, [searchParams]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [certsRes, mandatesRes] = await Promise.all([
                    fetch(`/api/mandate-owner/certifications?mandateId=${selectedMandate !== 'all' ? selectedMandate : ''}&status=${selectedStatus !== 'all' ? selectedStatus : ''}`),
                    fetch('/api/mandate-owner/mandates'),
                ]);

                const certsData = await certsRes.json();
                const mandatesData = await mandatesRes.json();

                setCertifications(certsData);
                setMandates(mandatesData);
            } catch (error) {
                console.error('Error fetching certifications:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedMandate, selectedStatus]);

    const filteredCertifications = certifications.filter((cert) => {
        const matchesSearch = cert.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
            draft: 'outline',
            open: 'default',
            closed: 'secondary',
        };
        return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const canEdit = (cert: Certification) => cert.status === 'draft';
    const canPublish = (cert: Certification) => cert.status === 'draft';
    const canAssign = (cert: Certification) => cert.status === 'open';
    const canViewResponses = (cert: Certification) => cert.status === 'open' || cert.status === 'closed';
    const canClose = (cert: Certification) => cert.status === 'open' && cert.assignedCount > 0 && cert.completedCount === cert.assignedCount;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-lg">Loading certifications...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Certifications</h1>
                    <p className="text-muted-foreground">
                        Manage certifications across your mandates
                    </p>
                </div>
                <Link href="/mandate-owner/certifications/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Certification
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>Filter certifications by mandate, status, or search</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Mandate</label>
                            <Select value={selectedMandate} onValueChange={setSelectedMandate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All mandates" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Mandates</SelectItem>
                                    {mandates.map((mandate) => (
                                        <SelectItem key={mandate.id} value={mandate.id}>
                                            {mandate.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Status</label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Search</label>
                            <Input
                                placeholder="Search by title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="pt-6">
                    {filteredCertifications.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No certifications found.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Mandate</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => {
                                            const sorted = [...filteredCertifications].sort((a, b) => {
                                                if (!a.deadline) return 1;
                                                if (!b.deadline) return -1;
                                                return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                                            });
                                            setCertifications(sorted);
                                        }}>
                                            Deadline
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Assigned</TableHead>
                                    <TableHead className="w-[200px]">Completion</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCertifications.map((cert) => (
                                    <TableRow key={cert.id}>
                                        <TableCell className="font-medium">{cert.title}</TableCell>
                                        <TableCell>{cert.mandateName}</TableCell>
                                        <TableCell>{getStatusBadge(cert.status)}</TableCell>
                                        <TableCell>
                                            <DeadlineBadge deadline={cert.deadline ? new Date(cert.deadline) : null} size="sm" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-muted-foreground" />
                                                {cert.assignedCount}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Progress value={cert.completionPercentage} className="h-2" />
                                                <div className="text-xs text-muted-foreground">
                                                    {cert.completedCount}/{cert.assignedCount} ({cert.completionPercentage}%)
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatDate(cert.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View
                                                    </DropdownMenuItem>
                                                    {canEdit(cert) && (
                                                        <Link href={`/mandate-owner/certifications/edit/${cert.id}`}>
                                                            <DropdownMenuItem>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                        </Link>
                                                    )}
                                                    {canPublish(cert) && (
                                                        <DropdownMenuItem>
                                                            <Send className="mr-2 h-4 w-4" />
                                                            Publish
                                                        </DropdownMenuItem>
                                                    )}
                                                    <Link href={`/mandate-owner/certifications/${cert.id}/assign`}>
                                                        <DropdownMenuItem>
                                                            <Users className="mr-2 h-4 w-4" />
                                                            {cert.status === 'closed' ? "View Assignments" : "Assign Attesters"}
                                                        </DropdownMenuItem>
                                                    </Link>
                                                    {canViewResponses(cert) && (
                                                        <Link href={`/mandate-owner/certifications/${cert.id}/responses`}>
                                                            <DropdownMenuItem>
                                                                <FileCheck className="mr-2 h-4 w-4" />
                                                                View Responses
                                                            </DropdownMenuItem>
                                                        </Link>
                                                    )}
                                                    {canClose(cert) && (
                                                        <DropdownMenuItem>
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            Close Certification
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
