import { NextResponse } from 'next/server';
import { logError } from '@/core/lib/error-logging';
import { processInstagramWebhook } from '@/services/inbox/instagram';

const ENDPOINT = '/bridge/webhook.v1/instagram';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_TOKEN || process.env.INSTRGRAM_TOKEN;

  if (!verifyToken) {
    await logError({
      process: 'instagram-webhook-verify',
      location: ENDPOINT,
      errorMessage: 'Missing INSTAGRAM_TOKEN or INSTRGRAM_TOKEN.',
    });
    return new NextResponse('Server misconfigured', { status: 500 });
  }

  if (mode === 'subscribe' && token && challenge && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await processInstagramWebhook(body);

    return NextResponse.json({
      status: 'success',
      endpoint: ENDPOINT,
      processed: true,
      object: body?.object ?? null,
    });
  } catch (error: any) {
    await logError({
      process: 'instagram-webhook-post',
      location: ENDPOINT,
      errorMessage: error?.message || 'Failed to process Instagram webhook payload.',
      context: { error: String(error) },
    });

    return new NextResponse('Invalid payload', { status: 400 });
  }
}
