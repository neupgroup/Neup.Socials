
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
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';

const inboxNavItems = [
    { href: '/inbox', icon: MessageSquare, label: 'All Messages', count: 24 },
    { href: '/inbox/unread', icon: Bell, label: 'Unread', count: 12 },
];

// Filter tags
const filterTags = [
    { href: '/inbox/starred', icon: Star, label: 'Starred', count: 5 },
    { href: '/inbox/sent', icon: Send, label: 'Sent' },
    { href: '/inbox/archived', icon: Archive, label: 'Archived' },
    { href: '/inbox/trash', icon: Trash2, label: 'Trash' },
];

// Channel tags
const channelTags = [
    { href: '/inbox/facebook', icon: Hash, label: 'Facebook', color: 'bg-blue-500' },
    { href: '/inbox/instagram', icon: Hash, label: 'Instagram', color: 'bg-pink-500' },
    { href: '/inbox/whatsapp', icon: Hash, label: 'WhatsApp', color: 'bg-green-500' },
    { href: '/inbox/twitter', icon: Hash, label: 'Twitter', color: 'bg-sky-500' },
];

type Conversation = {
    id: string;
    contactName: string;
    contactId: string;
    channelId: string;
    platform: string;
    lastMessage: string;
    lastMessageAt: any;
    avatar: string;
    unread: boolean;
};

const getPlatformColor = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower === 'whatsapp') return 'bg-green-500';
    if (platformLower === 'instagram') return 'bg-pink-500';
    if (platformLower === 'facebook') return 'bg-blue-500';
    if (platformLower === 'twitter') return 'bg-sky-500';
    if (platformLower === 'linkedin') return 'bg-blue-700';
    return 'bg-gray-500';
};

export default function InboxLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [loading, setLoading] = React.useState(true);

    // Fetch real conversations from Firebase
    React.useEffect(() => {
        const q = query(
            collection(db, 'conversations'),
            orderBy('lastMessageAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const convos: Conversation[] = [];
            querySnapshot.forEach((doc) => {
                convos.push({ id: doc.id, ...doc.data() } as Conversation);
            });
            setConversations(convos);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching conversations:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
                                {/* Search Bar */}
                                <div className="px-3 py-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="search"
                                            placeholder="Search conversations..."
                                            className="pl-8 h-9"
                                        />
                                    </div>
                                </div>

                                {/* Navigation Items */}
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

                                {/* Filter Tags */}
                                <SidebarGroup>
                                    <SidebarGroupLabel>Filters</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <div className="flex flex-wrap gap-1.5 px-2">
                                            {filterTags.map((tag) => (
                                                <Link key={tag.href} href={tag.href}>
                                                    <Badge
                                                        variant={pathname === tag.href ? "default" : "outline"}
                                                        className="cursor-pointer hover:bg-accent transition-colors"
                                                    >
                                                        <tag.icon className="h-3 w-3 mr-1" />
                                                        {tag.label}
                                                        {tag.count !== undefined && ` (${tag.count})`}
                                                    </Badge>
                                                </Link>
                                            ))}
                                        </div>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                {/* Channel Tags */}
                                <SidebarGroup>
                                    <SidebarGroupLabel>Channels</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <div className="flex flex-wrap gap-1.5 px-2">
                                            {channelTags.map((tag) => (
                                                <Link key={tag.href} href={tag.href}>
                                                    <Badge
                                                        variant={pathname === tag.href ? "default" : "outline"}
                                                        className="cursor-pointer hover:bg-accent transition-colors"
                                                    >
                                                        <div className={`h-2 w-2 rounded-full ${tag.color} mr-1.5`} />
                                                        {tag.label}
                                                    </Badge>
                                                </Link>
                                            ))}
                                        </div>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                {/* Conversations List */}
                                <SidebarGroup>
                                    <SidebarGroupLabel>Conversations</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        {loading ? (
                                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                Loading...
                                            </div>
                                        ) : conversations.length === 0 ? (
                                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                No conversations yet
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {conversations.map((conversation) => (
                                                    <Link
                                                        key={conversation.id}
                                                        href={`/inbox/${conversation.id}`}
                                                        className="block"
                                                    >
                                                        <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors cursor-pointer">
                                                            <div className="relative flex-shrink-0">
                                                                <Avatar className="h-10 w-10">
                                                                    <AvatarImage
                                                                        src={`https://placehold.co/40x40?text=${conversation.avatar}`}
                                                                        alt={conversation.contactName}
                                                                    />
                                                                    <AvatarFallback>{conversation.avatar}</AvatarFallback>
                                                                </Avatar>
                                                                <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full ${getPlatformColor(conversation.platform)} border-2 border-background`} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                    <p className="text-sm font-semibold truncate">
                                                                        {conversation.contactName}
                                                                    </p>
                                                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                                                        {conversation.lastMessageAt
                                                                            ? formatDistanceToNow(conversation.lastMessageAt.toDate(), { addSuffix: true })
                                                                            : ''
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {conversation.lastMessage}
                                                                    </p>
                                                                    {conversation.unread && (
                                                                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
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
