'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface Stats {
    users: {
        total: number;
        byRole: {
            admin: number;
            mandate_owner: number;
            attester: number;
        };
    };
    mandates: {
        total: number;
        byStatus: {
            open: number;
            closed: number;
        };
    };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/stats');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Failed to load statistics</p>
            </div>
        );
    }

    // Prepare chart data
    const chartData = [
        { role: 'Admin', count: stats.users.byRole.admin },
        { role: 'Mandate Owner', count: stats.users.byRole.mandate_owner },
        { role: 'Attester', count: stats.users.byRole.attester },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Overview of system statistics
                </p>
            </div>

            {/* Metrics Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users.total}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            {stats.users.byRole.admin} admin · {stats.users.byRole.mandate_owner} mandate owners · {stats.users.byRole.attester} attesters
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mandates</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.mandates.total}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            All mandates in the system
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open Mandates</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.mandates.byStatus.open}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Active mandates
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Closed Mandates</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.mandates.byStatus.closed}</div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Completed mandates
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Users by Role</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="role" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="hsl(var(--primary))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
