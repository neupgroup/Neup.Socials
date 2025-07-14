'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const accounts = [
  {
    id: 1,
    platform: 'Twitter',
    username: '@teamsocial',
    connectedOn: '2023-10-26',
    status: 'Active',
    icon: <Twitter className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 2,
    platform: 'Facebook',
    username: 'TeamSocial App',
    connectedOn: '2023-10-25',
    status: 'Active',
    icon: <Facebook className="h-5 w-5 text-blue-600" />,
  },
  {
    id: 3,
    platform: 'LinkedIn',
    username: 'TeamSocial Inc.',
    connectedOn: '2023-10-24',
    status: 'Active',
    icon: <Linkedin className="h-5 w-5 text-blue-700" />,
  },
   {
    id: 4,
    platform: 'Instagram',
    username: '@teamsocial_app',
    connectedOn: '2024-01-15',
    status: 'Expired',
    icon: <Instagram className="h-5 w-5 text-pink-500" />,
  },
];

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground">Manage your connected social media accounts.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Connect New Account
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Connected On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {account.icon}
                      <span className="font-medium">{account.platform}</span>
                    </div>
                  </TableCell>
                  <TableCell>{account.username}</TableCell>
                  <TableCell>{account.connectedOn}</TableCell>
                  <TableCell>
                    <Badge variant={account.status === 'Active' ? 'default' : 'destructive'}>{account.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Refresh Connection</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive hover:text-destructive-foreground">Disconnect</DropdownMenuItem>
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