import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API is working',
    timestamp: new Date().toISOString(),
    deployed: true
  });
}

export async function POST() {
  return NextResponse.json({ 
    message: 'POST is working',
    timestamp: new Date().toISOString()
  });
}