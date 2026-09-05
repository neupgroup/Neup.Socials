import { NextRequest, NextResponse } from 'next/server';
import { handleLinkedInCallback } from '@/services/linkedin/callback';
import { logError } from '@/services/error-logging';
import { Link } from '#/components/ui/link';

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
    return NextResponse.redirect(Link.takesTo('/accounts/add?error=linkedin-denied').get());
  }

  if (!code || !state) {
    await logError({
      process: 'LinkedIn OAuth Callback',
      location: 'GET /bridge/callback.v1/auth.linkedin',
      errorMessage: 'Missing code or state parameter in callback.',
    });
    return NextResponse.redirect(Link.takesTo('/accounts/add?error=invalid-callback').get());
  }

  state = decodeURIComponent(state);

  const result = await handleLinkedInCallback(code, state);

  if (result.success) {
    return NextResponse.redirect(Link.takesTo('/bridge/success?status=success&platform=LinkedIn').get());
  }

  return NextResponse.redirect(Link.takesTo(`/bridge/success?error=${encodeURIComponent(result.error ?? 'callback-failed')}&platform=LinkedIn`).get());
}
