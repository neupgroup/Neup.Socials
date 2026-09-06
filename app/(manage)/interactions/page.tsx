import { MessageCircle, ThumbsUp, Users, Send, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { getFacebookInteractions } from '@/services/facebook/interactions';

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} mins ago.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago.`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago.`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago.`;
  return `${Math.floor(months / 12)} years ago.`;
}

export default async function InteractionsPage() {
  const interactions = await getFacebookInteractions();
  const comments = interactions.filter((item) => item.type === 'comment').length;
  const likes = interactions.filter((item) => item.type === 'like').length;
  const messages = interactions.filter((item) => item.type === 'message').length;
  const shares = interactions.filter((item) => item.type === 'share').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">People who engaged with your Facebook Page through comments and reactions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">People reached</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold">{new Set(interactions.map((item) => item.name)).size}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Comments</CardTitle><MessageCircle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold">{comments}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Likes</CardTitle><ThumbsUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold">{likes}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Messages</CardTitle><Send className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold">{messages}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Shares</CardTitle><Share2 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-3xl font-semibold">{shares}</p></CardContent></Card>
      </div>

      <section className="!mt-16">
        <h2 className="mb-4 text-xl font-semibold">Recent interactions</h2>
        <div>
          {interactions.length === 0 ? <div className="m-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No interactions have been recorded yet.</div> : interactions.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === interactions.length - 1;
            const cardCorners = interactions.length === 1
              ? 'rounded-xl'
              : `${isFirst ? 'rounded-t-xl' : ''} ${isLast ? 'rounded-b-xl' : ''} ${!isFirst && !isLast ? 'rounded-none' : ''}`;
            const cardBorder = isFirst ? 'border' : 'border-x border-b border-t-0';

            return (
            <div key={item.id} className={`flex items-center gap-3 ${cardBorder} border-border/60 bg-card p-3 ${cardCorners}`}>
              {item.image ? <img src={item.image} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted-foreground">{item.type === 'comment' ? <MessageCircle className="h-4 w-4" /> : item.type === 'like' ? <ThumbsUp className="h-4 w-4" /> : item.type === 'message' ? <Send className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}</div>}
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.content}</p><p className="mt-2 text-xs text-muted-foreground">{relativeTime(item.occurredAt)}</p></div>
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
