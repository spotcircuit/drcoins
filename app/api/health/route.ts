import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    env: {
      hasAuthorizeNetKey: !!process.env.AUTHORIZENET_API_LOGIN_ID,
      hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
    }
  });
}