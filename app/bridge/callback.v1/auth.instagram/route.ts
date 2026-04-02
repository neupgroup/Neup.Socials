import { NextRequest, NextResponse } from 'next/server';
import { handleInstagramCallback } from '@/actions/instagram/callback';
import { logError } from '@/lib/error-logging';
import { getAppBaseUrl, buildUrlFromBase } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appBaseUrl = getAppBaseUrl();
  const code = searchParams.get('code');
  let state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    await logError({
      process: 'Instagram OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.instagram',
      errorMessage: errorDescription || 'User denied the request or an error occurred.',
      context: { error, errorDescription },
    });
    return NextResponse.redirect(buildUrlFromBase(appBaseUrl, '/accounts/add?error=instagram-denied'));
  }

  if (!code || !state) {
    await logError({
      process: 'Instagram OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.instagram',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(buildUrlFromBase(appBaseUrl, '/accounts/add?error=invalid-callback'));
  }

  state = decodeURIComponent(state);

  const result = await handleInstagramCallback(code, state);

  if (result.success) {
    return NextResponse.redirect(buildUrlFromBase(appBaseUrl, '/accounts?status=success'));
  }

  return NextResponse.redirect(
    buildUrlFromBase(appBaseUrl, `/accounts/add?error=${encodeURIComponent(result.error ?? 'callback-failed')}`)
  );
}
