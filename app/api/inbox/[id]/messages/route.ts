import { NextResponse } from 'next/server';
import { listConversationMessagesAction } from '@/services/conversations/actions';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const messages = await listConversationMessagesAction(id);
  return NextResponse.json({ messages });
}
