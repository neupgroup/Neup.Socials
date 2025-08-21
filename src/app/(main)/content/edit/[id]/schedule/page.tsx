'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, Clock, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function EditSchedulePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [scheduleOption, setScheduleOption] = React.useState('now');
  const [postDate, setPostDate] = React.useState<Date | undefined>();
  const [postTime, setPostTime] = React.useState('10:00');
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
        const data = docSnap.data();
        if (data.status === 'Scheduled' && data.scheduledAt) {
          const scheduledDate = data.scheduledAt.toDate();
          setScheduleOption('later');
          setPostDate(scheduledDate);
          setPostTime(format(scheduledDate, 'HH:mm'));
        }
      } else {
        toast({ title: 'Post not found', variant: 'destructive' });
        router.push('/content');
      }
      setIsLoading(false);
    };
    fetchPost();
  }, [id, router, toast]);

  const handleSchedule = async () => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'content', id);
      let updateData: any = {};

      if (scheduleOption === 'now') {
        updateData = {
          status: 'Published',
          publishedAt: serverTimestamp(),
          scheduledAt: null,
        };
      } else {
        if (!postDate || !postTime) {
          toast({ title: 'Please select a date and time', variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        const [hours, minutes] = postTime.split(':');
        const scheduledDateTime = new Date(postDate);
        scheduledDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

        updateData = {
          status: 'Scheduled',
          scheduledAt: Timestamp.fromDate(scheduledDateTime),
        };
      }

      await updateDoc(docRef, updateData);

      toast({
        title: `Post ${scheduleOption === 'now' ? 'Published' : 'Scheduled'}!`,
        description: `Your post has been successfully ${scheduleOption === 'now' ? 'published' : 'scheduled'}.`,
      });
      router.push(`/content/view/${id}`);

    } catch (error) {
      console.error("Error scheduling post: ", error);
      toast({ title: 'Failed to schedule post', variant: 'destructive' });
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
        <h1 className="text-3xl font-bold">Schedule Your Post</h1>
        <p className="text-muted-foreground">Step 3 of 3: Choose when you want to publish</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling Options</CardTitle>
           <CardDescription>Publish immediately or schedule for a later date and time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={scheduleOption} onValueChange={setScheduleOption} className="space-y-4">
             <Label htmlFor="post-now" className="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary">
              <RadioGroupItem value="now" id="post-now" />
              <div className="ml-4">
                <span className="font-semibold">Post Immediately</span>
                <p className="text-sm text-muted-foreground">Publish your content as soon as you hit the button.</p>
              </div>
            </Label>
            <Label htmlFor="schedule-later" className="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary">
              <RadioGroupItem value="later" id="schedule-later" />
              <div className="ml-4">
                <span className="font-semibold">Schedule for Later</span>
                <p className="text-sm text-muted-foreground">Select a specific date and time to publish.</p>
              </div>
            </Label>
          </RadioGroup>

          {scheduleOption === 'later' && (
            <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={'outline'}
                      className={cn('w-full justify-start text-left font-normal', !postDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {postDate ? format(postDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={postDate} onSelect={setPostDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="time" type="time" value={postTime} onChange={(e) => setPostTime(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
       <div className="flex justify-between">
         <Button asChild variant="outline" disabled={isSaving}>
          <Link href={`/content/edit/${id}/platforms`}>Previous: Select Platforms</Link>
        </Button>
        <Button onClick={handleSchedule} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <Send className="mr-2 h-4 w-4" />
          {scheduleOption === 'now' ? 'Post Now' : 'Schedule Post'}
        </Button>
      </div>
    </div>
  );
}
