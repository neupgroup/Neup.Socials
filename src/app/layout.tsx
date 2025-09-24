'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Inbox,
  LayoutGrid,
  Settings,
  Users,
  MessageSquareText,
  PlusSquare,
  AlertTriangle,
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
import { Toaster } from "@/components/ui/toaster"

const navItems = [
  { href: '/analytics', icon: LayoutGrid, label: 'Analytics' },
  { href: '/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/content', icon: PlusSquare, label: 'Content' },
  { href: '/inbox', icon: Inbox, label: 'Inbox' },
  { href: '/accounts', icon: Users, label: 'Accounts' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/root/errors', icon: AlertTriangle, label: 'Errors'},
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
          <div className="flex min-h-screen w-full flex-col">
            
            {/* HEADER - full width background + container */}
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
                          <AvatarFallback>TS</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">Team Admin</p>
                          <p className="text-xs leading-none text-muted-foreground">
                            admin@teamsocial.com
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Profile</DropdownMenuItem>
                      <DropdownMenuItem>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Log out</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </header>

            {/* MAIN - full width background + container */}
            <main className="flex-1 bg-background">
              <div className="container flex p-0">
                <Sidebar>
                  <SidebarHeader>
                    <div className="flex items-center gap-2 p-2 pr-0">
                      <div className="flex items-center justify-center size-8 bg-primary rounded-lg text-primary-foreground">
                        <MessageSquareText className="size-5" />
                      </div>
                      <span className="font-semibold text-lg">TeamSocial</span>
                    </div>
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
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="https://placehold.co/40x40" alt="@shadcn" />
                        <AvatarFallback>TS</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                        <span className="font-medium">Team Admin</span>
                        <span className="text-muted-foreground">admin@teamsocial.com</span>
                      </div>
                    </div>
                  </SidebarFooter>
                </Sidebar>

                {/* CONTENT */}
                <SidebarInset>
                  <div className="flex-1 p-6">{children}</div>
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
