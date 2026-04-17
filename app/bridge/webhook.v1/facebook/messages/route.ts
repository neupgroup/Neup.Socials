import { NextResponse } from 'next/server';
import { processFacebookMessagesWebhook } from '@/services/inbox/facebook';
import { verifyWebhookRequest } from '@/app/bridge/webhook.v1/_helpers';
import { logError } from '@/core/lib/error-logging';

const ENDPOINT = '/bridge/webhook.v1/facebook/messages';

export async function GET(request: Request) {
  const response = await verifyWebhookRequest(
    request,
    'FACEBOOK_PAGE_VERIFY_TOKEN',
    ENDPOINT
  );

  if (response.status !== 500) {
    return response;
  }

  return verifyWebhookRequest(request, 'FACEBOOK_VERIFY_TOKEN', ENDPOINT);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await processFacebookMessagesWebhook(body);

    return NextResponse.json({
      status: 'success',
      endpoint: ENDPOINT,
      processed: true,
      object: body?.object ?? null,
    });
  } catch (error: any) {
    await logError({
      process: 'facebook-messages-webhook-post',
      location: ENDPOINT,
      errorMessage: error?.message || 'Failed to process Facebook messages webhook payload.',
      context: { error: String(error) },
    });

    return new NextResponse('Invalid payload', { status: 400 });
  }
}
