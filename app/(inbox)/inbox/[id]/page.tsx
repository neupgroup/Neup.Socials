'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Input } from '#/components/ui/input';
import { Button } from '#/components/ui/button';
import { Send, Loader2, Twitter, Facebook, Linkedin, MoreVertical, Phone, Video, Info, ExternalLink, Play, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sendReplyAction } from '@/services/inbox/sender';
import { useToast } from '#/core/hooks/useToast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import {
    getConversationAction,
    listConversationMessagesAction,
    listInstagramConversationMessagesAction,
    updateConversationFetchMetadataAction,
} from '@/services/conversations/actions';
import { recordOutgoingMessageAction } from '@/services/messages/actions';
import { normalizeInstagramAttachment } from '@/services/platform/instagram/attachments';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: string | null;
  attachments?: Array<{ type?: string; url?: string; media_url?: string; thumbnail_url?: string; title?: string }>;
  replyTo?: { id: string; text: string };
};

function MessageSkeletons({ count = 5 }: { count?: number }) {
    return <div className="space-y-4" aria-label="Loading messages">
        {Array.from({ length: count }, (_, index) => <div key={index} className={`flex items-end gap-3 ${index % 2 ? 'justify-end' : ''}`}>
            {index % 2 === 0 ? <div className="h-8 w-8 animate-pulse rounded-full bg-muted" /> : null}
            <div className={`space-y-2 ${index % 2 ? 'items-end' : ''}`}>
                <div className={`h-4 animate-pulse rounded bg-muted ${index % 2 ? 'w-40' : 'w-52'}`} />
                <div className={`h-3 animate-pulse rounded bg-muted/70 ${index % 2 ? 'w-24' : 'w-32'}`} />
            </div>
        </div>)}
    </div>;
}

function ConversationSkeleton() {
    return <div className="flex h-full flex-col" aria-label="Loading conversation">
        <div className="shrink-0 border-b bg-background p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="space-y-2">
                        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-20 animate-pulse rounded bg-muted/70" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
                    <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
                    <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
                </div>
            </div>
        </div>
        <div className="flex-1 overflow-hidden bg-muted/20 p-6">
            <MessageSkeletons />
        </div>
        <ConversationComposer disabled placeholder="Loading conversation..." />
    </div>;
}

function ConversationComposer({
    reply = '',
    onReplyChange,
    onSubmit,
    sending = false,
    replyingTo,
    onCancelReply,
    disabled = false,
    placeholder = 'Type your message...',
}: {
    reply?: string;
    onReplyChange?: (value: string) => void;
    onSubmit?: () => void;
    sending?: boolean;
    replyingTo?: Message | null;
    onCancelReply?: () => void;
    disabled?: boolean;
    placeholder?: string;
}) {
    return (
        <div className="sticky bottom-0 z-20 shrink-0 border-t bg-background p-4">
            {replyingTo ? <div className="mb-2 flex items-center justify-between rounded-md border-l-2 border-primary bg-muted px-3 py-2 text-xs"><span className="truncate">Replying to: {replyingTo.text || 'Unsupported message'}</span><Button type="button" variant="ghost" size="sm" onClick={onCancelReply}>Cancel</Button></div> : null}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit?.();
                }}
                className="flex gap-2"
            >
                <Input
                    placeholder={placeholder}
                    value={reply}
                    onChange={(event) => onReplyChange?.(event.target.value)}
                    disabled={disabled || sending}
                    className="flex-1"
                />
                <Button type="submit" disabled={disabled || sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </div>
    );
}

function MessageAttachments({ attachments }: { attachments?: Message['attachments'] }) {
    if (!attachments?.length) return null;
    return <div className="mt-2 space-y-2">{attachments.map((attachment, index) => {
        const normalized = normalizeInstagramAttachment(attachment as unknown as Record<string, unknown>);
        const mediaUrl = normalized.url;
        const rawType = String(attachment.type ?? '').toLowerCase();
        const isOneTime = rawType.includes('ephemeral') || rawType.includes('one_time') || rawType.includes('view_once');
        if (isOneTime) return <div key={index} className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">This one-time photo or video can’t be shown on this platform.</div>;
        if (!mediaUrl && !normalized.permalink) return <div key={index} className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Instagram media</div>;
        return <a key={index} href={normalized.permalink || mediaUrl || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-muted"><ExternalLink className="h-4 w-4" />{normalized.permalink ? 'Open on Instagram' : `Open Instagram ${normalized.type} attachment`}</a>;
    })}</div>;
}

type Conversation = {
    id: string;
    contactName: string;
    contactId: string;
    channelId: string;
    moreDetails?: unknown;
    platform: string;
    lastMessage: string;
    lastMessageAt: string | null;
    avatar: string;
    unread: boolean;
};

function instagramRecipientId(conversation: Conversation): string {
    const details = conversation.moreDetails as { platformInfo?: { recipientId?: string } } | null;
    return details?.platformInfo?.recipientId || conversation.contactId;
}

function timestampValue(value?: string | null): number {
    if (!value) return 0;
    const normalized = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const timestamp = Date.parse(normalized);
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M.052 24l1.688-6.164a11.91 11.91 0 01-1.74-6.36C.002 5.075 5.373 0 12.002 0s11.998 5.074 11.998 11.474c0 6.4-5.372 11.475-11.998 11.475a11.859 11.859 0 01-5.94-1.542L.052 24zm6.65-3.666a9.888 9.888 0 0011.082-9.556c0-5.473-4.437-9.91-9.91-9.91-5.473 0-9.91 4.437-9.91 9.91a9.89 9.89 0 003.834 7.62l-1.12 4.09 4.2-1.074zM12.002 2.148c4.34 0 7.864 3.525 7.864 7.864s-3.524 7.864-7.864 7.864-7.864-3.525-7.864-7.864c0-2.12.842-4.045 2.215-5.48a7.765 7.765 0 015.65-2.384zm-3.097 2.922c-.15-.002-.325.042-.47.27-.144.228-.48.77-.582.92-.102.148-.204.168-.346.102-.143-.064-1.012-.468-1.928-1.19a6.685 6.685 0 01-1.39-1.623c-.144-.246-.072-.38.06-.504.12-.11.264-.288.396-.432.108-.12.144-.204.216-.348.072-.143.036-.264-.012-.348-.05-.084-.468-.996-.636-1.356-.156-.324-.312-.276-.432-.282-.11-.006-.24-.006-.372-.006-.131 0-.347.042-.522.282-.174.24-.66.636-.66 1.542 0 .906.672 1.782.768 1.902.096.12 1.32 2.016 3.204 2.82.42.18.768.288 1.032.372.432.144.828.12 1.14.072.36-.06.996-.528 1.14-1.032.143-.504.143-.924.108-1.008-.036-.084-.144-.132-.3-.216z" />
    </svg>
);

const PlatformIcon = ({ platform }: { platform: string }) => {
    const props = { className: "h-4 w-4" };
    if (platform === 'Twitter') return <Twitter {...props} className="text-blue-400" />;
    if (platform === 'Facebook') return <Facebook {...props} className="text-blue-600" />;
    if (platform === 'LinkedIn') return <Linkedin {...props} className="text-blue-700" />;
    if (platform === 'WhatsApp') return <WhatsAppIcon {...props} className="text-green-500" />;
    return null;
};

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.id as string;

    const [conversation, setConversation] = React.useState<Conversation | null>(null);
    const [messages, setMessages] = React.useState<Message[]>([]);
    const [reply, setReply] = React.useState('');
    const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [messagesLoading, setMessagesLoading] = React.useState(true);
    const [sending, setSending] = React.useState(false);
    const [olderCursor, setOlderCursor] = React.useState<string | null>(null);
    const [loadingOlder, setLoadingOlder] = React.useState(false);

    const messagesContainerRef = React.useRef<HTMLDivElement>(null);
    const isAtBottomRef = React.useRef(true);
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchConversation = async () => {
            try {
                const conversationData = await getConversationAction(conversationId);
                if (conversationData) {
                    setConversation(conversationData as Conversation);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching conversation:', error);
                setLoading(false);
            }
        };

        fetchConversation();
    }, [conversationId]);

    React.useEffect(() => {
        if (conversationId) {
            let active = true;

            const fetchMessages = async () => {
                setMessagesLoading(true);
                if (conversation?.platform === 'Instagram') {
                    try {
                    const msgs = await listConversationMessagesAction(conversationId);
                    if (active) {
                        const sortedMessages = [...msgs]
                            .sort((a, b) => timestampValue(a.messageTime) - timestampValue(b.messageTime))
                            .map((message) => ({
                                id: message.id,
                                text: message.content ?? '',
                                sender: message.direction === 'sent' || message.direction === 'system' ? 'agent' as const : 'user' as const,
                                timestamp: message.messageTime ?? null,
                            }));
                        setMessages(sortedMessages);
                        const timestamps = sortedMessages.map((message) => message.timestamp).filter(Boolean) as string[];
                        if (timestamps.length) {
                            void updateConversationFetchMetadataAction(conversationId, {
                                messageSince: timestamps[0],
                                messageUpto: timestamps[timestamps.length - 1],
                            });
                        }
                    }
                    } finally {
                        if (active) setMessagesLoading(false);
                    }
                    return;
                }

                try {
                    const msgs = await listConversationMessagesAction(conversationId);
                    if (active) {
                        setMessages(msgs.map((message) => ({
                            id: message.id,
                            text: message.content,
                            sender: message.direction === 'sent' || message.direction === 'system' ? 'agent' : 'user',
                            timestamp: message.messageTime,
                            attachments: (message.platformInfo as { attachments?: Message['attachments'] } | null)?.attachments,
                        })));
                    }
                } finally {
                    if (active) setMessagesLoading(false);
                }
            };

            if (isAtBottomRef.current) void fetchMessages();
            const interval = window.setInterval(() => {
                if (isAtBottomRef.current) void fetchMessages();
            }, 5000);

            return () => {
                active = false;
                window.clearInterval(interval);
            };
        }
    }, [conversationId, conversation]);

    const handleMessagesScroll = async (event: React.UIEvent<HTMLDivElement>, preservePosition = false) => {
        const element = event.currentTarget;
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
        if (!preservePosition) {
            isAtBottomRef.current = atBottom;
        }
        if (element.scrollTop > 48 || !olderCursor || loadingOlder || conversation?.platform !== 'Instagram') return;

        const previousHeight = element.scrollHeight;
        setLoadingOlder(true);
        try {
            const result = await listInstagramConversationMessagesAction(conversationId, olderCursor);
            const olderMessages = [...(result?.messages?.data ?? [])].sort((a, b) => timestampValue(a.created_time) - timestampValue(b.created_time));
            setMessages((current) => [
                ...olderMessages.map((message) => ({
                    id: message.id,
                    text: message.message ?? '',
                    sender: message.from?.id === conversation.channelId ? 'agent' as const : 'user' as const,
                    timestamp: message.created_time ?? null,
                    attachments: message.attachments?.data,
                    replyTo: message.reply_to ? { id: message.reply_to.id, text: message.reply_to.message ?? '' } : undefined,
                })),
                ...current.filter((currentMessage) => !olderMessages.some((message) => message.id === currentMessage.id)),
            ]);
            setOlderCursor(result?.messages?.paging?.next ?? null);
            const oldest = olderMessages[0]?.created_time;
            if (oldest) {
                void updateConversationFetchMetadataAction(conversationId, {
                    messageSince: oldest,
                    ...(result?.messages?.paging?.next ? {} : { firstMessageOn: oldest }),
                });
            }
            requestAnimationFrame(() => {
                element.scrollTop += element.scrollHeight - previousHeight;
            });
        } finally {
            setLoadingOlder(false);
        }
    };

    React.useEffect(() => {
        const element = messagesContainerRef.current;
        if (!element || messagesLoading || loadingOlder || !olderCursor || messages.length === 0) return;

        // A short conversation may not produce a scroll event at all. Keep pulling
        // older pages until the pane can scroll or the API reports its beginning.
        if (element.scrollHeight <= element.clientHeight + 1) {
            isAtBottomRef.current = false;
            void handleMessagesScroll({ currentTarget: element } as React.UIEvent<HTMLDivElement>, true);
        }
    }, [messages, messagesLoading, loadingOlder, olderCursor]);

    // Auto-scroll to bottom
    React.useEffect(() => {
        const element = messagesContainerRef.current;
        if (element && isAtBottomRef.current) {
            element.scrollTop = element.scrollHeight;
        }
    }, [messages]);

    const handleSendReply = async () => {
        if (!reply.trim() || !conversation) return;

        setSending(true);

        // Optimistically add message to UI
        const tempId = `temp_${Date.now()}`;
        const newMessage: Message = {
            id: tempId,
            text: reply,
            sender: 'agent',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
        const currentReply = reply;
        setReply('');

        const result = await sendReplyAction(
            conversation.platform,
            conversation.channelId,
            conversation.platform === 'Instagram' ? instagramRecipientId(conversation) : conversation.contactId,
            currentReply,
            undefined,
            undefined,
            undefined,
            replyingTo?.id,
            conversationId
        );

        setSending(false);
        setReplyingTo(null);

        if (result.success && result.messageId && conversation) {
            if (conversation.platform !== 'Facebook' && conversation.platform !== 'Instagram') {
                const saved = await recordOutgoingMessageAction({
                    conversationId,
                    channelId: conversation.channelId,
                    contactId: conversation.contactId,
                    contactName: conversation.contactName,
                    platform: conversation.platform,
                    text: currentReply,
                    avatar: conversation.avatar,
                    platformMessageId: result.messageId,
                });
                if (saved.conversation) {
                    setConversation(saved.conversation as Conversation);
                }
                if (saved.message) {
                    setMessages((prev) => prev.filter((message) => message.id !== tempId));
                }
            } else {
                setMessages((prev) => prev.filter((message) => message.id !== tempId));
            }
        } else {
            toast({
                title: 'Failed to send message',
                description: result.error || 'An unknown error occurred.',
                variant: 'destructive'
            });
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setReply(currentReply);
        }
    };

    if (loading) {
        return <ConversationSkeleton />;
    }

    if (!conversation) {
        return (
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-6">
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-semibold">Conversation not found</h2>
                        <p className="text-muted-foreground">This conversation may have been deleted.</p>
                    </div>
                </div>
                <ConversationComposer disabled placeholder="Conversation unavailable" />
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Header */}
            <div className="sticky top-0 z-20 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage
                                src={`https://placehold.co/40x40?text=${conversation.avatar}`}
                                alt={conversation.contactName}
                            />
                            <AvatarFallback>{conversation.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">{conversation.contactName}</h2>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <PlatformIcon platform={conversation.platform} />
                                <span>{conversation.platform}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                            <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                            <Video className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <Info className="h-4 w-4 mr-2" />
                                    Contact Info
                                </DropdownMenuItem>
                                <DropdownMenuItem>Archive Conversation</DropdownMenuItem>
                                <DropdownMenuItem>Mark as Unread</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                    Delete Conversation
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="relative min-h-0 flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
                {loadingOlder ? <MessageSkeletons count={2} /> : null}
                {messagesLoading && messages.length === 0 ? <MessageSkeletons /> : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={`${msg.id}-${msg.timestamp ?? 'no-time'}-${index}`}
                            className={`flex items-end gap-3 ${msg.sender === 'agent' ? 'justify-end' : ''}`}
                        >
                            {msg.sender === 'user' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage
                                        src={`https://placehold.co/40x40?text=${conversation.avatar}`}
                                        alt={conversation.contactName}
                                    />
                                    <AvatarFallback>{conversation.avatar}</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={`group relative max-w-xs lg:max-w-md ${msg.sender === 'user'
                                        ? 'bg-background border rounded-2xl rounded-bl-sm'
                                        : 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
                                    }`}
                            >
                                <div className="px-4 py-2.5">
                                    {msg.replyTo ? <div className="mb-2 border-l-2 border-current/40 pl-2 text-xs opacity-70">Replying to: {msg.replyTo.text || 'Unsupported message'}</div> : null}
                                    {msg.text ? <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p> : null}
                                    <MessageAttachments attachments={msg.attachments} />
                                </div>
                                {msg.timestamp && (
                                    <div className={`px-4 pb-1 text-xs ${msg.sender === 'user' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                                        }`}>
                                        {formatDistanceToNow(
                                            new Date(msg.timestamp),
                                            { addSuffix: true }
                                        )}
                                    </div>
                                )}
                            </div>
                            {conversation.platform === 'Instagram' && !msg.id.startsWith('temp_') ? <Button type="button" variant="ghost" size="icon" className="h-7 w-7 self-center opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setReplyingTo(msg)} aria-label="Reply to message"><Reply className="h-3.5 w-3.5" /></Button> : null}
                            {msg.sender === 'agent' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://placehold.co/40x40" alt="Agent" />
                                    <AvatarFallback>NS</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Input */}
            <ConversationComposer
                reply={reply}
                onReplyChange={setReply}
                onSubmit={handleSendReply}
                sending={sending}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
            />
        </div>
    );
}
