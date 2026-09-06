import { MessageCircle, ThumbsUp, Users } from 'lucide-react';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { getFacebookInteractions } from '@/services/facebook/interactions';

export default async function InteractionsPage() {
  const interactions = await getFacebookInteractions();
  const comments = interactions.filter((item) => item.type === 'comment').length;
  const reactions = interactions.filter((item) => item.type === 'reaction').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Interactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">People who engaged with your Facebook Page through comments and reactions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">People reached</CardTitle><Users className="h-4 w-4 text-primary" /></CardHeader><CardContent><p className="text-3xl font-semibold">{new Set(interactions.map((item) => item.name)).size}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Comments</CardTitle><MessageCircle className="h-4 w-4 text-primary" /></CardHeader><CardContent><p className="text-3xl font-semibold">{comments}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Reactions</CardTitle><ThumbsUp className="h-4 w-4 text-primary" /></CardHeader><CardContent><p className="text-3xl font-semibold">{reactions}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent interactions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {interactions.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No interactions have been recorded yet.</div> : interactions.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              {item.image ? <img src={item.image} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">{item.type === 'comment' ? <MessageCircle className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}</div>}
              <div className="min-w-0 flex-1"><p className="font-medium">{item.name}</p><p className="truncate text-sm text-muted-foreground">{item.detail}</p></div>
              <Badge variant="outline">{item.type}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
