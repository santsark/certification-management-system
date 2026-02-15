"use client";

import { LogOut, KeyRound, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface UserMenuProps {
    user: {
        name: string;
        email: string;
        role: string;
    };
}

export function UserMenu({ user }: UserMenuProps) {
    const router = useRouter();

    async function handleLogout() {
        try {
            const res = await fetch('/api/auth/logout', {
                method: 'POST',
            });

            if (res.ok) {
                toast.success('Logged out successfully');
                router.push('/login');
                router.refresh();
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Failed to logout');
        }
    }

    function getInitials(name: string): string {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => router.push('/change-password')}
                    className="cursor-pointer"
                >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
