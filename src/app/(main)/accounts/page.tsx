'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Twitter, Facebook, Linkedin, Instagram, MoreHorizontal, Loader2 } from 'lucide-react';
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
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type Account = {
  id: string;
  platform: string;
  username: string;
  name?: string;
  connectedOn: string;
  status: string;
  icon: React.ReactNode;
  owner: string;
};

const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
        case 'Twitter': return <Twitter className="h-5 w-5 text-blue-400" />;
        case 'LinkedIn': return <Linkedin className="h-5 w-5 text-blue-700" />;
        case 'Facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
        case 'Instagram': return <Instagram className="h-5 w-5 text-pink-500" />;
        default: return null;
    }
}

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const owner = 'neupkishor';

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'connected_accounts'), where('owner', '==', owner));
      const querySnapshot = await getDocs(q);
      const fetchedAccounts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          platform: data.platform,
          username: data.username,
          name: data.name,
          connectedOn: format(data.connectedOn.toDate(), 'yyyy-MM-dd'),
          status: data.status,
          owner: data.owner,
          icon: <PlatformIcon platform={data.platform} />,
        }
      });
      setAccounts(fetchedAccounts);
    } catch (error) {
      console.error("Error fetching accounts: ", error);
      toast({ title: 'Error fetching accounts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [owner, toast]);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const connectPlatform = async (platform: 'Facebook' | 'Instagram' | 'Twitter' | 'LinkedIn') => {
    try {
        const newAccountData = {
            platform,
            username: platform === 'Facebook' ? 'TeamSocial App' : 
                      platform === 'Instagram' ? '@teamsocial_app' :
                      platform === 'Twitter' ? '@teamsocial' :
                      'TeamSocial Inc.',
            name: platform === 'LinkedIn' ? 'TeamSocial Inc.' : undefined,
            status: 'Active',
            connectedOn: serverTimestamp(),
            owner: owner,
        };
        
      await addDoc(collection(db, 'connected_accounts'), newAccountData);
      toast({ title: `${platform} connected successfully!` });
      fetchAccounts(); // Re-fetch accounts to update the list
      setOpen(false);

    } catch (error) {
        console.error(`Error connecting ${platform}: `, error);
        toast({ title: `Failed to connect ${platform}`, variant: 'destructive' });
    }
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
               <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Twitter className="h-8 w-8 text-blue-400" />
                  <span className="font-semibold text-lg">Twitter</span>
                </div>
                <Button onClick={() => connectPlatform('Twitter')} disabled={isConnected('Twitter')}>
                  {isConnected('Twitter') ? 'Connected' : 'Connect'}
                </Button>
              </div>
               <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Linkedin className="h-8 w-8 text-blue-700" />
                  <span className="font-semibold text-lg">LinkedIn</span>
                </div>
                <Button onClick={() => connectPlatform('LinkedIn')} disabled={isConnected('LinkedIn')}>
                  {isConnected('LinkedIn') ? 'Connected' : 'Connect'}
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
              {loading ? (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              ) : accounts.length === 0 ? (
                 <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No accounts connected yet.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
