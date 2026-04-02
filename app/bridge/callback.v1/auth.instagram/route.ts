import { NextRequest, NextResponse } from 'next/server';
import { handleInstagramCallback } from '@/actions/instagram/callback';
import { logError } from '@/lib/error-logging';
import { buildUrlFromBase } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appOrigin = request.nextUrl.origin;
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
    return NextResponse.redirect(buildUrlFromBase(appOrigin, '/accounts/add?error=instagram-denied'));
  }

  if (!code || !state) {
    await logError({
      process: 'Instagram OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.instagram',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(buildUrlFromBase(appOrigin, '/accounts/add?error=invalid-callback'));
  }

  state = decodeURIComponent(state);

  const result = await handleInstagramCallback(code, state, appOrigin);

  if (result.success) {
    return NextResponse.redirect(buildUrlFromBase(appOrigin, '/accounts?status=success'));
  }

  return NextResponse.redirect(
    buildUrlFromBase(appOrigin, `/accounts/add?error=${encodeURIComponent(result.error ?? 'callback-failed')}`)
  );
}
