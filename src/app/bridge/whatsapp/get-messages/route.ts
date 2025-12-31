import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { processWhatsAppWebhook } from '@/services/inbox/whatsapp';
import { logError } from '@/lib/error-logging';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Received WhatsApp webhook payload:', JSON.stringify(body, null, 2));

        // Process the incoming message(s)
        await processWhatsAppWebhook(body);

        return NextResponse.json({ status: 'success', message: 'Message received and processed' });

    } catch (error: any) {
        console.error('Error processing WhatsApp webhook:', error);
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
        try {
            // Find an account that matches the verify token
            const accountsRef = collection(db, 'connected_accounts');
            const q = query(accountsRef, where('platform', '==', 'WhatsApp'));
            const querySnapshot = await getDocs(q);
            
            let isValidToken = false;
            for (const doc of querySnapshot.docs) {
                // In a real app, you'd decrypt this. For now, we assume it's stored plaintext for verification
                // but this is NOT secure for production. The token should be encrypted.
                if (doc.data().metaVerifyToken === token) {
                    isValidToken = true;
                    break;
                }
            }

            if (isValidToken) {
                console.log('WhatsApp webhook verified successfully.');
                return new NextResponse(challenge, { status: 200 });
            } else {
                 console.warn(`WhatsApp webhook verification failed: No account found with verify_token: ${token}`);
                return new NextResponse('Forbidden', { status: 403 });
            }
        } catch (error: any) {
            await logError({
                process: 'whatsapp-webhook-get',
                location: 'Webhook Verification',
                errorMessage: 'Error during webhook verification in Firestore.',
                context: { error: error.message }
            });
            return new NextResponse('Internal Server Error', { status: 500 });
        }
    } else {
        console.warn('WhatsApp webhook verification failed: Missing mode or token.');
        return new NextResponse('Forbidden', { status: 403 });
    }
}
