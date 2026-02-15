"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
    id: string;
    title: string;
    message: string;
    link: string;
    read: boolean;
    createdAt: string;
}

export function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    async function fetchNotifications() {
        try {
            const res = await fetch('/api/notifications?limit=5');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetchingnotifications:', error);
        } finally {
            setLoading(false);
        }
    }

    async function markAsRead(notificationId: string) {
        try {
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No notifications
                    </div>
                ) : (
                    <ScrollArea className="max-h-96">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className="flex flex-col items-start p-3 cursor-pointer"
                                asChild
                            >
                                <Link
                                    href={notification.link}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex items-start justify-between w-full gap-2">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">
                                                {notification.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {notification.message}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <div className="h-2 w-2 bg-blue-500 rounded-full mt-1" />
                                        )}
                                    </div>
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/notifications" className="w-full text-center cursor-pointer">
                        View All Notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
