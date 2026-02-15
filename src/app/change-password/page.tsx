'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { changePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, X } from 'lucide-react';

export default function ChangePasswordPage() {
    const router = useRouter();
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [userRole, setUserRole] = useState<string>('');

    // Password validation state
    const [validations, setValidations] = useState({
        minLength: false,
        hasNumber: false,
        hasSpecialChar: false,
    });

    // Fetch user session to get role
    useEffect(() => {
        async function fetchSession() {
            try {
                const response = await fetch('/api/auth/session');
                if (response.ok) {
                    const data = await response.json();
                    setUserRole(data.user.role);
                }
            } catch (error) {
                console.error('Error fetching session:', error);
            }
        }
        fetchSession();
    }, []);

    // Update validation state when password changes
    useEffect(() => {
        setValidations({
            minLength: newPassword.length >= 8,
            hasNumber: /\d/.test(newPassword),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
        });
    }, [newPassword]);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError('');

        const result = await changePasswordAction(formData);

        if (!result.success) {
            setError(result.error || 'Failed to change password');
            setIsLoading(false);
            return;
        }

        // Redirect based on role
        switch (userRole) {
            case 'admin':
                router.push('/admin/dashboard');
                break;
            case 'mandate_owner':
                router.push('/mandates');
                break;
            case 'attester':
                router.push('/attestations');
                break;
            default:
                router.push('/');
        }
    }

    const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
        <div className="flex items-center gap-2 text-sm">
            {isValid ? (
                <Check className="h-4 w-4 text-green-600" />
            ) : (
                <X className="h-4 w-4 text-red-600" />
            )}
            <span className={isValid ? 'text-green-600' : 'text-red-600'}>{text}</span>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Change Password</CardTitle>
                    <CardDescription>
                        You must change your password before continuing
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <div className="mt-2 space-y-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <p className="text-sm font-medium mb-2">Password requirements:</p>
                                <ValidationItem isValid={validations.minLength} text="At least 8 characters" />
                                <ValidationItem isValid={validations.hasNumber} text="At least 1 number" />
                                <ValidationItem isValid={validations.hasSpecialChar} text="At least 1 special character" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
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
                            {isLoading ? 'Changing password...' : 'Change password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
