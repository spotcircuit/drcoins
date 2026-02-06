import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'Checkout API is accessible',
    env: {
      hasAuthorizeNetKey: !!process.env.AUTHORIZENET_API_LOGIN_ID,
      appUrl: process.env.NEXT_PUBLIC_APP_URL
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Just echo back for testing
    return NextResponse.json({
      received: true,
      itemCount: body.items ? body.items.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 400 }
    );
  }
}