
'use client';

import * as React from 'react';
import { Users, ThumbsUp, MessageCircle, Share2, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const overviewData = [
  { title: 'Total Followers', value: '12,345', change: '+20.1%', icon: <Users /> },
  { title: 'Total Engagement', value: '4,567', change: '+15.2%', icon: <ThumbsUp /> },
  { title: 'Total Reach', value: '89,123', change: '-2.5%', icon: <Share2 /> },
  { title: 'New Messages', value: '89', change: '+5', icon: <MessageCircle /> },
];

const recentActivity = [
  { id: '1', type: 'New Follower', description: 'John Doe started following your Facebook Page.', platform: 'Facebook' },
  { id: '2', type: 'New Comment', description: 'Jane Smith commented on your LinkedIn post.', platform: 'LinkedIn' },
  { id: '3', type: 'New Message', description: 'A new message from +1234567890.', platform: 'WhatsApp' },
  { id: '4', type: 'Post Published', description: 'Your post about the summer sale was published.', platform: 'Instagram' },
  { id: '5', type: 'Sync Complete', description: 'Synced 52 new posts from your Facebook page.', platform: 'Facebook' },
];

export default function DashboardPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/content/create">Create New Post</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {overviewData.map(item => (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
              <div className="text-muted-foreground">{item.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                 {item.change.startsWith('+') ? <ArrowUp className="h-3 w-3 text-green-500 mr-1" /> : <ArrowDown className="h-3 w-3 text-red-500 mr-1" />}
                {item.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity />
              Recent Activity
            </CardTitle>
            <CardDescription>
              A log of recent events across your connected accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentActivity.map(activity => (
                        <TableRow key={activity.id}>
                            <TableCell>
                                <Badge variant={activity.type.includes('New') ? 'default' : 'secondary'}>{activity.type}</Badge>
                            </TableCell>
                            <TableCell>{activity.description}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>An overview of your profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               {['Facebook', 'Instagram', 'LinkedIn', 'WhatsApp'].map(platform => (
                 <div key={platform} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">{platform} Account</span>
                    <Badge variant="outline">Connected</Badge>
                 </div>
               ))}
                <Button asChild variant="outline" className="w-full mt-4">
                    <Link href="/accounts">Manage Accounts</Link>
                </Button>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
