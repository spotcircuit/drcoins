import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and html/text' },
        { status: 400 }
      );
    }

    // Send email using Resend
    const data = await resend.emails.send({
      from: 'Dr. Coins <noreply@dr-coins.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || '',
      text: text || ''
    });

    console.log('Email sent successfully:', data);

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully',
      id: data.data?.id
    });

  } catch (error: any) {
    console.error('Email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}