import { NextRequest, NextResponse } from 'next/server';
import { handleFacebookCallback } from '@/services/facebook/callback';
import { handleInstagramCallback } from '@/services/instagram/callback';
import { logError } from '@/core/lib/error-logging';
import { toAppUrl } from '@/core/lib/app-url';

function resolvePlatformFromState(state: string) {
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8')) as {
      platform?: string;
      facebookIntents?: unknown;
    };
    if (decoded.platform) return decoded.platform;
    if (decoded.facebookIntents) return 'Facebook';
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  let state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    await logError({
      process: 'Meta OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.meta',
      errorMessage: errorDescription || 'User denied the request or an error occurred.',
      context: { error, errorDescription },
    });
    return NextResponse.redirect(toAppUrl('/accounts/add?error=meta-denied'));
  }

  if (!code || !state) {
    await logError({
      process: 'Meta OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.meta',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(toAppUrl('/accounts/add?error=invalid-callback'));
  }

  state = decodeURIComponent(state);
  const platform = resolvePlatformFromState(state);

  if (!platform) {
    await logError({
      process: 'Meta OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.meta',
      errorMessage: 'Missing platform in state payload.',
    });
    return NextResponse.redirect(toAppUrl('/accounts/add?error=invalid-callback'));
  }

  if (platform === 'Facebook') {
    const result = await handleFacebookCallback(code, state);

    if (result.success) {
      return NextResponse.redirect(toAppUrl('/bridge/success?status=success&platform=Facebook'));
    }

    return NextResponse.redirect(
      toAppUrl(`/bridge/success?error=${encodeURIComponent(result.error ?? 'callback-failed')}&platform=Facebook`)
    );
  }

  if (platform === 'Instagram') {
    const result = await handleInstagramCallback(code, state);

    if (result.success) {
      return NextResponse.redirect(toAppUrl('/bridge/success?status=success&platform=Instagram'));
    }

    return NextResponse.redirect(
      toAppUrl(`/bridge/success?error=${encodeURIComponent(result.error ?? 'callback-failed')}&platform=Instagram`)
    );
  }

  await logError({
    process: 'Meta OAuth Callback',
    location: 'GET /bridge/callback.v1/auth.meta',
    errorMessage: `Unsupported platform in state: ${platform}`,
  });
  return NextResponse.redirect(toAppUrl('/accounts/add?error=unsupported-platform'));
}
