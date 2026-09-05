
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    MessageSquare,
    Send,
    Archive,
    Star,
    Trash2,
    Search,
    Filter,
    MessageSquareText,
    Hash,
    Bell,
    Menu,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import {
    Sidebar,
    SidebarProvider,




} from '#/components/ui/sidebar';
import { NavButton } from '#/components/ui/navbutton';
import { Button } from '#/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Input } from '#/components/ui/input';
import { Badge } from '#/components/ui/badge';
import { Sheet, SheetContent } from '#/components/ui/sheet';
import { Userbar } from '#/components/element/userbar';
import { formatDistanceToNow } from 'date-fns';
import { listConversationsAction } from '@/services/conversations/actions';
import { listInstagramConversationsAction } from '@/services/conversations/actions';
import { application } from '@/base/application';

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
    lastMessageAt: string | null;
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

// Sidebar content component for reuse
function InboxSidebarContent({
    pathname,
    conversations,
    loading
}: {
    pathname: string;
    conversations: Conversation[];
    loading: boolean;
}) {
    const router = useRouter();

    return (
        <div className="flex h-full flex-col bg-background">
            <div className="border-b border-border p-5">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex items-center justify-center size-8 bg-primary rounded-lg text-primary-foreground">
                        <MessageSquareText className="size-5" />
                    </div>
                    <span className="font-semibold text-lg">{application.appName}</span>
                </Link>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-3">
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
                <section className="space-y-2">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Messages</p>
                    <div className="space-y-1">
                            {inboxNavItems.map((item) => (
                                <li key={item.href}>
                                    <NavButton
                                        type="button"
                                        active={pathname === item.href}
                                        variant="text"
                                        className="w-full justify-start hover:!bg-transparent hover:!text-foreground active:!bg-transparent active:!text-foreground data-[active=true]:!bg-primary/20 data-[active=true]:!text-primary data-[active=true]:hover:!bg-primary/30"
                                        onClick={() => router.push(item.href)}
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
                                    </NavButton>
                                </li>
                            ))}
                        </div>
                </section>

                {/* Filter Tags */}
                <section className="space-y-2">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Filters</p>
                    <div>
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
                    </div>
                </section>

                {/* Channel Tags */}
                <section className="space-y-2">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Channels</p>
                    <div>
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
                    </div>
                </section>

                {/* Conversations List */}
                <section className="space-y-2">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Conversations</p>
                    <div>
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
                                                            ? formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: true })
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
                    </div>
                </section>
            </div>

            <div className="border-t border-border p-4">
                <Userbar displayName="Neup Admin" neupid="neupkishor" className="w-full justify-end" />
            </div>
        </div>
    );
}

export default function InboxLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const pathname = usePathname();
    const [conversations, setConversations] = React.useState<Conversation[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [mobileOpen, setMobileOpen] = React.useState(false);

    React.useEffect(() => {
        let active = true;

        const fetchConversations = async () => {
            try {
                const convos = await listConversationsAction();
                if (active) {
                    setConversations(convos as Conversation[]);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching conversations:', error);
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchConversations();
        const interval = window.setInterval(fetchConversations, 10000);

        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    React.useEffect(() => {
        if (pathname !== '/inbox/instagram') return;
        void listInstagramConversationsAction();
    }, [pathname]);

    return (
        <SidebarProvider>
                <div className="flex min-h-screen w-full">
                {/* Desktop Sidebar */}
                <Sidebar className="hidden md:flex border-r">
                    <InboxSidebarContent
                        pathname={pathname}
                        conversations={conversations}
                        loading={loading}
                    />
                </Sidebar>

                {/* Mobile Sheet Sidebar */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetContent side="left" className="p-0 w-80">
                        <div className="flex flex-col h-full">
                            <InboxSidebarContent
                                pathname={pathname}
                                conversations={conversations}
                                loading={loading}
                            />
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Main Content */}
                <main className="flex-1">
                    {/* Mobile Header */}
                    <header className="sticky top-0 z-10 flex md:hidden h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setMobileOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <h1 className="text-lg font-semibold">Inbox</h1>
                        <div className="ml-auto flex items-center gap-2">
                            <Button variant="ghost" size="icon">
                                <Search className="h-4 w-4" />
                            </Button>
                            <Userbar displayName="Neup Admin" neupid="neupkishor" />
                        </div>
                    </header>

                    {/* Page Content */}
                    <div className="flex-1">{children}</div>
                </main>
                </div>
        </SidebarProvider>
    );
}
