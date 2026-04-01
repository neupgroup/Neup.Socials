import { NextResponse } from 'next/server';
import { processFacebookWebhook } from '@/services/inbox/facebook';
import { logError } from '@/lib/error-logging';

const ENDPOINT = '/bridge/webhook.v1/facebook.page';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.FACEBOOK_PAGE_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    await logError({
      process: 'facebook-page-webhook-verify',
      location: ENDPOINT,
      errorMessage: 'Missing FACEBOOK_PAGE_VERIFY_TOKEN and FACEBOOK_VERIFY_TOKEN.',
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
    await processFacebookWebhook(body);

    return NextResponse.json({
      status: 'success',
      endpoint: ENDPOINT,
      processed: true,
      object: body?.object ?? null,
    });
  } catch (error: any) {
    await logError({
      process: 'facebook-page-webhook-post',
      location: ENDPOINT,
      errorMessage: error?.message || 'Failed to process Facebook page webhook payload.',
      context: { error: String(error) },
    });

    return new NextResponse('Invalid payload', { status: 400 });
  }
}
