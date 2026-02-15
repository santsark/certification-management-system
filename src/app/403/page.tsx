import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Forbidden() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-destructive/10 p-3">
                            <ShieldAlert className="h-12 w-12 text-destructive" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl">403</CardTitle>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription className="mt-2">
                        You don't have permission to access this page. Please contact your administrator if you believe this is an error.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/">Go to Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
