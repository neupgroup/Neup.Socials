import { logger } from '@/logica/logger';

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return Response.json({ success: false, error: 'Error payload is required.' }, { status: 400 });
  }

  try {
    const response = await logger
      .type('error')
      .data({
        source: 'client',
        ...(payload as Record<string, unknown>),
      })
      .error();

    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ success: false, error: 'Unable to send error to logger.' }, { status: 500 });
  }
}
