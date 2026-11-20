import { NextResponse } from 'next/server';
import { loadOlderInstagramMessagesAction } from '@/services/conversations/actions';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const cursor = search.get('cursor') ?? undefined;
  const before = search.get('before') ?? undefined;
  const result = await loadOlderInstagramMessagesAction(id, before, cursor);
  return NextResponse.json({
    messages: { data: result.messages, paging: { next: result.next } },
    firstMessageOn: result.firstMessageOn,
  });
}
