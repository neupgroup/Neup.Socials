import { NextRequest, NextResponse } from 'next/server';
import { handleFacebookCallback } from '@/services/facebook/callback';
import { handleInstagramCallback } from '@/services/instagram/callback';
import { logError } from '@/core/lib/error-logging';
import { toAppUrl } from '@/core/lib/app-url';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  if (!state) {
    const errorMessage = errorDescription || error || (code ? null : 'Missing authorization code.');

    const payload: Record<string, string> = {
      type: 'WHATSAPP_EMBEDDED_SIGNUP_CODE',
    };

    if (code) payload.code = code;
    if (errorMessage) payload.error = errorMessage;

    const payloadJson = escapeHtml(JSON.stringify(payload));
    const heading = errorMessage ? 'Embedded Signup Failed' : 'Embedded Signup Complete';
    const description = errorMessage || 'You can close this window and return to the app.';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)}</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 420px; width: 100%; text-align: center; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
    h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; }
    p { margin: 0 0 24px; color: #cbd5f5; line-height: 1.5; }
    button { width: 100%; border: 0; border-radius: 10px; padding: 12px 16px; font-weight: 600; cursor: pointer; }
    .primary { background: #3b82f6; color: #0f172a; }
    .ghost { background: transparent; color: #e2e8f0; border: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${escapeHtml(heading)}</h1>
      <p>${escapeHtml(description)}</p>
      <button class="${errorMessage ? 'ghost' : 'primary'}" onclick="tryClose()">Close Window</button>
    </div>
  </div>
  <script>
    (function () {
      var payload = ${payloadJson};
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
      }
      if (payload.code && !payload.error) {
        setTimeout(function () { tryClose(); }, 3000);
      }
    })();

    function tryClose() {
      try {
        window.close();
      } catch (e) {
        window.location.href = '/accounts/add';
      }
    }
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

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
