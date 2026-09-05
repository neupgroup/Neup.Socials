import { NextResponse } from 'next/server';
import { listInstagramConversationMessagesAction } from '@/services/conversations/actions';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await listInstagramConversationMessagesAction(id);
  return NextResponse.json(result);
}
