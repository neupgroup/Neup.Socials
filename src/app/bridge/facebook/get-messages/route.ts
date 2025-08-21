import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();
    // In a real scenario, you would process the Facebook message here
    console.log('Received Facebook message:', body);

    // For now, we'll just acknowledge receipt
    return NextResponse.json({ status: 'success', message: 'Facebook message received' });
}

export async function GET(request: Request) {
    // Facebook webhook verification requires a GET request with a challenge parameter
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // In a real app, you'd verify the token against your app's secret
    if (mode === 'subscribe' && token) {
        return new NextResponse(challenge, { status: 200 });
    } else {
        return new NextResponse('Forbidden', { status: 403 });
    }
}
