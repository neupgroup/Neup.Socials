import { NextRequest, NextResponse } from 'next/server';
import { handleFacebookCallback } from '@/services/facebook/callback';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    if (typeof code !== 'string' || typeof state !== 'string') return NextResponse.json({ success: false, error: 'Missing authorization response.' }, { status: 400 });
    const result = await handleFacebookCallback(code, state);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Authorization processing failed.' }, { status: 500 });
  }
}
