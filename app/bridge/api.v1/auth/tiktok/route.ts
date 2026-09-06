import { NextRequest, NextResponse } from 'next/server';
import { handleTikTokCallback } from '@/services/tiktok/callback';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    if (typeof code !== 'string' || typeof state !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing TikTok authorization response.' }, { status: 400 });
    }
    const result = await handleTikTokCallback(code, state);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'TikTok authorization processing failed.' }, { status: 500 });
  }
}

