import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address required' },
        { status: 400 }
      );
    }

    // Simulate webhook payment success email
    const testItems = [
      { name: '1000 Coins', quantity: 1, price: 9.99 },
      { name: '500 Coins', quantity: 2, price: 4.99 }
    ];

    console.log('Testing payment success email to:', email);

    const emailData = await resend.emails.send({
      from: getSenderEmail(),
      to: email,
      bcc: 'drcoins73@gmail.com',
      subject: 'Payment Successful - Dr. Coins',
      html: `
        <h2>Thank you for your purchase!</h2>
        <p>Your payment of $19.97 has been successfully processed.</p>
        <p><strong>LiveMe ID:</strong> test12345</p>
        <h3>Items Purchased:</h3>
        <ul>
          ${testItems.map((item: any) => `<li>${item.quantity}x ${item.name} - $${item.price.toFixed(2)}</li>`).join('')}
        </ul>
        <p><strong>What's next?</strong></p>
        <p>Your order is being processed and your coins will be delivered to your LiveMe account shortly. You will receive another email notification once your order has been successfully fulfilled.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p><em>This is a test email.</em></p>
      `,
      text: `Payment Successful - Thank you for your purchase of $19.97. Your order is being processed and you will receive another email once it has been fulfilled. This is a test email.`
    });

    console.log('Test payment success email sent:', emailData);

    return NextResponse.json({
      success: true,
      message: 'Test payment success email sent successfully',
      emailId: emailData.data?.id,
      sentTo: email,
      bccSentTo: 'drcoins73@gmail.com'
    });

  } catch (error: any) {
    console.error('Test webhook email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    );
  }
}