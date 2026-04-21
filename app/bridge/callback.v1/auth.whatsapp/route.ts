import { NextRequest, NextResponse } from 'next/server';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
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
