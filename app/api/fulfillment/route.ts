import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { customerEmail, liveMeId, items, orderId } = await req.json();

    if (!customerEmail) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }

    const itemsList = items || [];
    const totalCoins = itemsList.reduce((sum: number, item: any) => 
      sum + (item.quantity || 0), 0
    );

    const data = await resend.emails.send({
      from: getSenderEmail(),
      to: [customerEmail],
      subject: 'Order Fulfilled - Your Coins Have Been Delivered!',
      html: `
        <h2>Your order has been fulfilled!</h2>
        <p>Great news! Your DrCoins have been successfully delivered to your LiveMe account.</p>
        ${liveMeId ? `<p><strong>LiveMe ID:</strong> ${liveMeId}</p>` : ''}
        ${orderId ? `<p><strong>Order ID:</strong> ${orderId}</p>` : ''}
        ${itemsList.length > 0 ? `
          <h3>Delivered Items:</h3>
          <ul>
            ${itemsList.map((item: any) => `<li>${item.quantity}x ${item.name}</li>`).join('')}
          </ul>
          <p><strong>Total Coins Delivered:</strong> ${totalCoins}</p>
        ` : ''}
        <p>Your coins should now be available in your LiveMe account. Please log in to your LiveMe app to verify that you have received them.</p>
        <p>If you don't see your coins or have any issues, please contact our support team immediately with your order details.</p>
        <p>Thank you for choosing DrCoins!</p>
      `,
      text: `Order Fulfilled - Your DrCoins have been delivered to your LiveMe account${liveMeId ? ` (ID: ${liveMeId})` : ''}. Please log in to verify you have received them.`
    });

    console.log('Fulfillment email sent successfully:', data);

    return NextResponse.json({ 
      success: true,
      message: 'Fulfillment email sent successfully',
      id: data.data?.id
    });

  } catch (error: any) {
    console.error('Fulfillment email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send fulfillment email' },
      { status: 500 }
    );
  }
}