
'use client';

import * as React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from "@/components/ui/toaster";

export default function InboxLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider>
            {children}
            <Toaster />
        </SidebarProvider>
    );
}
