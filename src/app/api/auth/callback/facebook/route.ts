
import { NextRequest, NextResponse } from 'next/server';
import { handleFacebookCallback } from '@/actions/facebook/callback';
import { logError } from '@/lib/error-logging';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    await logError({
      process: 'Facebook OAuth Callback',
      location: 'GET /api/auth/callback/facebook',
      errorMessage: errorDescription || 'User denied the request or an error occurred.',
      context: { error, errorDescription },
    });
    // Redirect to a user-friendly error page
    return NextResponse.redirect(new URL('/accounts/add?error=facebook-denied', request.url));
  }

  if (!code || !state) {
    await logError({
      process: 'Facebook OAuth Callback',
      location: 'GET /api/auth/callback/facebook',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(new URL('/accounts/add?error=invalid-callback', request.url));
  }

  const result = await handleFacebookCallback(code, state);

  if (result.success) {
    return NextResponse.redirect(new URL('/accounts?status=success', request.url));
  } else {
    // The error is already logged inside handleFacebookCallback
    return NextResponse.redirect(new URL(`/accounts/add?error=${result.error}`, request.url));
  }
}
