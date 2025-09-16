import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text, bcc } = await req.json();

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, and html/text' },
        { status: 400 }
      );
    }

    // Prepare email data
    const emailData: any = {
      from: getSenderEmail(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || '',
      text: text || ''
    };

    // Add BCC if provided
    if (bcc) {
      emailData.bcc = Array.isArray(bcc) ? bcc : [bcc];
    }

    // Send email using Resend
    const data = await resend.emails.send(emailData);

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