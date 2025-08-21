import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const body = await request.json();
    console.log('Webhook received:', body);
    return NextResponse.json({ status: 'success', message: 'Webhook received' });
}

export async function GET(request: Request) {
    return NextResponse.json({ message: 'This is the generic webhook endpoint. Use POST to send data.' });
}
