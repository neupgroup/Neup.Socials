
import { NextResponse } from 'next/server';
import { processWhatsAppWebhook } from '../../../../services/inbox/whatsapp';
import { logError } from '@/core/lib/error-logging';

export async function POST(request: Request) {
    console.log('📥 [Webhook] POST request received at /bridge/webhook.v1/whatsapp');

    try {
        const body = await request.json();
        console.log('📦 [Webhook] Payload:', JSON.stringify(body, null, 2));

        // Process the incoming message(s)
        console.log('🔄 [Webhook] Processing payload...');
        await processWhatsAppWebhook(body);
        console.log('✅ [Webhook] Processing complete');

        return NextResponse.json({ status: 'success', message: 'Webhook received and processed' });

    } catch (error: any) {
        console.error('❌ [Webhook] Error processing request:', error);
        await logError({
            process: 'whatsapp-webhook-post',
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
        // Hardcoded verification token for WhatsApp webhook
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

        if (token === verifyToken) {
            console.log('WhatsApp webhook verified successfully.');
            return new NextResponse(challenge, { status: 200 });
        } else {
            console.warn(`WhatsApp webhook verification failed: Token mismatch.`);
            return new NextResponse('Forbidden', { status: 403 });
        }
    } else {
        console.warn('WhatsApp webhook verification failed: Missing mode or token.');
        return new NextResponse('Forbidden', { status: 403 });
    }
}
