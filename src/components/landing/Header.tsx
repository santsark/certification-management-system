
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>CertManager</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
