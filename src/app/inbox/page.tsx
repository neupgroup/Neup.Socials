'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, Twitter, Facebook, Linkedin, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: any;
};

type Conversation = {
  id: string;
  contactName: string;
  platform: string;
  lastMessage: string;
  lastMessageAt: any;
  avatar: string;
  unread: boolean;
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M.052 24l1.688-6.164a11.91 11.91 0 01-1.74-6.36C.002 5.075 5.373 0 12.002 0s11.998 5.074 11.998 11.474c0 6.4-5.372 11.475-11.998 11.475a11.859 11.859 0 01-5.94-1.542L.052 24zm6.65-3.666a9.888 9.888 0 0011.082-9.556c0-5.473-4.437-9.91-9.91-9.91-5.473 0-9.91 4.437-9.91 9.91a9.89 9.89 0 003.834 7.62l-1.12 4.09 4.2-1.074zM12.002 2.148c4.34 0 7.864 3.525 7.864 7.864s-3.524 7.864-7.864 7.864-7.864-3.525-7.864-7.864c0-2.12.842-4.045 2.215-5.48a7.765 7.765 0 015.65-2.384zm-3.097 2.922c-.15-.002-.325.042-.47.27-.144.228-.48.77-.582.92-.102.148-.204.168-.346.102-.143-.064-1.012-.468-1.928-1.19a6.685 6.685 0 01-1.39-1.623c-.144-.246-.072-.38.06-.504.12-.11.264-.288.396-.432.108-.12.144-.204.216-.348.072-.143.036-.264-.012-.348-.05-.084-.468-.996-.636-1.356-.156-.324-.312-.276-.432-.282-.11-.006-.24-.006-.372-.006-.131 0-.347.042-.522.282-.174.24-.66.636-.66 1.542 0 .906.672 1.782.768 1.902.096.12 1.32 2.016 3.204 2.82.42.18.768.288 1.032.372.432.144.828.12 1.14.072.36-.06.996-.528 1.14-1.032.143-.504.143-.924.108-1.008-.036-.084-.144-.132-.3-.216z"/>
    </svg>
);

const PlatformIcon = ({ platform }: { platform: string }) => {
  const props = {className: "h-4 w-4"};
  if (platform === 'Twitter') return <Twitter {...props} className="text-blue-400" />;
  if (platform === 'Facebook') return <Facebook {...props} className="text-blue-600" />;
  if (platform === 'LinkedIn') return <Linkedin {...props} className="text-blue-700" />;
  if (platform === 'WhatsApp') return <WhatsAppIcon {...props} className="text-green-500" />;
  return null;
};

export default function InboxPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [reply, setReply] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'conversations'), orderBy('lastMessageAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const convos: Conversation[] = [];
      querySnapshot.forEach((doc) => {
        convos.push({ id: doc.id, ...doc.data() } as Conversation);
      });
      setConversations(convos);
      if(!selectedConversation && convos.length > 0){
        setSelectedConversation(convos[0]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (selectedConversation) {
      const q = query(collection(db, 'conversations', selectedConversation.id, 'messages'), orderBy('timestamp'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const msgs: Message[] = [];
        querySnapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
      });
      return () => unsubscribe();
    }
  }, [selectedConversation]);
  
   React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSendReply = async () => {
    if (!reply.trim() || !selectedConversation) return;
    setSending(true);
    const messagesCol = collection(db, 'conversations', selectedConversation.id, 'messages');
    await addDoc(messagesCol, {
      text: reply,
      sender: 'agent',
      timestamp: serverTimestamp(),
    });
    setReply('');
    setSending(false);
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.28))]">
      <h1 className="text-3xl font-bold mb-6">Unified Inbox</h1>
      <Card className="h-full">
        <div className="grid md:grid-cols-[350px_1fr] h-full">
          <div className="border-r flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search messages..." className="pl-10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                 <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
              ) : (
                conversations.map((convo) => (
                  <div
                    key={convo.id}
                    className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-accent ${selectedConversation?.id === convo.id ? 'bg-accent' : ''}`}
                    onClick={() => setSelectedConversation(convo)}
                  >
                    <Avatar>
                      <AvatarImage src={`https://placehold.co/40x40?text=${convo.avatar}`} />
                      <AvatarFallback>{convo.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate">{convo.contactName}</span>
                        <span className="text-xs text-muted-foreground">
                          {convo.lastMessageAt ? formatDistanceToNow(convo.lastMessageAt.toDate(), { addSuffix: true }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
                    </div>
                    {convo.unread && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5"></div>}
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col h-full">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedConversation.contactName}</h2>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                       <PlatformIcon platform={selectedConversation.platform} />
                      <span>{selectedConversation.platform}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  {messages.map((msg, index) => (
                     <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'agent' ? 'justify-end' : ''}`}>
                      {msg.sender === 'user' && (
                        <Avatar className="h-8 w-8">
                           <AvatarImage src={`https://placehold.co/40x40?text=${selectedConversation.avatar}`} />
                           <AvatarFallback>{selectedConversation.avatar}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.sender === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      {msg.sender === 'agent' && (
                        <Avatar className="h-8 w-8">
                           <AvatarImage src="https://placehold.co/40x40" />
                           <AvatarFallback>TS</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t bg-background">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendReply(); }} className="relative">
                    <Input placeholder="Type your reply..." value={reply} onChange={(e) => setReply(e.target.value)} className="pr-12" disabled={sending} />
                    <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" disabled={sending}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : 'Select a message to view the conversation.'}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
