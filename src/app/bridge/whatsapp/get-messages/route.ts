import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Here you would process the incoming WhatsApp message payload
        // For example, save it to your database
        console.log('Received WhatsApp message:', JSON.stringify(body, null, 2));

        // Respond to WhatsApp to acknowledge receipt
        return NextResponse.json({ status: 'success', message: 'Message received' });

    } catch (error) {
        console.error('Error processing WhatsApp webhook:', error);
        return new NextResponse('Error processing request', { status: 500 });
    }
}

export async function GET(request: Request) {
    // This endpoint is for WhatsApp's webhook verification
    // See: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    
    // In a real app, you would have a VERIFY_TOKEN in your environment variables
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "your-secret-verify-token";

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Respond with the challenge token from the request
        console.log('WhatsApp webhook verified');
        return new NextResponse(challenge, { status: 200 });
    } else {
        // Respond with '403 Forbidden' if tokens do not match
        console.warn('WhatsApp webhook verification failed');
        return new NextResponse('Forbidden', { status: 403 });
    }
}
