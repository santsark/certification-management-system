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
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Edit, Eye } from 'lucide-react';

const mandateSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    ownerId: z.string().min(1, 'Owner is required'),
    backupOwnerId: z.string().optional(),
    status: z.enum(['open', 'closed']),
});

type Mandate = {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    backupOwnerId: string | null;
    backupOwnerName: string | null;
    backupOwnerEmail: string | null;
    status: 'open' | 'closed';
    createdAt: string;
};

type User = {
    id: string;
    name: string;
    email: string;
};

export default function MandatesPage() {
    const [mandates, setMandates] = useState<Mandate[]>([]);
    const [mandateOwners, setMandateOwners] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

    const {
        register: registerCreate,
        handleSubmit: handleSubmitCreate,
        formState: { errors: errorsCreate, isSubmitting: isSubmittingCreate },
        setValue: setValueCreate,
        watch: watchCreate,
        reset: resetCreate,
    } = useForm<z.infer<typeof mandateSchema>>({
        resolver: zodResolver(mandateSchema),
        defaultValues: { status: 'open' },
    });

    const {
        register: registerEdit,
        handleSubmit: handleSubmitEdit,
        formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
        setValue: setValueEdit,
        watch: watchEdit,
        reset: resetEdit,
    } = useForm<z.infer<typeof mandateSchema>>({
        resolver: zodResolver(mandateSchema),
    });

    const createOwnerId = watchCreate('ownerId');
    const createBackupOwnerId = watchCreate('backupOwnerId');
    const createStatus = watchCreate('status');

    const editOwnerId = watchEdit('ownerId');
    const editBackupOwnerId = watchEdit('backupOwnerId');
    const editStatus = watchEdit('status');

    useEffect(() => {
        fetchMandates();
        fetchMandateOwners();
    }, []);

    const fetchMandates = async () => {
        try {
            const response = await fetch('/api/admin/mandates');
            if (response.ok) {
                const data = await response.json();
                setMandates(data.mandates);
            } else {
                toast.error('Failed to fetch mandates');
            }
        } catch (error) {
            toast.error('Error fetching mandates');
        } finally {
            setLoading(false);
        }
    };

    const fetchMandateOwners = async () => {
        try {
            const response = await fetch('/api/admin/users?role=mandate_owner');
            if (response.ok) {
                const data = await response.json();
                setMandateOwners(data.users);
            }
        } catch (error) {
            console.error('Error fetching mandate owners:', error);
        }
    };

    const onSubmitCreate = async (data: z.infer<typeof mandateSchema>) => {
        try {
            const payload = {
                ...data,
                backupOwnerId: data.backupOwnerId || undefined,
            };

            const response = await fetch('/api/admin/mandates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success('Mandate created successfully');
                setCreateDialogOpen(false);
                resetCreate();
                fetchMandates();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to create mandate');
            }
        } catch (error) {
            toast.error('Error creating mandate');
        }
    };

    const onSubmitEdit = async (data: z.infer<typeof mandateSchema>) => {
        if (!selectedMandate) return;

        try {
            const payload = {
                ...data,
                backupOwnerId: data.backupOwnerId || null,
            };

            const response = await fetch(`/api/admin/mandates/${selectedMandate.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success('Mandate updated successfully');
                setEditDialogOpen(false);
                setSelectedMandate(null);
                fetchMandates();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to update mandate');
            }
        } catch (error) {
            toast.error('Error updating mandate');
        }
    };

    const openEditDialog = (mandate: Mandate) => {
        setSelectedMandate(mandate);
        resetEdit({
            name: mandate.name,
            description: mandate.description || '',
            ownerId: mandate.ownerId,
            backupOwnerId: mandate.backupOwnerId || undefined,
            status: mandate.status,
        });
        setEditDialogOpen(true);
    };

    const openViewDialog = (mandate: Mandate) => {
        setSelectedMandate(mandate);
        setViewDialogOpen(true);
    };

    const truncateText = (text: string | null, maxLength: number) => {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Mandate Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage mandates and assignments
                    </p>
                </div>

                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <FileText className="mr-2 h-4 w-4" />
                            Create Mandate
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Mandate</DialogTitle>
                            <DialogDescription>
                                Add a new mandate to the system
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-4">
                            <div>
                                <Label htmlFor="create-name">Name *</Label>
                                <Input
                                    id="create-name"
                                    placeholder="Mandate name"
                                    {...registerCreate('name')}
                                />
                                {errorsCreate.name && (
                                    <p className="text-sm text-red-600 mt-1">{errorsCreate.name.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="create-description">Description</Label>
                                <Textarea
                                    id="create-description"
                                    placeholder="Detailed description of the mandate"
                                    rows={4}
                                    {...registerCreate('description')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="create-owner">Owner *</Label>
                                    <Select
                                        value={createOwnerId}
                                        onValueChange={(value) => setValueCreate('ownerId', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select owner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mandateOwners.map((owner) => (
                                                <SelectItem key={owner.id} value={owner.id}>
                                                    {owner.name} ({owner.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errorsCreate.ownerId && (
                                        <p className="text-sm text-red-600 mt-1">{errorsCreate.ownerId.message}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="create-backup-owner">Backup Owner</Label>
                                    <Select
                                        value={createBackupOwnerId || '__none__'}
                                        onValueChange={(value) => setValueCreate('backupOwnerId', value === '__none__' ? undefined : value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select backup owner (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">None</SelectItem>
                                            {mandateOwners
                                                .filter((owner) => owner.id !== createOwnerId)
                                                .map((owner) => (
                                                    <SelectItem key={owner.id} value={owner.id}>
                                                        {owner.name} ({owner.email})
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="create-status">Status *</Label>
                                <Select
                                    value={createStatus}
                                    onValueChange={(value) => setValueCreate('status', value as any)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmittingCreate}>
                                    {isSubmittingCreate ? 'Creating...' : 'Create Mandate'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Mandates Table */}
            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Backup Owner</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mandates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        No mandates found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                mandates.map((mandate) => (
                                    <TableRow key={mandate.id}>
                                        <TableCell className="font-medium">{mandate.name}</TableCell>
                                        <TableCell className="max-w-xs">
                                            <span title={mandate.description || undefined}>
                                                {truncateText(mandate.description, 50)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{mandate.ownerName}</TableCell>
                                        <TableCell>
                                            {mandate.backupOwnerName || (
                                                <span className="text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={mandate.status === 'open' ? 'default' : 'secondary'}>
                                                {mandate.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(mandate.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openViewDialog(mandate)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" onClick={() => openEditDialog(mandate)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Mandate</DialogTitle>
                        <DialogDescription>Update mandate details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input id="edit-name" {...registerEdit('name')} />
                            {errorsEdit.name && (
                                <p className="text-sm text-red-600 mt-1">{errorsEdit.name.message}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea id="edit-description" rows={4} {...registerEdit('description')} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-owner">Owner *</Label>
                                <Select
                                    value={editOwnerId}
                                    onValueChange={(value) => setValueEdit('ownerId', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {mandateOwners.map((owner) => (
                                            <SelectItem key={owner.id} value={owner.id}>
                                                {owner.name} ({owner.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="edit-backup-owner">Backup Owner</Label>
                                <Select
                                    value={editBackupOwnerId || '__none__'}
                                    onValueChange={(value) => setValueEdit('backupOwnerId', value === '__none__' ? undefined : value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">None</SelectItem>
                                        {mandateOwners
                                            .filter((owner) => owner.id !== editOwnerId)
                                            .map((owner) => (
                                                <SelectItem key={owner.id} value={owner.id}>
                                                    {owner.name} ({owner.email})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="edit-status">Status *</Label>
                            <Select
                                value={editStatus}
                                onValueChange={(value) => setValueEdit('status', value as any)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingEdit}>
                                {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Mandate Details</DialogTitle>
                    </DialogHeader>
                    {selectedMandate && (
                        <div className="space-y-4">
                            <div>
                                <Label>Name</Label>
                                <p className="text-sm mt-1">{selectedMandate.name}</p>
                            </div>

                            <div>
                                <Label>Description</Label>
                                <p className="text-sm mt-1 whitespace-pre-wrap">
                                    {selectedMandate.description || 'No description provided'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Owner</Label>
                                    <p className="text-sm mt-1">
                                        {selectedMandate.ownerName}
                                        <br />
                                        <span className="text-muted-foreground">{selectedMandate.ownerEmail}</span>
                                    </p>
                                </div>

                                <div>
                                    <Label>Backup Owner</Label>
                                    <p className="text-sm mt-1">
                                        {selectedMandate.backupOwnerName ? (
                                            <>
                                                {selectedMandate.backupOwnerName}
                                                <br />
                                                <span className="text-muted-foreground">
                                                    {selectedMandate.backupOwnerEmail}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Status</Label>
                                    <div className="mt-1">
                                        <Badge variant={selectedMandate.status === 'open' ? 'default' : 'secondary'}>
                                            {selectedMandate.status}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <Label>Created</Label>
                                    <p className="text-sm mt-1">
                                        {new Date(selectedMandate.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
