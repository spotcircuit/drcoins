import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(req: NextRequest) {
  // Check if API key exists
  const hasKey = !!process.env.RESEND_API_KEY;
  const keyPreview = process.env.RESEND_API_KEY?.substring(0, 15) + '...';
  
  return NextResponse.json({
    hasResendKey: hasKey,
    keyPreview: keyPreview,
    nodeEnv: process.env.NODE_ENV
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      );
    }

    console.log('Test email - Resend key exists:', !!process.env.RESEND_API_KEY);
    console.log('Test email - Sending to:', email);

    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'Dr. Coins <noreply@dr-coins.com>',
      to: email,
      subject: 'Test Email from Dr. Coins',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email from your Dr. Coins admin panel.</p>
          <p>If you received this, email sending is working correctly!</p>
          <hr />
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toISOString()}<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        </div>
      `,
      text: 'This is a test email from Dr. Coins. If you received this, email sending is working!'
    });

    console.log('Test email result:', result);

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      result: result
    });

  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.body || error
    }, { status: 500 });
  }
}