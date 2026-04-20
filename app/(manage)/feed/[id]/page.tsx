
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Edit, Trash2, ExternalLink, ThumbsUp, MessageSquare, Share2, Send, RefreshCw } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { getPostAnalyticsAction } from '@/services/facebook/post-insights';
import { deletePostAction, getPostAction, getPostCollectionAction } from '@/services/db';
import { fetchPostCommentsAction, postCommentAction, postReplyAction } from '@/services/facebook/comments-actions';
import { getFacebookPostVideoAction } from '@/services/facebook/get-video';
import { getInstagramPostMediaAction } from '@/services/instagram/media';
import { sendReplyAction } from '@/services/inbox/sender';
import { InstagramPostModeration } from '@/components/instagram-post-moderation';

type Post = {
  id: string;
  postCollectionId: string | null;
  accountId: string | null;
  platform: string | null;
  platformPostId: string | null;
  message: string | null;
  postLink: string | null;
  createdOn: string | null;
  mediaUrls?: string[];
};

const isFacebookPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'facebook';

const isInstagramPlatform = (platform: string | null | undefined) =>
  (platform ?? '').toLowerCase() === 'instagram';

const analyticsFetcher = (postId: string) => getPostAnalyticsAction(postId);

type Comment = {
  id: string;
  message?: string;
  created_time?: string;
  from?: {
    id: string;
    name: string;
  };
};

type FacebookVideo = {
  id: string;
  sourceUrl?: string;
  embedHtml?: string;
  permalinkUrl?: string;
  title?: string;
  description?: string;
  lengthSeconds?: number;
  views?: number;
  thumbnailUrl?: string;
};

const PostAnalytics = ({ postId }: { postId: string }) => {
    const { data, error, isLoading } = useSWR(postId ? `${postId}-analytics` : null, () => analyticsFetcher(postId));

    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (error || !data?.success || !data.analytics) return <p className="text-sm text-destructive">Analytics not available.</p>;

    const { likes, comments, shares } = data.analytics;

    return (
        <div className="flex flex-wrap justify-around p-4 border rounded-lg bg-muted/50 gap-4">
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Likes</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2"><ThumbsUp className="h-5 w-5 text-blue-500" /> {likes}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Comments</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2"><MessageSquare className="h-5 w-5 text-gray-500" /> {comments}</p>
            </div>
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Shares</p>
                <p className="text-2xl font-bold flex items-center justify-center gap-2"><Share2 className="h-5 w-5 text-green-500" /> {shares}</p>
            </div>
        </div>
    );
};

const PostComments = ({ postId, platform, accountId }: { postId: string; platform: string | null; accountId?: string | null }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPosting, setIsPosting] = React.useState(false);

  const fetchComments = async (refresh = false) => {
    if (!isFacebookPlatform(platform)) return;
    setIsLoading(true);
    try {
      const result = await fetchPostCommentsAction(postId, { refresh });
      if (result.success && result.comments) {
        setComments(result.comments);
      } else {
        toast({ title: 'Failed to load comments', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchComments();
  }, [postId, platform]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setIsPosting(true);
    try {
      const result = await postCommentAction(postId, newComment);
      if (result.success) {
        toast({ title: 'Comment posted successfully' });
        setNewComment('');
        await fetchComments();
      } else {
        toast({ title: 'Failed to post comment', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setIsPosting(true);
    try {
      const result = await postReplyAction(commentId, postId, replyText);
      if (result.success) {
        toast({ title: 'Reply posted successfully' });
        setReplyText('');
        setReplyingToId(null);
        await fetchComments();
      } else {
        toast({ title: 'Failed to post reply', description: result.error, variant: 'destructive' });
      }
    } finally {
      setIsPosting(false);
    }
  };

  const handleMessageUser = async (commentId: string) => {
    if (!accountId) {
      toast({
        title: 'Missing account',
        description: 'This post is not linked to a connected Facebook page account.',
        variant: 'destructive',
      });
      return;
    }

    router.push(`/inbox?type=facebookComment&post=${encodeURIComponent(postId)}&comment=${encodeURIComponent(commentId)}`);
  };

  if (!isFacebookPlatform(platform)) {
    return <p className="text-sm text-muted-foreground">Comments are only available for Facebook posts.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchComments(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="space-y-3">
        <Textarea
          placeholder="Post a comment as your page..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isPosting}
          className="min-h-20"
        />
        <Button
          onClick={handlePostComment}
          disabled={isPosting || !newComment.trim()}
          className="w-full"
        >
          {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Post Comment
        </Button>
      </div>

      <div className="space-y-4 mt-6">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {comment.from?.id ? (
                      <Link
                        href={`/user/${encodeURIComponent(comment.from.id)}?platform=facebook${accountId ? `&accountId=${encodeURIComponent(accountId)}` : ''}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {comment.from?.name || 'Facebook User'}
                      </Link>
                    ) : (
                      comment.from?.name || 'Unknown'
                    )}
                  </p>
                  {comment.created_time && (
                    <p className="text-xs text-muted-foreground">{format(new Date(comment.created_time), 'PPp')}</p>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
              <div className="flex flex-wrap gap-2">
                {comment.from?.id ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/user/${encodeURIComponent(comment.from.id)}?platform=facebook${accountId ? `&accountId=${encodeURIComponent(accountId)}` : ''}`}
                    >
                      Open User
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => comment.from?.id && handleMessageUser(comment.id)}
                  disabled={!comment.from?.id || !accountId}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Message User
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                >
                  {replyingToId === comment.id ? 'Cancel Reply' : 'Reply as Page'}
                </Button>
              </div>

              {replyingToId === comment.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isPosting}
                    className="min-h-16"
                  />
                  <Button
                    onClick={() => handlePostReply(comment.id)}
                    disabled={isPosting || !replyText.trim()}
                    size="sm"
                    className="w-full"
                  >
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Post Reply
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const FacebookPostVideo = ({ postId, platform }: { postId: string; platform: string | null }) => {
  const { data, error, isLoading } = useSWR(
    isFacebookPlatform(platform) ? `${postId}-facebook-video` : null,
    () => getFacebookPostVideoAction(postId)
  );

  React.useEffect(() => {
    const facebookSdk = (window as Window & {
      FB?: {
        XFBML?: {
          parse: () => void;
        };
      };
    }).FB;

    if (facebookSdk?.XFBML) {
      facebookSdk.XFBML.parse();
    }
  }, [data]);

  if (!isFacebookPlatform(platform)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading video...
      </div>
    );
  }

  if (error || !data?.success || !data.video) {
    return null;
  }

  const video = data.video as FacebookVideo;

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Video ID: <span className="font-medium text-foreground">{video.id}</span>
      </div>
      {video.permalinkUrl ? (
        <div 
          className="fb-video"
          data-href={video.permalinkUrl}
          data-width="500"
          data-show-text="false"
        >
          <blockquote 
            cite={video.permalinkUrl}
            className="fb-xfbml-parse-ignore"
          >
            <a href={video.permalinkUrl}>
              {video.title || 'Video'}
            </a>
            {video.title && <p>{video.title}</p>}
          </blockquote>
        </div>
      ) : video.sourceUrl ? (
        <video
          controls
          playsInline
          preload="metadata"
          poster={video.thumbnailUrl}
          className="w-full rounded-lg border bg-black"
        >
          <source src={video.sourceUrl} />
          Your browser does not support video playback.
        </video>
      ) : video.embedHtml ? (
        <div
          className="w-full overflow-hidden rounded-lg border bg-muted"
          dangerouslySetInnerHTML={{ __html: video.embedHtml }}
        />
      ) : null}

      {(video.views !== undefined || video.permalinkUrl) && !video.permalinkUrl && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground space-x-3">
            {video.views !== undefined ? <span>{video.views} views</span> : null}
            {video.lengthSeconds ? <span>{Math.round(video.lengthSeconds)} sec</span> : null}
            {video.permalinkUrl ? (
              <a
                href={video.permalinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Open on Facebook
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

const InstagramPostVideoId = ({ postId, platform }: { postId: string; platform: string | null }) => {
  const { data, error, isLoading } = useSWR(
    isInstagramPlatform(platform) ? `${postId}-instagram-media` : null,
    () => getInstagramPostMediaAction(postId)
  );

  if (!isInstagramPlatform(platform)) {
    return null;
  }

  if (isLoading || error || !data?.success) {
    return null;
  }

  const mediaType = (data.mediaType || '').toUpperCase();
  const productType = (data.mediaProductType || '').toUpperCase();
  const isVideo = mediaType === 'VIDEO' || mediaType === 'REELS' || productType === 'REELS';

  if (!isVideo || !data.mediaId) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground">
      Video ID: <span className="font-medium text-foreground">{data.mediaId}</span>
    </div>
  );
};

export default function ViewPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = React.useState<Post | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      setLoading(true);
      const postData = await getPostAction(id);

      if (postData) {
        
        if (!postData.mediaUrls && postData.postCollectionId) {
            const collectionData = await getPostCollectionAction(postData.postCollectionId);
            if (collectionData) {
                postData.mediaUrls = collectionData.mediaUrls || [];
            }
        }
        setPost(postData);
      } else {
        toast({ title: 'Post not found', variant: 'destructive' });
        router.push('/feed');
      }
      setLoading(false);
    };
    fetchPost();
  }, [id, router, toast]);

  const handleDelete = async () => {
    if (!post) return;
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone and may not remove the post from the social platform.')) {
        setIsProcessing(true);
        try {
            await deletePostAction(post.id);
            toast({ title: 'Post deleted successfully from dashboard.' });
            router.push(`/feed/collection/${post.postCollectionId}`);
        } catch (error: any) {
            toast({ title: 'Failed to delete post', description: error.message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    }
  };

  const getFullMediaUrl = (url: string) => {
    return url && !url.startsWith('http') ? `https://neupgroup.com${url}` : url;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!post) {
    return <div className="text-center">Post not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon" disabled={isProcessing}>
                <Link href={post.postCollectionId ? `/feed/collection/${post.postCollectionId}` : '/feed'}>
                    <ArrowLeft />
                </Link>
            </Button>
            <div>
                <h1 className="text-3xl font-bold">Post Details</h1>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>Platform:</span>
                  <Badge>{post.platform}</Badge>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button asChild variant="outline" disabled={isProcessing}>
                <Link href={`/feed/edit/${post.postCollectionId}`}><Edit className="mr-2 h-4 w-4"/> Edit Collection</Link>
            </Button>
             <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                Delete
            </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Published Content</CardTitle>
          <CardDescription>
            Published on {post.createdOn ? format(new Date(post.createdOn), 'PPpp') : 'N/A'}.
            {post.postLink ? (
              <a href={post.postLink} target="_blank" rel="noopener noreferrer" className="ml-2 text-sm text-primary hover:underline flex items-center gap-1">
                   View on {post.platform || 'platform'} <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-muted-foreground p-4 border rounded-lg bg-muted/20">{post.message}</p>

            {isFacebookPlatform(post.platform) && (
              <FacebookPostVideo postId={post.id} platform={post.platform} />
            )}

            {isInstagramPlatform(post.platform) && (
              <InstagramPostVideoId postId={post.id} platform={post.platform} />
            )}
            
            {post.mediaUrls && post.mediaUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {post.mediaUrls.map((url, index) => (
                       <a href={getFullMediaUrl(url)} target="_blank" rel="noopener noreferrer" key={index}>
                         <Image src={getFullMediaUrl(url)} alt={`Post media ${index + 1}`} className="rounded-lg w-full aspect-square object-cover" width="200" height="200" />
                       </a>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>
      
        {isFacebookPlatform(post.platform) && (
        <Card>
            <CardHeader>
                <CardTitle>Post Analytics</CardTitle>
                <CardDescription>Performance metrics for this specific post.</CardDescription>
            </CardHeader>
            <CardContent>
                <PostAnalytics postId={post.id} />
            </CardContent>
        </Card>
      )}

        {isFacebookPlatform(post.platform) && (
        <Card>
            <CardHeader>
                <CardTitle>Comments & Replies</CardTitle>
                <CardDescription>View and manage comments on this post.</CardDescription>
            </CardHeader>
            <CardContent>
                <PostComments postId={post.id} platform={post.platform} accountId={post.accountId} />
            </CardContent>
        </Card>
      )}

      {isInstagramPlatform(post.platform) && (
        <Card>
          <CardHeader>
            <CardTitle>Comments & Moderation</CardTitle>
            <CardDescription>
              Manage Instagram comments, replies, private replies, and commenting controls for this post.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InstagramPostModeration postId={post.id} />
          </CardContent>
        </Card>
      )}

    </div>
  );
}
