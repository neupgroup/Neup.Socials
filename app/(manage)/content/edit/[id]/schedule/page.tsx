
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
import { cn } from '@/core/lib/utils';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/core/hooks/use-toast';
import { publishPostAction } from '@/services/content/publish';
import { getPostCollectionAction, updatePostCollectionAction } from '@/services/db';

export default function EditSchedulePage() {
  const params = useParams();
  const id = params.id as string; // This is postCollectionId
  const [scheduleOption, setScheduleOption] = React.useState('now');
  const [postDate, setPostDate] = React.useState<Date | undefined>();
  const [postTime, setPostTime] = React.useState('10:00');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchPostCollection = async () => {
      setIsLoading(true);
      const data = await getPostCollectionAction(id);
      if (data) {
        if (data.status === 'Scheduled' && data.scheduledAt) {
          const scheduledDate = new Date(data.scheduledAt);
          setScheduleOption('later');
          setPostDate(scheduledDate);
          setPostTime(format(scheduledDate, 'HH:mm'));
        }
      } else {
        toast({ title: 'Post Collection not found', variant: 'destructive' });
        router.push('/content');
      }
      setIsLoading(false);
    };
    fetchPostCollection();
  }, [id, router, toast]);

  const handleSchedule = async () => {
    setIsSaving(true);
    try {
      if (scheduleOption === 'now') {
        const result = await publishPostAction(id);
        if (!result.success) {
          throw new Error(result.message);
        }
      } else {
        if (!postDate || !postTime) {
          toast({ title: 'Please select a date and time', variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        const [hours, minutes] = postTime.split(':');
        const scheduledDateTime = new Date(postDate);
        scheduledDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

        await updatePostCollectionAction(id, {
          status: 'Scheduled',
          scheduledAt: scheduledDateTime.toISOString(),
          publishedAt: null,
        });
      }

      toast({
        title: `Post ${scheduleOption === 'now' ? 'Published' : 'Scheduled'}!`,
        description: `Your post has been successfully ${scheduleOption === 'now' ? 'sent for publishing' : 'scheduled'}.`,
      });
      router.push(`/content/collection/${id}`);

    } catch (error: any) {
      console.error("Error scheduling/publishing post: ", error);
      toast({ 
          title: `Failed to ${scheduleOption === 'now' ? 'publish' : 'schedule'} post`, 
          description: error.message || 'An unexpected error occurred.',
          variant: 'destructive' 
      });
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

    
