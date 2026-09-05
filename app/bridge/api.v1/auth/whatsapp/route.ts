import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { code, state } = await request.json();
    if (typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing authorization code.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: { code, state: typeof state === 'string' ? state : null } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Authorization processing failed.' }, { status: 500 });
  }
}
