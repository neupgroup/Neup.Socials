import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const phoneNumberId = searchParams.get('phone_number_id'); // Custom parameter we can use

    if (mode === 'subscribe' && token) {
        try {
            // Find the connected_account that matches the verify token
            const accountsRef = collection(db, 'connected_accounts');
            const q = query(accountsRef, where('platform', '==', 'WhatsApp'), where('metaVerifyToken', '==', token));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // We found at least one account with this token, so it's valid.
                console.log('WhatsApp webhook verified successfully.');
                return new NextResponse(challenge, { status: 200 });
            } else {
                 console.warn(`WhatsApp webhook verification failed: No account found with verify_token: ${token}`);
                return new NextResponse('Forbidden', { status: 403 });
            }
        } catch (error) {
            console.error('Error during webhook verification in Firestore:', error);
            return new NextResponse('Internal Server Error', { status: 500 });
        }
    } else {
        // Respond with '403 Forbidden' if mode or token are missing
        console.warn('WhatsApp webhook verification failed: Missing mode or token.');
        return new NextResponse('Forbidden', { status: 403 });
    }
}
