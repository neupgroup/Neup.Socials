'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { sendReplyAction } from '@/actions/inbox/sender';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Conversation = {
  id: string;
  contactName: string;
  contactId: string;
  platform: string;
  lastMessage: string;
  lastMessageAt: any;
  avatar: string;
  unread: boolean;
};

interface NewMessageDialogProps {
  children: React.ReactNode;
  onNewConversation: (conversation: Conversation) => void;
}

export function NewMessageDialog({ children, onNewConversation }: NewMessageDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [recipient, setRecipient] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!recipient.trim() || !message.trim()) {
      toast({
        title: 'Recipient and message cannot be empty.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);

    try {
        const result = await sendReplyAction('WhatsApp', recipient, message);

        if (result.success) {
            // Check if conversation already exists
            const convosRef = collection(db, 'conversations');
            const q = query(convosRef, where('contactId', '==', recipient), where('platform', '==', 'WhatsApp'));
            const existingConvos = await getDocs(q);

            let convoId: string;
            if (existingConvos.empty) {
                // Create a new conversation
                const newConvoRef = await addDoc(convosRef, {
                    contactId: recipient,
                    contactName: recipient, // Use phone number as name for now
                    platform: 'WhatsApp',
                    lastMessage: message,
                    lastMessageAt: serverTimestamp(),
                    unread: false,
                    avatar: recipient.slice(-2) // Use last 2 digits for avatar placeholder
                });
                convoId = newConvoRef.id;
            } else {
                convoId = existingConvos.docs[0].id;
            }
            
            // Add message to the subcollection
            const messagesCol = collection(db, 'conversations', convoId, 'messages');
            await addDoc(messagesCol, { text: message, sender: 'agent', timestamp: serverTimestamp() });

            // Notify parent component
            const newConversationData: Conversation = {
                id: convoId,
                contactId: recipient,
                contactName: recipient,
                platform: 'WhatsApp',
                lastMessage: message,
                lastMessageAt: new Date(),
                unread: false,
                avatar: recipient.slice(-2),
            };
            onNewConversation(newConversationData);

            toast({ title: 'Message sent successfully!' });
            setOpen(false);
            setRecipient('');
            setMessage('');
        } else {
            throw new Error(result.error || 'An unknown error occurred.');
        }

    } catch (error: any) {
        toast({
            title: 'Failed to send message',
            description: error.message,
            variant: 'destructive',
        });
    } finally {
        setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Send a new message to a WhatsApp contact. Enter their phone number including the country code.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient" className="text-right">
              To
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 97798xxxxxxxx"
              disabled={isSending}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right pt-2">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="col-span-3"
              placeholder="Type your message here..."
              rows={4}
              disabled={isSending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
