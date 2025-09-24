
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Twitter, Linkedin, Facebook, Instagram, Youtube, Loader2, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Badge } from './ui/badge';

type ConnectedAccount = {
  id: string;
  platform: string;
  name: string;
  username: string;
};

type Post = {
    id: string;
    platformPostId: string;
    accountId: string;
    platform: string;
    postLink: string;
    createdOn: any;
}

type PublicationStatusProps = {
  accountIds: string[];
  posts: Post[];
  postStatus: 'Published' | 'Scheduled' | 'Draft';
  publishedAt: string;
  scheduledAt: string;
  postCollectionId: string;
};

const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
  const props = { className: className || "h-6 w-6" };
  if (platform === 'Twitter') return <Twitter {...props} className="text-blue-400" />;
  if (platform === 'Facebook') return <Facebook {...props} className="text-blue-600" />;
  if (platform === 'LinkedIn') return <Linkedin {...props} className="text-blue-700" />;
  if (platform === 'Instagram') return <Instagram {...props} className="text-pink-500" />;
  if (platform === 'YouTube') return <Youtube {...props} className="text-red-600" />;
  return null;
}

export const PublicationStatus: React.FC<PublicationStatusProps> = ({ accountIds, posts = [], postStatus, publishedAt, scheduledAt, postCollectionId }) => {
  const [accounts, setAccounts] = React.useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true);
      const fetchedAccounts: ConnectedAccount[] = [];
      for (const id of accountIds) {
        const docRef = doc(db, 'connected_accounts', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          fetchedAccounts.push({ id: docSnap.id, ...docSnap.data() } as ConnectedAccount);
        }
      }
      setAccounts(fetchedAccounts);
      setLoading(false);
    };

    if (accountIds.length > 0) {
      fetchAccounts();
    } else {
        setLoading(false);
    }
  }, [accountIds]);

  if (loading) {
    return <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (accounts.length === 0) {
    return <p className="text-muted-foreground text-center">No platforms selected for this post.</p>;
  }

  return (
    <div className="space-y-4">
      {accounts.map(account => {
        const date = postStatus === 'Published' ? publishedAt : (postStatus === 'Scheduled' ? scheduledAt : 'Not yet scheduled');
        const individualPost = posts.find(p => p.accountId === account.id);
        const postUrl = individualPost?.postLink;

        return (
          <Card key={account.id} className="overflow-hidden">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <PlatformIcon platform={account.platform} />
                <div className="flex-1">
                  <p className="font-bold">{account.name}</p>
                  <p className="text-sm text-muted-foreground">@{account.username || account.id}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-start sm:items-end flex-shrink-0 gap-2 w-full sm:w-auto">
                 <div className="flex items-center gap-2">
                    <Badge variant={postStatus === 'Published' ? (individualPost ? 'default' : 'destructive') : 'secondary'}>
                        {postStatus === 'Published' ? (individualPost ? 'Published' : 'Failed') : postStatus}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{date}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" disabled={!postUrl} asChild>
                       {postUrl ? (
                         <a href={postUrl} target="_blank" rel="noopener noreferrer">
                           <ExternalLink className="mr-2 h-4 w-4" /> View Post
                         </a>
                       ) : (
                         <span>
                           <ExternalLink className="mr-2 h-4 w-4" /> View Post
                         </span>
                       )}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                        <Link href={`/content/edit/${postCollectionId}`}><Edit className="h-4 w-4"/></Link>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                 </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

    