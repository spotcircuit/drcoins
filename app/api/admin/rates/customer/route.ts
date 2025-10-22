import { NextRequest, NextResponse } from 'next/server';
import { setCustomerRate, removeCustomerRate, setBulkCustomerRates } from '@/lib/pricing-rates';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// Simple admin auth check
function isAdminAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const [type, password] = authHeader.split(' ');
  return type === 'Bearer' && password === process.env.ADMIN_PASSWORD;
}

// Send rate notification email
async function sendRateNotificationEmail(
  email: string,
  rate: number,
  type: 'permanent' | 'temporary',
  expiresAt: string | null,
  note?: string
) {
  try {
    const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .rate-box {
              background: white;
              border: 3px solid #9333ea;
              border-radius: 10px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .rate-value {
              font-size: 36px;
              font-weight: bold;
              color: #9333ea;
              margin: 10px 0;
            }
            .rate-type {
              display: inline-block;
              background: ${type === 'permanent' ? '#10b981' : '#f59e0b'};
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
            }
            .expiry {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .note {
              background: #e0e7ff;
              border-left: 4px solid #6366f1;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background: #9333ea;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Special Rate Update!</h1>
            </div>
            <div class="content">
              <p>Great news! You've been assigned a special pricing rate for your LiveMe coin purchases.</p>

              <div class="rate-box">
                <div>Your New Rate</div>
                <div class="rate-value">${rate} coins per $1</div>
                <span class="rate-type">${type === 'permanent' ? '✓ Permanent' : '⏰ Temporary'}</span>
                <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
                  (Standard rate: 87 coins per $1)
                </p>
              </div>

              ${expiryDate ? `
                <div class="expiry">
                  <strong>⏰ Expiration:</strong> This special rate expires on <strong>${expiryDate}</strong>
                </div>
              ` : ''}

              ${note ? `
                <div class="note">
                  <strong>📝 Note from Admin:</strong><br/>
                  ${note}
                </div>
              ` : ''}

              <p>This special rate will be automatically applied to all your future purchases when you use this email address at checkout.</p>

              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://drcoins.com'}" class="cta-button">
                  Start Shopping Now
                </a>
              </div>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Simply enter your email address and LiveMe ID at checkout, and your special rate will be applied automatically!
              </p>
            </div>
            <div class="footer">
              <p>Thank you for being a valued customer!</p>
              <p>If you have any questions, please reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `🎉 Special Pricing Rate: ${rate} coins per $1`,
      html: htmlContent,
    });

    console.log(`Rate notification email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send rate notification to ${email}:`, error);
    // Don't throw - we don't want to fail the rate assignment if email fails
  }
}

// POST - Set customer rate (single or bulk)
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { email, emails, rate, type, expiresAt, note } = body;

    // Validate rate
    if (typeof rate !== 'number' || rate <= 0) {
      return NextResponse.json(
        { error: 'Invalid rate value' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'permanent' && type !== 'temporary') {
      return NextResponse.json(
        { error: 'Invalid rate type. Must be "permanent" or "temporary"' },
        { status: 400 }
      );
    }

    // Validate expiration for temporary rates
    if (type === 'temporary' && !expiresAt) {
      return NextResponse.json(
        { error: 'Expiration date required for temporary rates' },
        { status: 400 }
      );
    }

    // Bulk operation
    if (emails && Array.isArray(emails) && emails.length > 0) {
      await setBulkCustomerRates(emails, rate, type, expiresAt || null, 'admin', note);

      // Send email notifications to all customers (don't await - send in background)
      emails.forEach(customerEmail => {
        sendRateNotificationEmail(customerEmail, rate, type, expiresAt || null, note);
      });

      return NextResponse.json({
        success: true,
        message: `Rate set for ${emails.length} customers`,
        count: emails.length
      });
    }

    // Single customer operation
    if (!email) {
      return NextResponse.json(
        { error: 'Email or emails array required' },
        { status: 400 }
      );
    }

    await setCustomerRate(email, rate, type, expiresAt || null, 'admin', note);

    // Send email notification (don't await - send in background)
    sendRateNotificationEmail(email, rate, type, expiresAt || null, note);

    return NextResponse.json({
      success: true,
      message: 'Customer rate updated',
      email
    });
  } catch (error: any) {
    console.error('Error setting customer rate:', error);
    return NextResponse.json(
      { error: 'Failed to set customer rate' },
      { status: 500 }
    );
  }
}

// DELETE - Remove customer rate
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    await removeCustomerRate(email, 'admin');

    return NextResponse.json({
      success: true,
      message: 'Customer rate removed',
      email
    });
  } catch (error: any) {
    console.error('Error removing customer rate:', error);
    return NextResponse.json(
      { error: 'Failed to remove customer rate' },
      { status: 500 }
    );
  }
}
