import { NextRequest, NextResponse } from 'next/server';
import { handleLinkedInCallback } from '@/actions/linkedin/callback';
import { logError } from '@/lib/error-logging';
import { toAppUrl } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  let state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    await logError({
      process: 'LinkedIn OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.linkedin',
      errorMessage: errorDescription || 'User denied the request or an error occurred.',
      context: { error, errorDescription },
    });
    return NextResponse.redirect(toAppUrl('/accounts/add?error=linkedin-denied'));
  }

  if (!code || !state) {
    await logError({
      process: 'LinkedIn OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.linkedin',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(toAppUrl('/accounts/add?error=invalid-callback'));
  }

  state = decodeURIComponent(state);

  const result = await handleLinkedInCallback(code, state);

  if (result.success) {
    return NextResponse.redirect(toAppUrl('/accounts?status=success'));
  }

  return NextResponse.redirect(toAppUrl(`/accounts/add?error=${encodeURIComponent(result.error ?? 'callback-failed')}`));
}
