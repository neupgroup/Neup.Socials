
import { NextResponse } from 'next/server';
import { processFacebookWebhook } from '../../../../../services/inbox/facebook';
import { logError } from '@/lib/error-logging';

export async function POST(request: Request) {
    console.log('📥 [Webhook] POST request received at /bridge/webhook/v1/facebook');

    try {
        const body = await request.json();
        console.log('📦 [Webhook] Payload:', JSON.stringify(body, null, 2));

        // Process the incoming message(s)
        console.log('🔄 [Webhook] Processing payload...');
        await processFacebookWebhook(body);
        console.log('✅ [Webhook] Processing complete');

        return NextResponse.json({ status: 'success', message: 'Webhook received and processed' });

    } catch (error: any) {
        console.error('❌ [Webhook] Error processing request:', error);
        await logError({
            process: 'facebook-webhook-post',
            location: 'Webhook Handler',
            errorMessage: error.message,
            context: { error: error.toString() }
        });
        return new NextResponse('Error processing request', { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token) {
        // Use validation token from env or default
        const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN; // Fallback for convenience if they share

        if (token === verifyToken) {
            console.log('Facebook webhook verified successfully.');
            return new NextResponse(challenge, { status: 200 });
        } else {
            console.warn(`Facebook webhook verification failed: Token mismatch.`);
            return new NextResponse('Forbidden', { status: 403 });
        }
    } else {
        console.warn('Facebook webhook verification failed: Missing mode or token.');
        return new NextResponse('Forbidden', { status: 403 });
    }
}
