
"use client";

import { useState, useEffect } from "react";
import { Bell, Check } from "lucide-react";
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
import Link from "next/link";
import { toast } from "sonner";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.read).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}/read`, {
                method: "PATCH",
            });

            if (res.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const markAllRead = async () => {
        try {
            const res = await fetch("/api/notifications/mark-all-read", {
                method: "POST",
            });

            if (res.ok) {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
                toast.success("All notifications marked as read");
            }
        } catch (error) {
            console.error("Failed to mark all notifications as read", error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-xs"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-2">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 text-xs"
                            onClick={markAllRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read ? "bg-muted/50" : ""
                                    }`}
                                onSelect={(e) => e.preventDefault()}
                            >
                                <div className="flex w-full justify-between items-start gap-2">
                                    <div className="font-medium text-sm">{notification.title}</div>
                                    {!notification.read && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification.id);
                                            }}
                                        >
                                            <span className="sr-only">Mark read</span>
                                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        </Button>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                    {notification.message}
                                </div>
                                {notification.link && (
                                    <Link
                                        href={notification.link}
                                        className="text-xs text-primary hover:underline mt-1"
                                        onClick={() => markAsRead(notification.id)}
                                    >
                                        View details
                                    </Link>
                                )}
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    {new Date(notification.createdAt).toLocaleDateString()}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/notifications" className="w-full text-center cursor-pointer justify-center">
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
