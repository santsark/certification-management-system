"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationDropdown } from "./notification-dropdown";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";

interface User {
    name: string;
    email: string;
    role: "admin" | "mandate_owner" | "attester";
}

interface TopNavProps {
    user: User;
}

interface NavLink {
    href: string;
    label: string;
    roles: User["role"][];
}

const navLinks: NavLink[] = [
    { href: "/admin/dashboard", label: "Dashboard", roles: ["admin"] },
    { href: "/admin/users", label: "Users", roles: ["admin"] },
    { href: "/admin/mandates", label: "Mandates", roles: ["admin"] },
    { href: "/mandate-owner/dashboard", label: "Dashboard", roles: ["mandate_owner"] },
    { href: "/mandate-owner/certifications", label: "Certifications", roles: ["mandate_owner"] },
    { href: "/attester/dashboard", label: "Dashboard", roles: ["attester"] },
];

export function TopNav({ user }: TopNavProps) {
    const pathname = usePathname();

    const userNavLinks = navLinks.filter((link) =>
        link.roles.includes(user.role)
    );

    function isActiveLink(href: string): boolean {
        return pathname === href || pathname.startsWith(href + "/");
    }

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Left: Logo & App Name */}
                <div className="flex items-center gap-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                        <FileCheck className="h-6 w-6" />
                        <span className="hidden sm:inline-block">CertificationHub</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {userNavLinks.map((link) => (
                            <Link key={link.href} href={link.href}>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "text-sm",
                                        isActiveLink(link.href) &&
                                        "bg-accent text-accent-foreground font-medium"
                                    )}
                                >
                                    {link.label}
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right: Notifications & User Menu */}
                <div className="flex items-center gap-2">
                    <NotificationDropdown />
                    <UserMenu user={user} />

                    {/* Mobile Menu */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-64">
                            <div className="flex flex-col gap-4 mt-8">
                                <div className="font-semibold text-sm text-muted-foreground uppercase">
                                    Navigation
                                </div>
                                {userNavLinks.map((link) => (
                                    <Link key={link.href} href={link.href}>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start",
                                                isActiveLink(link.href) &&
                                                "bg-accent text-accent-foreground font-medium"
                                            )}
                                        >
                                            {link.label}
                                        </Button>
                                    </Link>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </nav>
    );
}
