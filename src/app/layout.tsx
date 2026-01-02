
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Settings,
  Users,
  MessageSquareText,
  AlertTriangle,
  LayoutGrid
} from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ProgressBar } from '@/components/progress-bar';

const navItems = [
  { href: '/', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/root/errors', icon: AlertTriangle, label: 'Errors'},
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // This layout will only apply to the root page, not to the main app pages.
  if (pathname !== '/') {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body className="font-body antialiased">
                <ProgressBar />
                {children}
                <Toaster />
            </body>
        </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ProgressBar />
        <SidebarProvider>
          <div className="flex min-h-screen w-full flex-col">
            
            <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm shadow-sm">
              <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
                <SidebarTrigger className="md:hidden" />
                <div className="flex items-center gap-4 ml-auto">
                  <Button variant="outline">Feedback</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="https://placehold.co/40x40" alt="User Avatar" />
                          <AvatarFallback>NS</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">Not Logged In</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Log In</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            <main className="flex-1 bg-background">
              <div className="container flex p-0">
                <Sidebar>
                  <SidebarHeader>
                    <Link href="/" className="flex items-center gap-2 p-2 pr-0">
                      <div className="flex items-center justify-center size-8 bg-primary rounded-lg text-primary-foreground">
                        <MessageSquareText className="size-5" />
                      </div>
                      <span className="font-semibold text-lg">Neup.Socials</span>
                    </Link>
                  </SidebarHeader>
                  <SidebarContent>
                    <SidebarMenu>
                      {navItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton
                              isActive={pathname.startsWith(item.href)}
                              tooltip={item.label}
                            >
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarContent>
                  <SidebarFooter className="p-4">
                     {/* Footer can be empty or have a generic message */}
                  </SidebarFooter>
                </Sidebar>

                <SidebarInset>
                  <div className="flex-1">{children}</div>
                </SidebarInset>
              </div>
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
