'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Loader2, MessageSquare, RefreshCw, Send, EyeOff, Eye, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  deleteInstagramCommentAction,
  fetchInstagramCommentRepliesAction,
  fetchInstagramPostCommentsAction,
  replyToInstagramCommentAction,
  sendInstagramCommentMessageAction,
  setInstagramCommentHiddenAction,
  setInstagramCommentsEnabledAction,
  type InstagramModerationComment,
  type InstagramModerationReply,
} from '@/services/instagram/comments';

type InstagramPostModerationProps = {
  postId: string;
};

function upsertReplies(
  comments: InstagramModerationComment[],
  commentId: string,
  replies: InstagramModerationReply[]
) {
  return comments.map((comment) =>
    comment.id === commentId
      ? {
          ...comment,
          replies,
        }
      : comment
  );
}

function updateComment(
  comments: InstagramModerationComment[],
  commentId: string,
  updater: (comment: InstagramModerationComment) => InstagramModerationComment
) {
  return comments.map((comment) => (comment.id === commentId ? updater(comment) : comment));
}

export function InstagramPostModeration({ postId }: InstagramPostModerationProps) {
  const { toast } = useToast();
  const [comments, setComments] = React.useState<InstagramModerationComment[]>([]);
  const [commentsEnabled, setCommentsEnabled] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTogglingComments, setIsTogglingComments] = React.useState(false);
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [messagingCommentId, setMessagingCommentId] = React.useState<string | null>(null);
  const [messageText, setMessageText] = React.useState('');
  const [busyCommentId, setBusyCommentId] = React.useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = React.useState<Record<string, boolean>>({});
  const [loadingRepliesForId, setLoadingRepliesForId] = React.useState<string | null>(null);

  const fetchComments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchInstagramPostCommentsAction(postId);
      if (result.success) {
        setComments(result.comments ?? []);
        setCommentsEnabled(
          typeof result.commentsEnabled === 'boolean' ? result.commentsEnabled : null
        );
      } else {
        toast({
          title: 'Failed to load Instagram comments',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [postId, toast]);

  React.useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const handleToggleComments = async (enabled: boolean) => {
    setIsTogglingComments(true);
    try {
      const result = await setInstagramCommentsEnabledAction(postId, enabled);
      if (result.success) {
        setCommentsEnabled(enabled);
        toast({ title: enabled ? 'Comments enabled' : 'Comments disabled' });
      } else {
        toast({
          title: enabled ? 'Failed to enable comments' : 'Failed to disable comments',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setIsTogglingComments(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) {
      return;
    }

    setBusyCommentId(commentId);
    try {
      const result = await replyToInstagramCommentAction(postId, commentId, replyText);
      if (result.success) {
        toast({ title: 'Reply posted on Instagram' });
        setReplyText('');
        setReplyingToId(null);
        await fetchComments();
      } else {
        toast({
          title: 'Failed to reply to comment',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setBusyCommentId(null);
    }
  };

  const handlePrivateMessage = async (commentId: string) => {
    if (!messageText.trim()) {
      return;
    }

    setBusyCommentId(commentId);
    try {
      const result = await sendInstagramCommentMessageAction(postId, commentId, messageText);
      if (result.success) {
        toast({ title: 'Private reply sent' });
        setMessageText('');
        setMessagingCommentId(null);
      } else {
        toast({
          title: 'Failed to send private reply',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleHideToggle = async (commentId: string, hidden: boolean) => {
    setBusyCommentId(commentId);
    try {
      const result = await setInstagramCommentHiddenAction(postId, commentId, hidden);
      if (result.success) {
        setComments((current) =>
          updateComment(current, commentId, (comment) => ({
            ...comment,
            hidden,
          }))
        );
        toast({ title: hidden ? 'Comment hidden' : 'Comment restored' });
      } else {
        toast({
          title: hidden ? 'Failed to hide comment' : 'Failed to restore comment',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Delete this Instagram comment? This cannot be undone.')) {
      return;
    }

    setBusyCommentId(commentId);
    try {
      const result = await deleteInstagramCommentAction(postId, commentId);
      if (result.success) {
        setComments((current) => current.filter((comment) => comment.id !== commentId));
        toast({ title: 'Comment deleted' });
      } else {
        toast({
          title: 'Failed to delete comment',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setBusyCommentId(null);
    }
  };

  const handleToggleReplies = async (commentId: string) => {
    const nextExpanded = !expandedReplies[commentId];
    setExpandedReplies((current) => ({
      ...current,
      [commentId]: nextExpanded,
    }));

    if (!nextExpanded) {
      return;
    }

    setLoadingRepliesForId(commentId);
    try {
      const result = await fetchInstagramCommentRepliesAction(postId, commentId);
      if (result.success) {
        setComments((current) => upsertReplies(current, commentId, result.replies ?? []));
      } else {
        toast({
          title: 'Failed to load replies',
          description: result.error,
          variant: 'destructive',
        });
      }
    } finally {
      setLoadingRepliesForId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
            {commentsEnabled === null ? null : (
              <Badge variant={commentsEnabled ? 'default' : 'secondary'}>
                {commentsEnabled ? 'Comments enabled' : 'Comments disabled'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Reply publicly, send a private reply to the commenter, hide or delete comments, and
            toggle commenting on the post.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchComments} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleComments(true)}
            disabled={isTogglingComments}
          >
            {isTogglingComments && commentsEnabled === false ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Enable Comments
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleComments(false)}
            disabled={isTogglingComments}
          >
            {isTogglingComments && commentsEnabled !== false ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Disable Comments
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No Instagram comments found for this post.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isBusy = busyCommentId === comment.id;
            const isRepliesExpanded = Boolean(expandedReplies[comment.id]);
            const isReplyLoading = loadingRepliesForId === comment.id;

            return (
              <div key={comment.id} className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm">{comment.username}</p>
                      {comment.hidden ? <Badge variant="secondary">Hidden</Badge> : null}
                      <Badge variant="outline">{comment.likeCount} likes</Badge>
                      <Badge variant="outline">{comment.replies.length} replies</Badge>
                    </div>
                    {comment.timestamp ? (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.timestamp), 'PPp')}
                      </p>
                    ) : null}
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap">{comment.text || 'No text'}</p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplyingToId((current) => (current === comment.id ? null : comment.id));
                      setMessagingCommentId(null);
                      setMessageText('');
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {replyingToId === comment.id ? 'Cancel Reply' : 'Reply Publicly'}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMessagingCommentId((current) => (current === comment.id ? null : comment.id));
                      setReplyingToId(null);
                      setReplyText('');
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {messagingCommentId === comment.id ? 'Cancel Message' : 'Message Commenter'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleHideToggle(comment.id, !comment.hidden)}
                    disabled={isBusy}
                  >
                    {comment.hidden ? (
                      <Eye className="mr-2 h-4 w-4" />
                    ) : (
                      <EyeOff className="mr-2 h-4 w-4" />
                    )}
                    {comment.hidden ? 'Unhide' : 'Hide'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleToggleReplies(comment.id)}
                    disabled={isReplyLoading}
                  >
                    {isReplyLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {isRepliesExpanded ? 'Hide Replies' : 'Show Replies'}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(comment.id)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>

                {replyingToId === comment.id ? (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Textarea
                      placeholder="Write a public Instagram reply..."
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      disabled={isBusy}
                      className="min-h-20"
                    />
                    <Button
                      onClick={() => void handleReply(comment.id)}
                      disabled={isBusy || !replyText.trim()}
                      size="sm"
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Post Reply
                    </Button>
                  </div>
                ) : null}

                {messagingCommentId === comment.id ? (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Textarea
                      placeholder="Send a private reply to this commenter..."
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      disabled={isBusy}
                      className="min-h-20"
                    />
                    <p className="text-xs text-muted-foreground">
                      Meta allows one private reply per commenter, generally within 7 days of the
                      original comment.
                    </p>
                    <Button
                      onClick={() => void handlePrivateMessage(comment.id)}
                      disabled={isBusy || !messageText.trim()}
                      size="sm"
                    >
                      {isBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send Private Reply
                    </Button>
                  </div>
                ) : null}

                {isRepliesExpanded ? (
                  <div className="space-y-2 rounded-lg border-t pt-3">
                    {comment.replies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No replies yet.</p>
                    ) : (
                      comment.replies.map((reply) => (
                        <div key={reply.id} className="rounded-md border bg-muted/10 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-sm">{reply.username}</p>
                            {reply.hidden ? <Badge variant="secondary">Hidden</Badge> : null}
                            <Badge variant="outline">{reply.likeCount} likes</Badge>
                          </div>
                          {reply.timestamp ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(new Date(reply.timestamp), 'PPp')}
                            </p>
                          ) : null}
                          <p className="mt-2 text-sm whitespace-pre-wrap">{reply.text || 'No text'}</p>
                        </div>
                      ))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
