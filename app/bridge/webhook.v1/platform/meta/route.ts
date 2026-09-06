import { NextResponse } from 'next/server';
import { processFacebookMessagesWebhook } from '@/services/inbox/facebook';
import { verifyWebhookRequest } from '@/app/bridge/webhook.v1/_helpers';
import { logError } from '@/services/error-logging';
import { logger } from '#/logica/logger';
import { processInstagramWebhook } from '@/services/inbox/instagram';

const ENDPOINT = '/bridge/webhook.v1/platform/meta';

/**
 * Meta calls this endpoint during Page Webhooks setup.
 * The verification token must match the value configured in the Meta app.
 */
export async function GET(request: Request) {
  const response = await verifyWebhookRequest(
    request,
    'FACEBOOK_PAGE_VERIFY_TOKEN',
    ENDPOINT
  );

  if (response.status !== 500) {
    return response;
  }

  const instagramResponse = await verifyWebhookRequest(request, 'SOCIALS_INSTAGRAM_TOKEN', ENDPOINT);
  if (instagramResponse.status !== 500) return instagramResponse;
  return verifyWebhookRequest(request, 'SOCIALS_FACEBOOK_VERIFY_TOKEN', ENDPOINT);
}

/**
 * Receives Page Webhooks Messenger events.
 * A 200 response is returned as soon as the payload is parsed so Meta does not
 * retry while database work is being performed.
 */
export async function POST(request: Request) {
  let body: any;

  try {
    body = await request.json();
  } catch (error: any) {
    await logError({
      process: 'facebook-platform-webhook-post',
      location: ENDPOINT,
      errorMessage: error?.message || 'Failed to parse Facebook webhook payload.',
      context: { error: String(error) },
    });

    return new NextResponse('Invalid payload', { status: 400 });
  }

  const isPageWebhook = body?.object === 'page';
  const isInstagramWebhook = body?.object === 'instagram';
  const isMessageSample = (body?.sample ?? body)?.field === 'messages';

  if (!isPageWebhook && !isInstagramWebhook && !isMessageSample) {
    return new NextResponse('Not Found', { status: 404 });
  }

  void logger
    .type('facebook.webhook.received')
    .data({
      endpoint: ENDPOINT,
      object: body?.object ?? null,
      field: body?.field ?? body?.sample?.field ?? null,
      pageId: body?.entry?.[0]?.id ?? body?.value?.recipient?.id ?? body?.sample?.value?.recipient?.id ?? null,
      messageId: body?.entry?.[0]?.messaging?.[0]?.message?.mid
        ?? body?.value?.message?.mid
        ?? body?.sample?.value?.message?.mid
        ?? null,
    })
    .log()
    .catch(() => undefined);

  const processWebhook = isInstagramWebhook ? processInstagramWebhook : processFacebookMessagesWebhook;
  const processing = processWebhook(body).catch(async (error: any) => {
    await logError({
      process: 'facebook-platform-webhook-processing',
      location: ENDPOINT,
      errorMessage: error?.message || 'Failed to process Facebook Messenger events.',
      context: { error: String(error) },
    });
  });

  // Keep the promise alive for runtimes that support waitUntil, while still
  // acknowledging Meta immediately in every Next.js runtime.
  const requestWithContext = request as Request & {
    waitUntil?: (promise: Promise<unknown>) => void;
  };
  requestWithContext.waitUntil?.(processing);

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
