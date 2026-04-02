import { NextResponse } from 'next/server';
import { acknowledgeWebhookPost } from '../_helpers';
import { logError } from '@/lib/error-logging';

const ENDPOINT = '/bridge/webhook.v1/instagram';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.INSTAGRAM_TOKEN;

  if (!verifyToken) {
    await logError({
      process: 'instagram-webhook-verify',
      location: ENDPOINT,
      errorMessage: 'Missing INSTAGRAM_TOKEN.',
    });
    return new NextResponse('Server misconfigured', { status: 500 });
  }

  if (mode === 'subscribe' && token && challenge && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  return acknowledgeWebhookPost(request, ENDPOINT);
}
