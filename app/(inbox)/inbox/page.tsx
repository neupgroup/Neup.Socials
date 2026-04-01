'use client';

import * as React from 'react';
import { MessageSquare, Inbox, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { listFacebookInboxFeedAction, type FacebookInboxItem } from '@/actions/facebook/inbox';
import { sendReplyAction } from '@/actions/inbox/sender';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function InboxPage() {
  const [facebookItems, setFacebookItems] = React.useState<FacebookInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sendingTo, setSendingTo] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleMessageCommenter = React.useCallback(async (item: FacebookInboxItem) => {
    const message = window.prompt(`Send a message to ${item.fromName}`);
    if (!message || !message.trim()) {
      return;
    }

    setSendingTo(item.id);
    try {
      const result = await sendReplyAction('Facebook', item.accountId, item.fromId, message.trim());
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message.');
      }

      toast({
        title: 'Message sent',
        description: `Sent message to ${item.fromName}.`,
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Send failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSendingTo(null);
    }
  }, [toast]);

  React.useEffect(() => {
    let active = true;

    const fetchFacebookInbox = async () => {
      try {
        const items = await listFacebookInboxFeedAction();
        if (active) {
          setFacebookItems(items);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching Facebook inbox feed:', error);
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchFacebookInbox();
    const interval = window.setInterval(fetchFacebookInbox, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Select a conversation</h2>
            <p className="text-muted-foreground">
              Choose a conversation from the sidebar to view messages and start chatting.
            </p>
          </div>
          <div className="pt-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" />
              <span>Your messages will appear here</span>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Facebook messages and post comments</h3>
            <span className="text-xs text-muted-foreground">Auto-refresh every 30s</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading Facebook inbox feed...</span>
            </div>
          ) : facebookItems.length === 0 ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              No Facebook page messages or comments found. Make sure page tokens include permissions for messages and comment access.
            </div>
          ) : (
            <div className="space-y-3">
              {facebookItems.map((item) => (
                <div key={item.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {item.fromProfilePic ? (
                        <img
                          src={item.fromProfilePic}
                          alt={item.fromName}
                          className="h-9 w-9 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full border bg-muted text-xs flex items-center justify-center">
                          {item.fromName
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.fromName}
                          <span className="ml-2 text-xs text-muted-foreground">
                            on {item.pageName}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.type === 'comment' ? 'Post comment' : 'Message'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(item.createdTime), { addSuffix: true })}
                    </span>
                  </div>

                  {item.type === 'comment' && item.postMessage ? (
                    <p className="mt-3 rounded bg-muted px-3 py-2 text-xs text-muted-foreground line-clamp-2">
                      Post: {item.postMessage}
                    </p>
                  ) : null}

                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">
                    {item.text}
                  </p>

                  {item.type === 'comment' ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={sendingTo === item.id}
                        onClick={() => handleMessageCommenter(item)}
                      >
                        {sendingTo === item.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          'Message user'
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
