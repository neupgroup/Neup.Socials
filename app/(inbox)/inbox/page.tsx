'use client';

import * as React from 'react';
import { MessageSquare, Inbox } from 'lucide-react';

export default function InboxPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4 max-w-md px-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <MessageSquare className="h-12 w-12 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Select a conversation</h2>
          <p className="text-muted-foreground">
            Choose a conversation from the sidebar to view messages and start chatting.
          </p>
        </div>
        <div className="pt-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Inbox className="h-4 w-4" />
            <span>Your messages will appear here</span>
          </div>
        </div>
      </div>
    </div>
  );
}
