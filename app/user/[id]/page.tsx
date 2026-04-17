'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { getFacebookUserProfileAction, type FacebookUserProfile } from '@/services/facebook/user';
import { sendReplyAction } from '@/services/inbox/sender';
import { Button } from '@/components/ui/button';
import { useToast } from '@/core/hooks/use-toast';

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const defaultAccountId = searchParams.get('accountId') ?? '';
  const platform = (searchParams.get('platform') || 'facebook').toLowerCase();

  const [profile, setProfile] = React.useState<FacebookUserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [selectedAccountId, setSelectedAccountId] = React.useState(defaultAccountId);
  const { toast } = useToast();

  const psid = String(params?.id || '').trim();

  React.useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!psid) {
        return;
      }

      setLoading(true);
      try {
        const data = await getFacebookUserProfileAction(psid);
        if (!active) {
          return;
        }

        setProfile(data);

        if (!defaultAccountId && data.accountOptions.length > 0) {
          setSelectedAccountId(data.accountOptions[0].id);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        const err = error as Error;
        toast({
          title: 'Failed to load user',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [psid, defaultAccountId, toast]);

  const handleSendMessage = React.useCallback(async () => {
    if (platform !== 'facebook') {
      toast({
        title: 'Unsupported platform',
        description: 'Only Facebook user messaging is supported on this page.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAccountId) {
      toast({
        title: 'Select an account',
        description: 'Choose which connected Facebook Page should send this message.',
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Message is empty',
        description: 'Enter a message before sending.',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const result = await sendReplyAction('Facebook', selectedAccountId, psid, message.trim());
      if (!result.success) {
        throw new Error(result.error || 'Failed to send message.');
      }

      toast({
        title: 'Message sent',
        description: `Sent message to ${profile?.name || 'user'}.`,
      });
      setMessage('');
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Send failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }, [message, platform, profile?.name, psid, selectedAccountId, toast]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading user profile...</span>
        </div>
      ) : !profile ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          User details are not available.
        </div>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-5">
            <div className="flex items-start gap-4">
              {profile.profilePic ? (
                <img
                  src={profile.profilePic}
                  alt={profile.name}
                  className="h-16 w-16 rounded-full object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border bg-muted text-sm font-medium flex items-center justify-center">
                  {profile.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="text-2xl font-semibold truncate">{profile.name}</h1>
                <p className="text-sm text-muted-foreground break-all">PSID: {profile.psid}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-5 space-y-4">
            <h2 className="text-lg font-semibold">Send message</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="sender-account">
                Send from account
              </label>
              <select
                id="sender-account"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
              >
                <option value="">Select account</option>
                {profile.accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="message-text">
                Message
              </label>
              <textarea
                id="message-text"
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type your message"
              />
            </div>

            <Button type="button" disabled={sending} onClick={handleSendMessage}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send message'
              )}
            </Button>
          </section>

          <section className="rounded-lg border bg-card p-5 space-y-4">
            <h2 className="text-lg font-semibold">Recent comments</h2>
            {profile.recentComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments saved for this user yet.</p>
            ) : (
              <div className="space-y-3">
                {profile.recentComments.map((comment) => (
                  <div key={comment.id} className="rounded-md border bg-background p-3">
                    <p className="text-sm whitespace-pre-wrap break-words">{comment.text}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {comment.pageName ? `On ${comment.pageName} ` : ''}
                      {formatDistanceToNow(new Date(comment.commentedOn), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}