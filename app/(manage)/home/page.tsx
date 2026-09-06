
import { ArrowDown, ArrowUp, CalendarCheck2, MessageCircle, Share2, ThumbsUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card';
import Link from 'next/link';
import { Button } from '#/components/ui/button';
import { getFacebookInteractions, type InteractionItem } from '@/services/facebook/interactions';
import { ensureCurrentAccountAction } from '@/services/accounts/actions';

const overviewData = [
  { title: 'Total Followers', value: '12,345', change: '+20.1%', icon: Users },
  { title: 'Total Engagement', value: '4,567', change: '+15.2%', icon: ThumbsUp },
  { title: 'Total Reach', value: '89,123', change: '-2.5%', icon: Share2 },
  { title: 'New Messages', value: '89', change: '+5.0%', icon: MessageCircle },
];

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

export default async function DashboardPage() {
  const [recentActivity, account] = await Promise.all([
    getFacebookInteractions(5),
    ensureCurrentAccountAction(),
  ]);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const firstName = account?.displayName?.trim().split(/\s+/)[0] || 'there';

  return (
    <div className="space-y-6">
      <section className="px-0 py-0">
        <div>
          <div className="space-y-3">
            <h1 className="font-headline text-3xl font-semibold tracking-tight md:text-4xl">Good {greeting}, {firstName}.</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              4 posts are scheduled today, engagement is trending up, and inbox response time is improving.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewData.map((item) => {
          const Icon = item.icon;
          const positive = item.change.startsWith('+');

          return (
            <Card key={item.title} className="border-border/70 bg-card/95 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.title}</CardTitle>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{item.value}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card p-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="flex items-center text-sm text-muted-foreground">
                  {positive ? (
                    <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDown className="mr-1 h-4 w-4 text-rose-500" />
                  )}
                  <span className={positive ? 'text-emerald-600' : 'text-rose-600'}>{item.change}</span>
                  <span className="ml-1">vs last month</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="!mt-16 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Live Activity Feed</h2>
            <p className="mt-1 text-sm text-muted-foreground">Prioritized events from your connected platforms.</p>
          </div>
          <div className="space-y-0">
            {recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No interactions have been recorded yet.</div>
            ) : recentActivity.map((activity, index) => {
              const isFirst = index === 0;
              const isLast = index === recentActivity.length - 1;
              const cardCorners = recentActivity.length === 1
                ? 'rounded-xl'
                : `${isFirst ? 'rounded-t-xl' : ''} ${isLast ? 'rounded-b-xl' : ''} ${!isFirst && !isLast ? 'rounded-none' : ''}`;
              const cardBorder = isFirst ? 'border' : 'border-x border-b border-t-0';

              return (
                <div key={activity.id} className={`flex flex-col gap-3 ${cardBorder} border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between ${cardCorners}`}>
                  <div className="space-y-1">
                    <p className="text-sm text-foreground">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">{activity.content}</p>
                    <p className="text-xs text-muted-foreground">{relativeTime(activity.occurredAt)}</p>
                  </div>
              </div>
              );
            })}
          </div>
      </section>

      <section className="!mt-16 space-y-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarCheck2 className="h-5 w-5 text-muted-foreground" />
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Jump into your most-used workflows.</p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/feed/create">Draft New Campaign Post</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/accounts">Manage Connected Accounts</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/uploads">Review Media Library</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/settings">Open Settings</Link>
            </Button>

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Tip</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the schedule view to distribute posts by platform and avoid same-hour publishing spikes.
              </p>
            </div>
          </div>
      </section>
    </div>
  );
}
