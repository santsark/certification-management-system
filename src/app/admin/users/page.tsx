'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Trash2, Copy, Check } from 'lucide-react';

const createUserSchema = z.object({
    email: z.string().email('Invalid email'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'mandate_owner', 'attester']),
});

type User = {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'mandate_owner' | 'attester';
    createdAt: string;
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [passwordCopied, setPasswordCopied] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setValue,
        watch,
        reset,
    } = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
    });

    const selectedRole = watch('role');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users);
            } else {
                toast.error('Failed to fetch users');
            }
        } catch (error) {
            toast.error('Error fetching users');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: z.infer<typeof createUserSchema>) => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const result = await response.json();
                setGeneratedPassword(result.generatedPassword);
                setPasswordDialogOpen(true);
                setAddDialogOpen(false);
                reset();
                fetchUsers();
                toast.success('User created successfully');
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to create user');
            }
        } catch (error) {
            toast.error('Error creating user');
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                fetchUsers();
                toast.success('User role updated');
            } else {
                toast.error('Failed to update role');
            }
        } catch (error) {
            toast.error('Error updating role');
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchUsers();
                toast.success('User deleted');
                setDeleteDialogOpen(false);
            } else {
                toast.error('Failed to delete user');
            }
        } catch (error) {
            toast.error('Error deleting user');
        }
    };

    const copyPassword = () => {
        navigator.clipboard.writeText(generatedPassword);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
        toast.success('Password copied to clipboard');
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'destructive';
            case 'mandate_owner':
                return 'default';
            case 'attester':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'mandate_owner':
                return 'Mandate Owner';
            case 'attester':
                return 'Attester';
            default:
                return role.charAt(0).toUpperCase() + role.slice(1);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage system users and their roles
                    </p>
                </div>

                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                                Create a new user account. A password will be generated automatically.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="user@example.com"
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" placeholder="John Doe" {...register('name')} />
                                {errors.name && (
                                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={selectedRole}
                                    onValueChange={(value) => setValue('role', value as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="mandate_owner">Mandate Owner</SelectItem>
                                        <SelectItem value="attester">Attester</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && (
                                    <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
                                )}
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating...' : 'Create User'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Generated Password Dialog */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Created Successfully</DialogTitle>
                        <DialogDescription>
                            The user account has been created. Please share this password with the user.
                            They will be required to change it on first login.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Input value={generatedPassword} readOnly className="font-mono" />
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={copyPassword}
                            >
                                {passwordCopied ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            ⚠️ This password will not be shown again. Make sure to save it.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setPasswordDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Filters */}
            <div className="flex items-center space-x-4">
                <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="mandate_owner">Mandate Owner</SelectItem>
                        <SelectItem value="attester">Attester</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.email}</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={user.role}
                                                onValueChange={(value) => handleUpdateRole(user.id, value)}
                                            >
                                                <SelectTrigger className="w-[160px]">
                                                    <Badge variant={getRoleBadgeColor(user.role)}>
                                                        {getRoleLabel(user.role)}
                                                    </Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="admin">Admin</SelectItem>
                                                    <SelectItem value="mandate_owner">Mandate Owner</SelectItem>
                                                    <SelectItem value="attester">Attester</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => {
                                                    setUserToDelete(user);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the user account for{' '}
                            <strong>{userToDelete?.email}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
