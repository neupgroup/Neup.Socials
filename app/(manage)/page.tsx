
'use client';

import { ArrowDown, ArrowUp, BarChart3, CalendarCheck2, MessageCircle, Share2, Sparkles, ThumbsUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const overviewData = [
  { title: 'Total Followers', value: '12,345', change: '+20.1%', icon: Users },
  { title: 'Total Engagement', value: '4,567', change: '+15.2%', icon: ThumbsUp },
  { title: 'Total Reach', value: '89,123', change: '-2.5%', icon: Share2 },
  { title: 'New Messages', value: '89', change: '+5.0%', icon: MessageCircle },
];

const recentActivity = [
  { id: '1', type: 'New Follower', description: 'John Doe started following your Facebook page.', platform: 'Facebook', priority: 'high' },
  { id: '2', type: 'New Comment', description: 'Jane Smith commented on your LinkedIn post.', platform: 'LinkedIn', priority: 'normal' },
  { id: '3', type: 'New Message', description: 'A new message arrived from +1234567890.', platform: 'WhatsApp', priority: 'high' },
  { id: '4', type: 'Post Published', description: 'Your summer sale post has been published.', platform: 'Instagram', priority: 'normal' },
  { id: '5', type: 'Sync Complete', description: 'Synced 52 posts from your Facebook page.', platform: 'Facebook', priority: 'low' },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-6 shadow-sm md:px-8 md:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(10,188,197,0.16),transparent_48%),radial-gradient(circle_at_100%_100%,rgba(244,163,79,0.12),transparent_38%)]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Home Overview
            </div>
            <h1 className="font-headline text-3xl font-semibold tracking-tight md:text-4xl">Good morning. Your channels are active.</h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              4 posts are scheduled today, engagement is trending up, and inbox response time is improving.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/content/create">Create Post</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/schedule">Open Calendar</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/analytics">View Analytics</Link>
            </Button>
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
                <div className="rounded-xl border border-border/70 bg-muted/50 p-2">
                  <Icon className="h-4 w-4 text-primary" />
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>Prioritized events from your connected platforms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={activity.priority === 'high' ? 'default' : activity.priority === 'normal' ? 'secondary' : 'outline'}>
                        {activity.type}
                      </Badge>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{activity.platform}</span>
                    </div>
                    <p className="text-sm text-foreground">{activity.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/inbox">Review</Link>
                  </Button>
                </div>
                {index < recentActivity.length - 1 ? <Separator className="my-1" /> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump into your most-used workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start" variant="secondary">
              <Link href="/content/create">Draft New Campaign Post</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/accounts">Manage Connected Accounts</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/uploads">Review Media Library</Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/root/errors">Inspect System Errors</Link>
            </Button>

            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-semibold text-primary">Tip</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the schedule view to distribute posts by platform and avoid same-hour publishing spikes.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
