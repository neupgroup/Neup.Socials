'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AIContentAssistant } from '@/components/ai-content-assistant';
import { Separator } from '@/components/ui/separator';

export default function SchedulePage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [postDate, setPostDate] = React.useState<Date | undefined>();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Schedule Post</Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl w-full">
            <SheetHeader>
              <SheetTitle>Create a new post</SheetTitle>
              <SheetDescription>
                Craft your message, select your platforms, and schedule it for the perfect time.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="post-content">Content</Label>
                <Textarea id="post-content" placeholder="What's on your mind?" rows={5} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select>
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !postDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {postDate ? format(postDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={postDate}
                        onSelect={setPostDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Save as Draft</Button>
                <Button>Schedule Post</Button>
              </div>

              <Separator />

              <AIContentAssistant />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardContent className="p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="p-4"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 flex-1",
              caption_label: "text-lg font-medium",
              table: "w-full border-collapse space-y-1",
              head_row: "flex justify-around",
              row: "flex w-full mt-2 justify-around",
              day: "h-16 w-full text-center text-sm p-1 relative",
            }}
            components={{
              DayContent: ({ date, ...props }) => (
                <div className="flex flex-col items-start h-full w-full p-1 border rounded-md hover:bg-accent/50">
                  <span className="font-medium">{format(date, 'd')}</span>
                  {/* Mock post indicators */}
                  {date.getDate() % 5 === 0 && (
                     <div className="w-full mt-1 text-xs bg-primary/20 text-primary-foreground p-1 rounded-sm truncate">Post to Twitter</div>
                  )}
                   {date.getDate() % 7 === 0 && (
                     <div className="w-full mt-1 text-xs bg-accent/30 text-accent-foreground p-1 rounded-sm truncate">Instagram Story</div>
                  )}
                </div>
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
