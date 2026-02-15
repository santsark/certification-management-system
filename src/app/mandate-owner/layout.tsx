import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { validateSession } from '@/lib/auth';
import { TopNav } from '@/components/navigation/top-nav';
import { Footer } from '@/components/navigation/footer';

export default async function MandateOwnerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check if user is mandate owner
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
        redirect('/login');
    }

    const session = await validateSession(sessionId);

    if (!session || session.user.role !== 'mandate_owner') {
        redirect('/403');
    }

    return (
        <div className="flex min-h-screen flex-col">
            <TopNav user={session.user} />
            <main className="flex-1 container py-6">
                {children}
            </main>
            <Footer />
        </div>
    );
}
