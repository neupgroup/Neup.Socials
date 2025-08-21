'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Facebook, Instagram, Youtube, Twitter, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const socialPlatforms = [
  { id: 'Facebook', name: 'Facebook', icon: <Facebook className="h-6 w-6 text-blue-600" /> },
  { id: 'Instagram', name: 'Instagram', icon: <Instagram className="h-6 w-6 text-pink-500" /> },
  {
    id: 'Threads',
    name: 'Threads',
    icon: (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
        <path d="M15.5 8.5c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5c1.5 0 2.5-1 2.5-2.5S17 8.5 15.5 8.5z"></path>
        <path d="M8.5 8.5c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5c1.5 0 2.5-1 2.5-2.5S10 8.5 8.5 8.5z"></path>
        <path d="M12 15.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"></path>
      </svg>
    ),
  },
  { id: 'YouTube', name: 'YouTube', icon: <Youtube className="h-6 w-6 text-red-600" /> },
  { id: 'Twitter', name: 'Twitter', icon: <Twitter className="h-6 w-6 text-blue-400" /> },
];

export default function EditPlatformsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      const docRef = doc(db, 'content', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedPlatforms(docSnap.data().platforms || []);
      } else {
        toast({ title: 'Post not found', variant: 'destructive' });
        router.push('/content');
      }
      setIsLoading(false);
    };
    fetchPost();
  }, [id, router, toast]);

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleNext = async () => {
    if (selectedPlatforms.length === 0) {
      toast({ title: 'Select at least one platform', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, 'content', id);
      await updateDoc(docRef, { platforms: selectedPlatforms });
      router.push(`/content/edit/${id}/schedule`);
    } catch (error) {
      console.error("Error updating platforms: ", error);
      toast({ title: 'Failed to save platforms', variant: 'destructive' });
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
        <p className="text-muted-foreground">Step 2 of 3: Change where to post your content</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Social Accounts</CardTitle>
          <CardDescription>Select all the platforms you want to post to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {socialPlatforms.map((platform) => (
            <div
              key={platform.id}
              onClick={() => handlePlatformToggle(platform.id)}
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent hover:border-primary data-[state=checked]:border-primary"
              data-state={selectedPlatforms.includes(platform.id) ? 'checked' : 'unchecked'}
            >
              <div className="flex items-center gap-4">
                {platform.icon}
                <span className="font-semibold">{platform.name}</span>
              </div>
              <Checkbox
                id={platform.id}
                checked={selectedPlatforms.includes(platform.id)}
                onCheckedChange={() => handlePlatformToggle(platform.id)}
                aria-label={`Select ${platform.name}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
         <Button asChild variant="outline" disabled={isSaving}>
          <Link href={`/content/edit/${id}`}>Previous: Edit Content</Link>
        </Button>
        <Button onClick={handleNext} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Next: Schedule Post
        </Button>
      </div>
    </div>
  );
}
