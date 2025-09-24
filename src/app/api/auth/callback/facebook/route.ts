import { handleFacebookCallback } from '@/actions/facebook/callback';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to handle the final step of the Facebook OAuth flow.
 * Facebook redirects the user to this endpoint after they have granted permissions.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/accounts?error=missing_params', request.url));
  }

  try {
    const result = await handleFacebookCallback(code, state);

    if (result.success) {
      // Redirect to the accounts page with a success message
      return NextResponse.redirect(new URL('/accounts?success=facebook_connected', request.url));
    } else {
      // Redirect with an error message
      return NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(result.error || 'unknown_error')}`, request.url));
    }
  } catch (error: any) {
    console.error('Facebook callback route error:', error);
    return NextResponse.redirect(new URL(`/accounts?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
