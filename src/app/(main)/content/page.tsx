'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Edit, Trash, Eye, Activity } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mockPosts = [
  { id: '1', content: 'Excited to announce our new feature launch! 🚀', status: 'Published', platform: 'Twitter', scheduledAt: '2024-07-28' },
  { id: '2', content: 'A deep dive into modern web development trends.', status: 'Scheduled', platform: 'LinkedIn', scheduledAt: '2024-08-01' },
  { id: '3', content: 'Our team\'s visit to the annual tech conference.', status: 'Draft', platform: 'Facebook', scheduledAt: '-' },
  { id: '4', content: 'Check out our latest product update video!', status: 'Published', platform: 'YouTube', scheduledAt: '2024-07-27' },
  { id: '5', content: 'Behind the scenes at TeamSocial.', status: 'Scheduled', platform: 'Instagram', scheduledAt: '2024-08-05' },
];


export default function ContentDashboardPage() {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Dashboard</h1>
          <p className="text-muted-foreground">Manage all your posts in one place.</p>
        </div>
        <Button asChild>
          <Link href="/content/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Post
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Content</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-sm truncate">{post.content}</TableCell>
                  <TableCell>{post.platform}</TableCell>
                  <TableCell>
                    <Badge variant={post.status === 'Published' ? 'default' : (post.status === 'Scheduled' ? 'secondary' : 'outline')}>
                      {post.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{post.scheduledAt}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                           <Link href={`/content/view/${post.id}`} className="flex items-center">
                            <Eye className="mr-2 h-4 w-4" /> View
                          </Link>
                        </DropdownMenuItem>
                         <DropdownMenuItem asChild>
                           <Link href={`/content/${post.id}/status`} className="flex items-center">
                            <Activity className="mr-2 h-4 w-4" /> Status
                          </Link>
                        </DropdownMenuItem>
                        {post.status !== 'Published' && (
                           <DropdownMenuItem asChild>
                            <Link href={`/content/edit/${post.id}`} className="flex items-center">
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive hover:text-destructive-foreground flex items-center">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
