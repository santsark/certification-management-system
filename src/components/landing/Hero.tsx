
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
            <div className="flex max-w-[980px] flex-col items-start gap-2">
                <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl lg:leading-[1.1]">
                    Streamline Your Certification Management
                </h1>
                <p className="max-w-[750px] text-lg text-muted-foreground sm:text-l">
                    A centralized platform for tracking mandates, managing role-based access, and ensuring compliance across your entire organization.
                    Say goodbye to spreadsheets and missed deadlines.
                </p>
            </div>
            <div className="flex gap-4">
                <Link href="/login">
                    <Button size="lg" className="h-11 px-8">
                        Get Started
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
                <Link href="#features">
                    <Button variant="outline" size="lg" className="h-11 px-8">
                        Learn More
                    </Button>
                </Link>
            </div>
            <div className="mx-auto w-full max-w-screen-xl px-2.5 md:px-20 lg:px-40 mt-8">
                <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted/50 shadow-xl border-zinc-200 dark:border-zinc-800">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
                        Dashboard Preview Placeholder
                    </div>
                </div>
            </div>
        </section>
    );
}
