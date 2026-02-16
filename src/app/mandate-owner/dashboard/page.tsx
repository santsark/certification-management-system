'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Users, Activity, Eye } from 'lucide-react';
import Link from 'next/link';
import DeadlineBadge from '@/components/DeadlineBadge';

interface Certification {
    id: string;
    title: string;
    mandateName: string;
    status: string;
    deadline: string | null;
    completionPercentage: number;
}

interface Stats {
    totalMandates: number;
    totalCertifications: number;
    activeCertifications: number;
    completionData: {
        title: string;
        completionPercentage: number;
    }[];
}

interface Mandate {
    id: string;
    name: string;
    description: string | null;
    status: string;
    draftCount: number;
    openCount: number;
    closedCount: number;
}

export default function MandateOwnerDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [urgentCertifications, setUrgentCertifications] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, mandatesRes, certsRes] = await Promise.all([
                    fetch('/api/mandate-owner/stats'),
                    fetch('/api/mandate-owner/mandates'),
                    fetch('/api/mandate-owner/certifications?status=open'),
                ]);

                const statsData = await statsRes.json();
                const mandatesData = await mandatesRes.json();
                const certsData = await certsRes.json();

                // Process certs to find urgent ones (open status)
                // Sort: Overdue first, then by deadline ascending
                const sortedCerts = certsData.sort((a: Certification, b: Certification) => {
                    const dateA = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                    const dateB = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                    return dateA - dateB;
                }).slice(0, 6); // Top 6

                setStats(statsData);
                setMandates(mandatesData);
                setUrgentCertifications(sortedCerts);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-lg">Loading dashboard...</div>
            </div>
        );
    }

    const truncateTitle = (title: string, maxLength: number = 20) => {
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
    };

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'open':
                return 'default';
            case 'closed':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your mandates and track certification progress
                </p>
            </div>

            {/* Summary Statistics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mandates</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalMandates || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Owned or backup owner
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Certifications</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalCertifications || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all mandates
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.activeCertifications || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently open
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Completion Chart */}
            {stats && stats.completionData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Attestation Completion Progress</CardTitle>
                        <CardDescription>
                            Completion percentage for open certifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={stats.completionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="title"
                                    tickFormatter={(value) => truncateTitle(value)}
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                />
                                <YAxis
                                    label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => value !== undefined ? [`${value}%`, 'Completion'] : ['0%', 'Completion']}
                                    labelFormatter={(label) => `Certification: ${label}`}
                                />
                                <Bar dataKey="completionPercentage" fill="hsl(var(--primary))">
                                    {stats.completionData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.completionPercentage === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Urgent Certifications */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Upcoming Deadlines</h2>
                </div>
                {urgentCertifications.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                        {urgentCertifications.map((cert) => (
                            <Card key={cert.id} className="relative overflow-hidden">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{truncateTitle(cert.title)}</CardTitle>
                                            <CardDescription>{cert.mandateName}</CardDescription>
                                        </div>
                                        <Badge variant="outline">{cert.status}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="mt-2 text-center">
                                        <DeadlineBadge deadline={cert.deadline ? new Date(cert.deadline) : null} />
                                    </div>
                                    <div className="mt-4">
                                        <Link href={`/mandate-owner/certifications/${cert.id}/assign`}>
                                            <Button variant="ghost" size="sm" className="w-full">
                                                Manage
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="mb-8">
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No active certifications with deadlines.
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Mandates List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Your Mandates</h2>
                    <Link href="/mandate-owner/certifications">
                        <Button>View All Certifications</Button>
                    </Link>
                </div>

                {mandates.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <p className="text-muted-foreground">No mandates found.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {mandates.map((mandate) => (
                            <Card key={mandate.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg">{mandate.name}</CardTitle>
                                            <Badge
                                                variant={getStatusBadgeColor(mandate.status)}
                                                className="mt-2"
                                            >
                                                {mandate.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    {mandate.description && (
                                        <CardDescription className="mt-2 line-clamp-2">
                                            {mandate.description}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="space-y-3">
                                        <div className="text-sm">
                                            <span className="font-medium">Certifications:</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-lg bg-yellow-50 p-2">
                                                <div className="text-lg font-bold text-yellow-700">
                                                    {mandate.draftCount}
                                                </div>
                                                <div className="text-xs text-yellow-600">Draft</div>
                                            </div>
                                            <div className="rounded-lg bg-green-50 p-2">
                                                <div className="text-lg font-bold text-green-700">
                                                    {mandate.openCount}
                                                </div>
                                                <div className="text-xs text-green-600">Open</div>
                                            </div>
                                            <div className="rounded-lg bg-gray-50 p-2">
                                                <div className="text-lg font-bold text-gray-700">
                                                    {mandate.closedCount}
                                                </div>
                                                <div className="text-xs text-gray-600">Closed</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <Link href={`/mandate-owner/certifications?mandateId=${mandate.id}`}>
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
