'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, Twitter, Facebook, Linkedin } from 'lucide-react';

const messages = [
  { id: 1, sender: 'John Doe', platform: 'Twitter', message: 'Hey, I have a question about your new feature.', avatar: 'JD', time: '2m ago' },
  { id: 2, sender: 'Jane Smith', platform: 'Facebook', message: 'Thanks for the quick response!', avatar: 'JS', time: '1h ago', unread: true },
  { id: 3, sender: 'Acme Corp', platform: 'LinkedIn', message: 'We\'d like to discuss a partnership.', avatar: 'AC', time: '3h ago' },
  { id: 4, sender: 'Random User', platform: 'Twitter', message: 'How do I reset my password?', avatar: 'RU', time: 'yesterday' },
  { id: 5, sender: 'Another User', platform: 'Facebook', message: 'This is amazing!', avatar: 'AU', time: 'yesterday' },
  { id: 6, sender: 'Maria Garcia', platform: 'WhatsApp', message: 'Can you confirm my order #12345?', avatar: 'MG', time: '4h ago', unread: true },
  { id: 7, sender: 'Support Team', platform: 'WhatsApp', message: 'Yes, your order has been shipped!', avatar: 'ST', time: '3h ago' },
];

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
  if (platform === 'Twitter') return <Twitter className="h-4 w-4 text-blue-400" />;
  if (platform === 'Facebook') return <Facebook className="h-4 w-4 text-blue-600" />;
  if (platform === 'LinkedIn') return <Linkedin className="h-4 w-4 text-blue-700" />;
  if (platform === 'WhatsApp') return <WhatsAppIcon className="h-4 w-4 text-green-500" />;
  return null;
};

export default function InboxPage() {
  const [selectedMessage, setSelectedMessage] = React.useState(messages[1]);

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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-accent ${selectedMessage.id === msg.id ? 'bg-accent' : ''}`}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <Avatar>
                    <AvatarImage src={`https://placehold.co/40x40?text=${msg.avatar}`} />
                    <AvatarFallback>{msg.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold truncate">{msg.sender}</span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{msg.message}</p>
                  </div>
                  {msg.unread && <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5"></div>}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col h-full">
            {selectedMessage ? (
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">{selectedMessage.sender}</h2>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                       <PlatformIcon platform={selectedMessage.platform} />
                      <span>{selectedMessage.platform}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  <div className="flex items-end gap-3">
                    <Avatar>
                      <AvatarImage src={`https://placehold.co/40x40?text=${selectedMessage.avatar}`} />
                      <AvatarFallback>{selectedMessage.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="p-3 rounded-lg bg-muted max-w-xs lg:max-w-md">
                      <p className="text-sm">{selectedMessage.message}</p>
                    </div>
                  </div>
                   <div className="flex items-end gap-3 justify-end">
                     <div className="p-3 rounded-lg bg-primary text-primary-foreground max-w-xs lg:max-w-md">
                      <p className="text-sm">Hi {selectedMessage.sender}, thank you for reaching out! We are here to help.</p>
                    </div>
                     <Avatar>
                       <AvatarImage src="https://placehold.co/40x40" />
                       <AvatarFallback>TS</AvatarFallback>
                     </Avatar>
                  </div>
                </div>
                <div className="p-4 border-t bg-background">
                  <div className="relative">
                    <Input placeholder="Type your reply..." className="pr-12" />
                    <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a message to view the conversation.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
