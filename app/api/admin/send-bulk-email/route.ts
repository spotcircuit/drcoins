import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = req.headers.get('Authorization');
    const adminPassword = process.env.ADMIN_PASSWORD || 'drcoins2024';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const providedPassword = authHeader.replace('Bearer ', '');
    if (providedPassword !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin password' },
        { status: 401 }
      );
    }

    // Parse request body
    const { emails, subject, htmlContent, textContent } = await req.json();

    // Validate required fields
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid emails array' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid subject' },
        { status: 400 }
      );
    }

    if (!htmlContent && !textContent) {
      return NextResponse.json(
        { error: 'Missing email content (htmlContent or textContent required)' },
        { status: 400 }
      );
    }

    // Validate all email addresses
    const invalidEmails = emails.filter(email => !EMAIL_REGEX.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid email addresses found',
          invalidEmails
        },
        { status: 400 }
      );
    }

    // Rate limiting check (max 100 recipients per request)
    if (emails.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 recipients allowed per request' },
        { status: 400 }
      );
    }

    // Prepare email data
    const emailData: any = {
      from: getSenderEmail(),
      to: emails,
      subject,
      html: htmlContent || '',
      text: textContent || htmlContent?.replace(/<[^>]*>/g, '') || '' // Strip HTML for text fallback
    };

    // Send email using Resend
    console.log(`Sending bulk email to ${emails.length} recipients:`, {
      subject,
      recipientCount: emails.length
    });

    const data = await resend.emails.send(emailData);

    console.log('Bulk email sent successfully:', {
      id: data.data?.id,
      recipientCount: emails.length
    });

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${emails.length} recipient(s)`,
      recipientCount: emails.length,
      emailId: data.data?.id
    });

  } catch (error: any) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to send bulk email',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
