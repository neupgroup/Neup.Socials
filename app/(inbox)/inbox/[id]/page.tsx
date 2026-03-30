'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Twitter, Facebook, Linkedin, MoreVertical, Phone, Video, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sendReplyAction } from '@/actions/inbox/sender';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    getConversationAction,
    listConversationMessagesAction,
    recordOutgoingMessageAction,
} from '@/actions/db';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    timestamp: string | null;
};

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
    const [loading, setLoading] = React.useState(true);
    const [sending, setSending] = React.useState(false);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
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
                const msgs = await listConversationMessagesAction(conversationId);
                if (active) {
                    setMessages(msgs as Message[]);
                }
            };

            fetchMessages();
            const interval = window.setInterval(fetchMessages, 5000);

            return () => {
                active = false;
                window.clearInterval(interval);
            };
        }
    }, [conversationId]);

    // Auto-scroll to bottom
    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
            conversation.contactId,
            currentReply
        );

        setSending(false);

        if (result.success && result.messageId && conversation) {
            const saved = await recordOutgoingMessageAction({
                conversationId,
                channelId: conversation.channelId,
                contactId: conversation.contactId,
                contactName: conversation.contactName,
                platform: conversation.platform,
                text: currentReply,
                avatar: conversation.avatar,
            });
            if (saved.conversation) {
                setConversation(saved.conversation as Conversation);
            }
            if (saved.message) {
                setMessages((prev) => [
                    ...prev.filter((message) => message.id !== tempId),
                    saved.message as Message,
                ]);
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
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">Conversation not found</h2>
                    <p className="text-muted-foreground">This conversation may have been deleted.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
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
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
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
                            {msg.sender === 'agent' && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://placehold.co/40x40" alt="Agent" />
                                    <AvatarFallback>NS</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-background p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendReply();
                    }}
                    className="flex gap-2"
                >
                    <Input
                        placeholder="Type your message..."
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        disabled={sending}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={sending || !reply.trim()}>
                        {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
