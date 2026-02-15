"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-destructive/10 p-3">
                            <AlertTriangle className="h-12 w-12 text-destructive" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl">500</CardTitle>
                    <CardTitle>Something Went Wrong</CardTitle>
                    <CardDescription className="mt-2">
                        An unexpected error occurred. Please try again or contact support if the problem persists.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error.message && (
                        <div className="bg-muted rounded-md p-3">
                            <p className="text-sm text-muted-foreground font-mono">
                                {error.message}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-center gap-2">
                        <Button onClick={reset}>Try Again</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
