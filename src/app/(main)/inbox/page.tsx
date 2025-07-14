'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, Twitter, Facebook } from 'lucide-react';

const messages = [
  { id: 1, sender: 'John Doe', platform: 'Twitter', message: 'Hey, I have a question about your new feature.', avatar: 'JD', time: '2m ago' },
  { id: 2, sender: 'Jane Smith', platform: 'Facebook', message: 'Thanks for the quick response!', avatar: 'JS', time: '1h ago', unread: true },
  { id: 3, sender: 'Acme Corp', platform: 'LinkedIn', message: 'We\'d like to discuss a partnership.', avatar: 'AC', time: '3h ago' },
  { id: 4, sender: 'Random User', platform: 'Twitter', message: 'How do I reset my password?', avatar: 'RU', time: 'yesterday' },
  { id: 5, sender: 'Another User', platform: 'Facebook', message: 'This is amazing!', avatar: 'AU', time: 'yesterday' },
];

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'Twitter') return <Twitter className="h-4 w-4 text-blue-400" />;
  if (platform === 'Facebook') return <Facebook className="h-4 w-4 text-blue-600" />;
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
