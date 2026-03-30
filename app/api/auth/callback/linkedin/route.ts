
import { NextRequest, NextResponse } from 'next/server';
import { handleLinkedInCallback } from '@/actions/linkedin/callback';
import { logError } from '@/lib/error-logging';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  let state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    await logError({
      process: 'LinkedIn OAuth Callback',
      location: 'GET /api/auth/callback/linkedin',
      errorMessage: errorDescription || 'User denied the request or an error occurred.',
      context: { error, errorDescription },
    });
    return NextResponse.redirect(new URL('/accounts/add?error=linkedin-denied', request.url));
  }

  if (!code || !state) {
    await logError({
      process: 'LinkedIn OAuth Callback',
      location: 'GET /api/auth/callback/linkedin',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(new URL('/accounts/add?error=invalid-callback', request.url));
  }

  // Decode the state parameter before validation
  state = decodeURIComponent(state);

  const result = await handleLinkedInCallback(code, state);

  if (result.success) {
    return NextResponse.redirect(new URL('/accounts?status=success', request.url));
  } else {
    return NextResponse.redirect(new URL(`/accounts/add?error=${result.error}`, request.url));
  }
}
