import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-muted p-3">
                            <FileQuestion className="h-12 w-12 text-muted-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl">404</CardTitle>
                    <CardTitle>Page Not Found</CardTitle>
                    <CardDescription className="mt-2">
                        The page you're looking for doesn't exist or has been moved.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button asChild>
                        <Link href="/">Go to Home</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
