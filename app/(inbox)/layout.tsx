
'use client';

import * as React from 'react';
import { SidebarProvider } from '#/components/ui/sidebar';

export default function InboxLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <SidebarProvider>
            {children}
        </SidebarProvider>
    );
}
