
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    MessageSquare,
    Send,
    Archive,
    Star,
    Trash2,
    Settings,
    Search,
    Filter,
    MessageSquareText,
    Users,
    Hash,
    Bell,
    BellOff,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

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
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
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
import { Toaster } from "@/components/ui/toaster";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const inboxNavItems = [
    { href: '/inbox', icon: MessageSquare, label: 'All Messages', count: 24 },
    { href: '/inbox/unread', icon: Bell, label: 'Unread', count: 12 },
    { href: '/inbox/starred', icon: Star, label: 'Starred', count: 5 },
    { href: '/inbox/sent', icon: Send, label: 'Sent' },
    { href: '/inbox/archived', icon: Archive, label: 'Archived' },
    { href: '/inbox/trash', icon: Trash2, label: 'Trash' },
];

const channelItems = [
    { href: '/inbox/facebook', icon: Hash, label: 'Facebook', platform: 'facebook' },
    { href: '/inbox/instagram', icon: Hash, label: 'Instagram', platform: 'instagram' },
    { href: '/inbox/whatsapp', icon: Hash, label: 'WhatsApp', platform: 'whatsapp' },
    { href: '/inbox/twitter', icon: Hash, label: 'Twitter', platform: 'twitter' },
];

export default function InboxLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full flex-col">
                <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm shadow-sm">
                    <div className="container flex h-14 items-center justify-between px-4 sm:px-6">
                        <div className="flex items-center gap-4">
                            <SidebarTrigger className="md:hidden" />
                            <h1 className="text-lg font-semibold">Inbox</h1>
                        </div>
                        <div className="flex items-center gap-4 ml-auto">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search messages..."
                                    className="pl-8 w-[300px]"
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
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
                                            <p className="text-sm font-medium leading-none">Neup Admin</p>
                                            <p className="text-xs leading-none text-muted-foreground">
                                                admin@neup.socials
                                            </p>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/analytics">Go to Dashboard</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>Profile</DropdownMenuItem>
                                    <DropdownMenuItem>Settings</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>Log out</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                <main className="flex-1 bg-background">
                    <div className="container flex p-0">
                        <Sidebar className="border-r">
                            <SidebarHeader>
                                <Link href="/" className="flex items-center gap-2 p-2 pr-0">
                                    <div className="flex items-center justify-center size-8 bg-primary rounded-lg text-primary-foreground">
                                        <MessageSquareText className="size-5" />
                                    </div>
                                    <span className="font-semibold text-lg">Neup.Socials</span>
                                </Link>
                            </SidebarHeader>

                            <SidebarContent>
                                <SidebarGroup>
                                    <SidebarGroupLabel>Messages</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {inboxNavItems.map((item) => (
                                                <SidebarMenuItem key={item.href}>
                                                    <Link href={item.href}>
                                                        <SidebarMenuButton
                                                            isActive={pathname === item.href}
                                                            tooltip={item.label}
                                                        >
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.label}</span>
                                                            {item.count !== undefined && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="ml-auto h-5 px-1.5 text-xs"
                                                                >
                                                                    {item.count}
                                                                </Badge>
                                                            )}
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                <SidebarGroup>
                                    <SidebarGroupLabel>Channels</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {channelItems.map((item) => (
                                                <SidebarMenuItem key={item.href}>
                                                    <Link href={item.href}>
                                                        <SidebarMenuButton
                                                            isActive={pathname === item.href}
                                                            tooltip={item.label}
                                                        >
                                                            <item.icon className="h-4 w-4" />
                                                            <span>{item.label}</span>
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                <SidebarGroup>
                                    <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton>
                                                    <Settings className="h-4 w-4" />
                                                    <span>Inbox Settings</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </SidebarContent>

                            <SidebarFooter className="p-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src="https://placehold.co/40x40" alt="@shadcn" />
                                        <AvatarFallback>NS</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                                        <span className="font-medium">Neup Admin</span>
                                        <span className="text-muted-foreground text-xs">Online</span>
                                    </div>
                                </div>
                            </SidebarFooter>
                        </Sidebar>

                        <SidebarInset>
                            <div className="flex-1">{children}</div>
                        </SidebarInset>
                    </div>
                </main>
            </div>
            <Toaster />
        </SidebarProvider>
    );
}
