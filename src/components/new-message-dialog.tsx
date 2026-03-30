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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { sendReplyAction } from '@/actions/inbox/sender';
import { getWhatsAppAccountsAction, recordOutgoingMessageAction } from '@/actions/db';

type Conversation = {
  id: string;
  contactName: string;
  contactId: string;
  platform: string;
  channelId: string;
  lastMessage: string;
  lastMessageAt: string | null;
  avatar: string;
  unread: boolean;
};

type WhatsAppAccount = {
    id: string;
    name: string;
}

interface NewMessageDialogProps {
  children: React.ReactNode;
  onNewConversation: (conversation: Conversation) => void;
}

export function NewMessageDialog({ children, onNewConversation }: NewMessageDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [recipient, setRecipient] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [selectedChannelId, setSelectedChannelId] = React.useState<string | undefined>();
  const [whatsAppAccounts, setWhatsAppAccounts] = React.useState<WhatsAppAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
        const fetchWhatsAppAccounts = async () => {
            setIsLoadingAccounts(true);
            try {
                const accounts = await getWhatsAppAccountsAction();
                const mappedAccounts = accounts.map((account) => ({
                    id: account.id,
                    name: account.name ?? account.username ?? account.id,
                }));
                setWhatsAppAccounts(mappedAccounts);
                if (accounts.length > 0) {
                    setSelectedChannelId(accounts[0].id);
                }
            } catch (error) {
                toast({ title: 'Could not load WhatsApp accounts', variant: 'destructive' });
            } finally {
                setIsLoadingAccounts(false);
            }
        };
        fetchWhatsAppAccounts();
    }
  }, [open, toast]);

  const handleSend = async () => {
    if (!recipient.trim() || !message.trim() || !selectedChannelId) {
      toast({
        title: 'All fields are required.',
        description: 'Please select a sending number, enter a recipient, and a message.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);

    try {
        // Since this is a new conversation, we always use the WhatsApp platform for now
        const result = await sendReplyAction('WhatsApp', selectedChannelId, recipient, message);

        if (result.success) {
            const saved = await recordOutgoingMessageAction({
                channelId: selectedChannelId,
                contactId: recipient,
                contactName: recipient,
                platform: 'WhatsApp',
                text: message,
                avatar: recipient.slice(-2),
            });
            if (saved.conversation) {
                onNewConversation(saved.conversation as Conversation);
            }

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
            <Label htmlFor="from" className="text-right">
              From
            </Label>
            <Select onValueChange={setSelectedChannelId} defaultValue={selectedChannelId} disabled={isLoadingAccounts || isSending}>
                <SelectTrigger id="from" className="col-span-3">
                    <SelectValue placeholder={isLoadingAccounts ? 'Loading...' : 'Select a number...'} />
                </SelectTrigger>
                <SelectContent>
                    {whatsAppAccounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipient" className="text-right">
              To
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 15551234567"
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
          <Button onClick={handleSend} disabled={isSending || isLoadingAccounts || whatsAppAccounts.length === 0}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
