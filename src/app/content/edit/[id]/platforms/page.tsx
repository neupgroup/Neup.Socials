
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Facebook, Instagram, Twitter, Linkedin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

type ConnectedAccount = {
  id: string;
  platform: string;
  name: string;
  username: string;
  owner: string;
};

const PlatformIcon = ({ platform }: { platform: string }) => {
    switch(platform) {
        case 'Twitter': return <Twitter className="h-6 w-6 text-blue-400" />;
        case 'LinkedIn': return <Linkedin className="h-6 w-6 text-blue-700" />;
        case 'Facebook': return <Facebook className="h-6 w-6 text-blue-600" />;
        case 'Instagram': return <Instagram className="h-6 w-6 text-pink-500" />;
        default: return null;
    }
}

export default function EditPlatformsPage() {
  const params = useParams();
  const id = params.id as string; // This is postCollectionId
  const [connectedAccounts, setConnectedAccounts] = React.useState<ConnectedAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const owner = 'neupkishor'; // This should be dynamic in a real app

  React.useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch connected accounts
        const accountsQuery = query(collection(db, 'connected_accounts'), where('owner', '==', owner));
        const accountsSnapshot = await getDocs(accountsQuery);
        const accounts = accountsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ConnectedAccount));
        setConnectedAccounts(accounts);

        // Fetch existing selections from the post collection
        const pcDocRef = doc(db, 'postCollections', id);
        const pcDocSnap = await getDoc(pcDocRef);
        if (pcDocSnap.exists()) {
          const data = pcDocSnap.data();
          setSelectedAccountIds(data.accountIds || []);
        } else {
          toast({ title: 'Post Collection not found', variant: 'destructive' });
          router.push('/content');
        }
      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ title: 'Failed to load accounts', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [id, router, toast, owner]);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleNext = async () => {
    if (selectedAccountIds.length === 0) {
      toast({ title: 'Select at least one account', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, 'postCollections', id);
      const selectedPlatforms = connectedAccounts
        .filter(acc => selectedAccountIds.includes(acc.id))
        .map(acc => acc.platform);

      await updateDoc(docRef, { 
          accountIds: selectedAccountIds,
          platforms: Array.from(new Set(selectedPlatforms)) // Still useful for quick filtering/display
      });
      router.push(`/content/edit/${id}/schedule`);
    } catch (error) {
      console.error("Error updating accounts: ", error);
      toast({ title: 'Failed to save accounts', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Platforms</h1>
        <p className="text-muted-foreground">Step 2 of 3: Choose where to post your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Social Accounts</CardTitle>
          <CardDescription>Select all the accounts you want to post to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedAccounts.length > 0 ? (
            connectedAccounts.map((account) => (
              <div
                key={account.id}
                onClick={() => handleAccountToggle(account.id)}
                className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent hover:border-primary data-[state=checked]:border-primary"
                data-state={selectedAccountIds.includes(account.id) ? 'checked' : 'unchecked'}
              >
                <div className="flex items-center gap-4">
                  <PlatformIcon platform={account.platform} />
                  <div className="flex flex-col">
                    <span className="font-semibold">{account.name}</span>
                    <span className="text-sm text-muted-foreground">{account.username}</span>
                  </div>
                </div>
                <Checkbox
                  id={account.id}
                  checked={selectedAccountIds.includes(account.id)}
                  onCheckedChange={() => handleAccountToggle(account.id)}
                  aria-label={`Select ${account.name}`}
                />
              </div>
            ))
          ) : (
            <div className="text-center p-8 border-dashed border-2 rounded-lg">
                <p className="text-muted-foreground">You haven't connected any accounts yet.</p>
                <Button asChild variant="link">
                    <Link href="/accounts/add">Connect an Account</Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
         <Button asChild variant="outline" disabled={isSaving}>
          <Link href={`/content/edit/${id}`}>Previous: Edit Content</Link>
        </Button>
        <Button onClick={handleNext} disabled={isSaving || connectedAccounts.length === 0}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Next: Schedule Post
        </Button>
      </div>
    </div>
  );
}

    