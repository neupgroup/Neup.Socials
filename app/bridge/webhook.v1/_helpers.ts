import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-logging';

export async function verifyWebhookRequest(
  request: Request,
  verifyTokenEnv: string,
  endpointName: string
) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env[verifyTokenEnv];

  if (!verifyToken) {
    await logError({
      process: 'webhook-verify-missing-token',
      location: endpointName,
      errorMessage: `Missing environment variable: ${verifyTokenEnv}`,
    });
    return new NextResponse('Server misconfigured', { status: 500 });
  }

  if (mode === 'subscribe' && token && challenge && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export async function acknowledgeWebhookPost(request: Request, endpointName: string) {
  try {
    const body = await request.json();

    return NextResponse.json({
      status: 'success',
      endpoint: endpointName,
      received: true,
      object: body?.object ?? null,
    });
  } catch (error: any) {
    await logError({
      process: 'webhook-post-parse-failed',
      location: endpointName,
      errorMessage: error?.message || 'Failed to parse webhook payload.',
      context: { error: String(error) },
    });

    return new NextResponse('Invalid payload', { status: 400 });
  }
}
