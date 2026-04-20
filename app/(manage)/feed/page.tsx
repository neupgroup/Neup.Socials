
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Loader2, Search, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal, ThumbsUp, MessageSquare, Share2, Repeat2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { listPostsAction } from '@/services/db';
import { refreshPostAnalyticsAction } from '@/services/facebook/post-insights';

type Post = {
  id: string;
  message: string | null;
  accountId: string | null;
  platform: string | null;
  createdOn: string | null;
  postLink: string | null;
  postCollectionId: string | null;
  accountName?: string | null;
  analytics?: Record<string, unknown> | null;
};

type BasicStats = {
  likes?: number;
  comments?: number;
  shares?: number;
  reposts?: number;
  views?: number;
};

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const pickMetric = (source: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const metric = toNumber(source[key]);
    if (metric !== undefined) {
      return metric;
    }
  }
  return undefined;
};

const getBasicStats = (analytics?: Record<string, unknown> | null): BasicStats => {
  if (!analytics || typeof analytics !== 'object') return {};

  return {
    likes: pickMetric(analytics, ['likes', 'likeCount', 'reactions', 'reactionCount']),
    comments: pickMetric(analytics, ['comments', 'commentCount', 'replyCount']),
    shares: pickMetric(analytics, ['shares', 'shareCount']),
    reposts: pickMetric(analytics, ['reposts', 'repostCount', 'reshares']),
    views: pickMetric(analytics, ['views', 'viewCount', 'impressions', 'impressionCount']),
  };
};

const StatItem = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
    {icon}
    <span className="font-medium text-foreground">{value.toLocaleString()}</span>
    <span>{label}</span>
  </div>
);

const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
        case 'Twitter': return <Twitter className="h-5 w-5 text-blue-400" />;
        case 'LinkedIn': return <Linkedin className="h-5 w-5 text-blue-700" />;
        case 'Facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
        case 'Instagram': return <Instagram className="h-5 w-5 text-pink-500" />;
        default: return null;
    }
}


const PAGE_SIZE = 15;

export default function ContentDashboardPage() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryFromUrl = searchParams.get('query') ?? '';
  const accountIdFromUrl = searchParams.get('accountId') ?? '';
  const [searchTerm, setSearchTerm] = React.useState(queryFromUrl);
  
  const router = useRouter();

  React.useEffect(() => {
    if (queryFromUrl !== searchTerm) {
      setSearchTerm(queryFromUrl);
    }
  }, [queryFromUrl]);

  React.useEffect(() => {
    const trimmed = searchTerm.trim();
    const urlQuery = queryFromUrl.trim();

    if (trimmed === urlQuery) {
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (trimmed) {
        params.set('query', trimmed);
      } else {
        params.delete('query');
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, queryFromUrl, searchParams, pathname, router]);

  const fetchPosts = React.useCallback(async (loadMore = false, search = '', accountId?: string) => {
    if (!loadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const skip = loadMore ? posts.length : 0;
      const result = await listPostsAction({ search, skip, accountId: accountId || undefined });
      setHasMore(result.hasMore);
      setPosts(loadMore ? [...posts, ...result.items] : result.items);
    } catch (error) {
      console.error("Error fetching posts: ", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [posts]);

  React.useEffect(() => {
    const debouncedSearch = setTimeout(() => {
      fetchPosts(false, searchTerm, accountIdFromUrl);
    }, 500);

    return () => clearTimeout(debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, accountIdFromUrl]);


  const handleShowMore = () => {
      if(hasMore) {
          fetchPosts(true, searchTerm, accountIdFromUrl);
      }
  }

  const handleAccountFilter = (event: React.SyntheticEvent, accountId?: string | null) => {
    event.preventDefault();
    event.stopPropagation();
    if (!accountId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('accountId', accountId);
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleRefreshStats = async (postId: string) => {
    try {
      const result = await refreshPostAnalyticsAction(postId);
      if (!result.success || !result.analytics) {
        return;
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                analytics: {
                  ...post.analytics,
                  ...result.analytics,
                  refreshedAt: new Date().toISOString(),
                },
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error refreshing post stats: ', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Feed</h1>
          <p className="text-muted-foreground">A unified feed of all your published posts.</p>
        </div>
      </div>
      
      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
              placeholder="Search feed..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

       {loading ? (
        <div className="grid grid-cols-1 gap-4">
            {Array.from({length: 3}).map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                           <div className="h-10 w-10 rounded-full bg-muted"></div>
                           <div>
                               <div className="h-5 w-40 rounded-md bg-muted"></div>
                               <div className="h-4 w-24 mt-1 rounded-md bg-muted"></div>
                           </div>
                       </div>
                       <div className="h-8 w-24 rounded-md bg-muted"></div>
                    </CardContent>
                </Card>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
             <Card
              key="add-new-post"
              className="hover:shadow-md transition-shadow cursor-pointer border-dashed border-2 hover:border-primary"
            >
              <Link href="/feed/create" className="block">
                <CardContent className="p-4 flex items-center justify-center text-center h-full min-h-[110px]">
                  <div className="flex items-center gap-4">
                    <PlusCircle className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="font-bold text-lg">Create New Post</h3>
                      <p className="text-sm text-muted-foreground">Draft a new post collection for your channels.</p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            {posts.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        No posts found for your search term.
                    </CardContent>
                </Card>
            ) : (
                posts.map((post) => (
                    <Card key={post.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <Link href={`/feed/${post.id}`} className="flex items-center gap-4 flex-1 overflow-hidden">
                                <div className="bg-muted p-3 rounded-full">
                                    <PlatformIcon platform={post.platform ?? ''} />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-medium truncate">{post.message}</p>
                                    <p className="text-sm text-muted-foreground">
                                        <span
                                          role="button"
                                          tabIndex={0}
                                          className="font-medium text-foreground hover:underline"
                                          onClick={(event) => handleAccountFilter(event, post.accountId)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                              handleAccountFilter(event, post.accountId);
                                            }
                                          }}
                                        >
                                          by {post.accountName || 'Unknown account'}
                                        </span>
                                        , Published{' '}
                                        {post.createdOn
                                          ? formatDistanceToNow(new Date(post.createdOn), { addSuffix: true })
                                          : 'on an unknown date'}
                                    </p>
                                    {(() => {
                                      const stats = getBasicStats(post.analytics);
                                      const statEntries: Array<{ key: string; value: number; label: string; icon: React.ReactNode }> = [];

                                      if (stats.likes !== undefined) statEntries.push({ key: 'likes', value: stats.likes, label: 'Likes', icon: <ThumbsUp className="h-3 w-3" /> });
                                      if (stats.comments !== undefined) statEntries.push({ key: 'comments', value: stats.comments, label: 'Comments', icon: <MessageSquare className="h-3 w-3" /> });
                                      if (stats.shares !== undefined) statEntries.push({ key: 'shares', value: stats.shares, label: 'Shares', icon: <Share2 className="h-3 w-3" /> });
                                      if (stats.reposts !== undefined) statEntries.push({ key: 'reposts', value: stats.reposts, label: 'Reposts', icon: <Repeat2 className="h-3 w-3" /> });
                                      if (stats.views !== undefined) statEntries.push({ key: 'views', value: stats.views, label: 'Views', icon: <Eye className="h-3 w-3" /> });

                                      if (statEntries.length === 0) return null;

                                      return (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {statEntries.map((entry) => (
                                            <StatItem key={entry.key} label={entry.label} value={entry.value} icon={entry.icon} />
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </Link>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/feed/${post.id}`) }}>View Details</DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/feed/collection/${post.postCollectionId}`) }}>View Collection</DropdownMenuItem>
                                        {(post.platform ?? '').toLowerCase() === 'facebook' ? (
                                          <DropdownMenuItem
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await handleRefreshStats(post.id);
                                            }}
                                          >
                                            Refresh Stats
                                          </DropdownMenuItem>
                                        ) : null}
                                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
      )}
      
       {!loading && hasMore && (
        <div className="text-center mt-6">
          <Button onClick={handleShowMore} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}
