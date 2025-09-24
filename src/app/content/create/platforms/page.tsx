'use client';

// This is a placeholder page. The actual creation flow moves the user to the edit path.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CreatePlatformsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        // This page should ideally not be reached directly.
        // Redirecting to the main content dashboard.
        router.replace('/content/create');
    }, [router]);

    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}
