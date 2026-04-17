'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
import { cn } from '@/core/lib/utils';
import { AIContentAssistant } from '@/components/ai-content-assistant';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Mock scheduled posts data
const mockScheduledPosts = [
  { id: 1, date: new Date(2026, 0, 5), platform: 'Twitter', content: 'New product launch!' },
  { id: 2, date: new Date(2026, 0, 5), platform: 'Facebook', content: 'Check out our latest blog post' },
  { id: 3, date: new Date(2026, 0, 10), platform: 'Instagram', content: 'Behind the scenes photo' },
  { id: 4, date: new Date(2026, 0, 15), platform: 'LinkedIn', content: 'Industry insights article' },
  { id: 5, date: new Date(2026, 0, 20), platform: 'Twitter', content: 'Weekly update thread' },
  { id: 6, date: new Date(2026, 0, 25), platform: 'Instagram', content: 'Customer testimonial' },
];

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'twitter': return 'bg-blue-500';
    case 'facebook': return 'bg-blue-600';
    case 'instagram': return 'bg-pink-500';
    case 'linkedin': return 'bg-blue-700';
    default: return 'bg-gray-500';
  }
};

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [postDate, setPostDate] = React.useState<Date | undefined>();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return mockScheduledPosts.filter(post => isSameDay(post.date, date));
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Content Calendar</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Post
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(currentDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* Actual days */}
                {daysInMonth.map((day) => {
                  const posts = getPostsForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square p-2 rounded-lg border-2 transition-all hover:border-primary/50",
                        "flex flex-col items-start justify-start",
                        isSelected && "border-primary bg-primary/5",
                        !isSelected && "border-transparent hover:bg-accent",
                        isCurrentDay && "bg-primary/10"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium mb-1",
                        isCurrentDay && "text-primary font-bold"
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-wrap gap-1 w-full">
                        {posts.slice(0, 2).map((post) => (
                          <div
                            key={post.id}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              getPlatformColor(post.platform)
                            )}
                          />
                        ))}
                        {posts.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{posts.length - 2}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Posts Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDatePosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No posts scheduled for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDatePosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className={cn("text-white", getPlatformColor(post.platform))}>
                        {post.platform}
                      </Badge>
                    </div>
                    <p className="text-sm">{post.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-sm text-muted-foreground">Twitter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-600" />
              <span className="text-sm text-muted-foreground">Facebook</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-pink-500" />
              <span className="text-sm text-muted-foreground">Instagram</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-700" />
              <span className="text-sm text-muted-foreground">LinkedIn</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
