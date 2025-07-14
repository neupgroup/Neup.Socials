'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { format } from 'date-fns';

const initialAccounts = [
  {
    id: 1,
    platform: 'Twitter',
    username: '@teamsocial',
    connectedOn: '2023-10-26',
    status: 'Active',
    icon: <Twitter className="h-5 w-5 text-blue-400" />,
  },
  {
    id: 3,
    platform: 'LinkedIn',
    username: 'TeamSocial Inc.',
    connectedOn: '2023-10-24',
    status: 'Active',
    icon: <Linkedin className="h-5 w-5 text-blue-700" />,
  },
];

type Account = {
  id: number;
  platform: string;
  username: string;
  connectedOn: string;
  status: string;
  icon: React.ReactNode;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>(initialAccounts);
  const [open, setOpen] = React.useState(false);

  const connectPlatform = (platform: 'Facebook' | 'Instagram') => {
    const newAccount: Account = {
      id: accounts.length + 2, // a simple way to generate a unique id
      platform,
      username: platform === 'Facebook' ? 'TeamSocial App' : '@teamsocial_app',
      connectedOn: format(new Date(), 'yyyy-MM-dd'),
      status: 'Active',
      icon:
        platform === 'Facebook' ? (
          <Facebook className="h-5 w-5 text-blue-600" />
        ) : (
          <Instagram className="h-5 w-5 text-pink-500" />
        ),
    };
    setAccounts((prev) => [...prev, newAccount]);
    setOpen(false);
  };
  
  const isConnected = (platform: string) => accounts.some(acc => acc.platform === platform);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground">Manage your connected social media accounts.</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Connect New Account
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Connect a new platform</SheetTitle>
              <SheetDescription>
                Choose a platform to connect to your TeamSocial account.
              </SheetDescription>
            </SheetHeader>
            <div className="py-8 space-y-4">
               <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Facebook className="h-8 w-8 text-blue-600" />
                  <span className="font-semibold text-lg">Facebook</span>
                </div>
                <Button onClick={() => connectPlatform('Facebook')} disabled={isConnected('Facebook')}>
                  {isConnected('Facebook') ? 'Connected' : 'Connect'}
                </Button>
              </div>
               <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Instagram className="h-8 w-8 text-pink-500" />
                  <span className="font-semibold text-lg">Instagram</span>
                </div>
                <Button onClick={() => connectPlatform('Instagram')} disabled={isConnected('Instagram')}>
                  {isConnected('Instagram') ? 'Connected' : 'Connect'}
                </Button>
              </div>
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Close</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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
