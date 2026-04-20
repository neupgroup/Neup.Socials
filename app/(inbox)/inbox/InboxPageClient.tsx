'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, Inbox, Loader2, ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  listFacebookInboxFeedAction,
  getFacebookCommentInboxViewAction,
  type FacebookInboxItem,
} from '@/services/facebook/inbox';
import { sendReplyAction } from '@/services/inbox/sender';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function InboxPageClient() {
  const searchParams = useSearchParams();
  const viewType = searchParams.get('type');
  const commentId = searchParams.get('comment') ?? '';
  const postId = searchParams.get('post') ?? '';
  const [facebookItems, setFacebookItems] = React.useState<FacebookInboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sendingTo, setSendingTo] = React.useState<string | null>(null);
  const [commentView, setCommentView] = React.useState<Awaited<ReturnType<typeof getFacebookCommentInboxViewAction>> | null>(
    null
  );
  const [replyText, setReplyText] = React.useState('');
  const [sendingReply, setSendingReply] = React.useState(false);
  const [sentReplies, setSentReplies] = React.useState<string[]>([]);
  const { toast } = useToast();

  const handleMessageCommenter = React.useCallback(
    async (item: FacebookInboxItem) => {
      const message = window.prompt(`Send a message to ${item.fromName}`);
      if (!message || !message.trim()) {
        return;
      }

      setSendingTo(item.id);
      try {
        const result = await sendReplyAction('Facebook', item.accountId, item.fromId, message.trim(), item.fromName, item.commentId);
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
    },
    [toast]
  );

  React.useEffect(() => {
    if (viewType !== 'facebookComment') {
      return;
    }

    let active = true;

    const loadCommentView = async () => {
      if (!commentId || !postId) {
        setCommentView({ success: false, error: 'Missing comment or post id.' });
        return;
      }

      const result = await getFacebookCommentInboxViewAction({ commentId, postId });
      if (active) {
        setCommentView(result);
      }
    };

    loadCommentView();

    return () => {
      active = false;
    };
  }, [viewType, commentId, postId]);

  React.useEffect(() => {
    if (viewType === 'facebookComment') {
      return;
    }

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
  }, [viewType]);

  const handleSendReply = React.useCallback(async () => {
    if (!commentView?.success || !commentView.accountId || !commentView.commenterId) {
      return;
    }
    const trimmed = replyText.trim();
    if (!trimmed) {
      return;
    }

    setSendingReply(true);
    try {
      const result = await sendReplyAction(
        'Facebook',
        commentView.accountId,
        commentView.commenterId,
        trimmed,
        commentView.commenterName,
        commentId
      );
      if (!result.success) {
        throw new Error(result.error || 'Failed to send reply.');
      }

      setSentReplies((prev) => [...prev, trimmed]);
      setReplyText('');
      toast({ title: 'Reply sent' });
    } catch (error) {
      const err = error as Error;
      toast({ title: 'Reply failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingReply(false);
    }
  }, [commentView, replyText, toast]);

  if (viewType === 'facebookComment') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="icon">
              <Link href="/inbox">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-2xl font-semibold">Facebook Comment</h2>
              <p className="text-sm text-muted-foreground">{commentView?.pageName || 'Facebook Page'}</p>
            </div>
          </div>

          {!commentView || (commentView && !commentView.success) ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                {commentView?.error || 'Loading comment details...'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Us <Badge variant="secondary">post</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {commentView.postMessage || 'Post'}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {commentView.commenterName || 'User'} <Badge variant="secondary">comment</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">
                  {commentView.commentText || 'No comment text available.'}
                </CardContent>
              </Card>

              {sentReplies.map((reply, index) => (
                <Card key={`${reply}-${index}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Us <Badge variant="outline">reply</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm whitespace-pre-wrap">{reply}</CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle>Reply</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!commentView.canReply ? (
                    <p className="text-sm text-muted-foreground">Reply window expired for this comment.</p>
                  ) : (
                    <>
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        className="min-h-24"
                      />
                      <Button onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}>
                        {sendingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send reply
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              No Facebook page messages or comments found. Make sure page tokens include permissions for messages and
              comment access.
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
                          {item.type === 'comment' ? (
                            <Link
                              href={`/user/${encodeURIComponent(item.fromId)}?platform=facebook&accountId=${encodeURIComponent(item.accountId)}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {item.fromName}
                            </Link>
                          ) : (
                            item.fromName
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">on {item.pageName}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">{item.type === 'comment' ? 'Post comment' : 'Message'}</p>
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

                  <p className="mt-3 text-sm whitespace-pre-wrap break-words">{item.text}</p>

                  {item.type === 'comment' ? (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {item.commentId && item.postId ? (
                          <Button asChild type="button" size="sm" variant="secondary">
                            <Link
                              href={`/inbox?type=facebookComment&comment=${encodeURIComponent(item.commentId)}&post=${encodeURIComponent(item.postId)}`}
                            >
                              Open thread
                            </Link>
                          </Button>
                        ) : null}
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

