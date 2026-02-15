'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError('');

        const result = await loginAction(formData);

        if (!result.success) {
            setError(result.error || 'Login failed');
            setIsLoading(false);
            return;
        }

        // Redirect based on mustChangePassword flag
        if (result.mustChangePassword) {
            router.push('/change-password');
        } else {
            // Redirect based on role
            switch (result.role) {
                case 'admin':
                    router.push('/admin/dashboard');
                    break;
                case 'mandate_owner':
                    router.push('/mandate-owner/certifications');
                    break;
                case 'attester':
                    router.push('/attester/dashboard');
                    break;
                default:
                    router.push('/');
            }
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    <CardDescription>
                        Enter your credentials to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
