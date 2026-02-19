import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * ForumPay webhook: called when a crypto payment is completed (or failed).
 * Configure this URL in ForumPay Dashboard: Notifications for Payments.
 * Payload structure: confirm with ForumPay docs; we expect reference_no (orderId) and status.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ForumPay may send reference_no (our orderId) or similar – adjust keys if docs differ
    const orderId = body.reference_no ?? body.referenceNo ?? body.order_id ?? body.orderId ?? body.invoice_number;
    const status = (body.status ?? body.state ?? body.payment_status ?? '').toString().toLowerCase();

    if (!orderId) {
      console.warn('ForumPay webhook: missing order reference', body);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const order = await prisma.order.findUnique({
      where: { orderId: String(orderId) },
      include: { customer: true, items: true }
    });

    if (!order) {
      console.warn('ForumPay webhook: order not found', orderId);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Only update if still PENDING (idempotent)
    if (order.status !== 'PENDING') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const isSuccess = status === 'completed' || status === 'paid' || status === 'confirmed' || status === 'success' || status === '1';

    if (isSuccess) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'Crypto',
          fulfillmentStatus: 'PENDING'
        }
      });

      await prisma.customer.update({
        where: { id: order.customerId },
        data: { lastOrderDate: new Date() }
      });

      // Optional: send confirmation email (same as card flow)
      if (order.customer?.email) {
        try {
          const totalCoins = order.items.reduce((sum, item) =>
            sum + (item.amount ? item.quantity * item.amount : 0), 0
          );
          await resend.emails.send({
            from: getSenderEmail(),
            to: order.customer.email,
            subject: 'Payment Successful - Dr. Coins (Crypto)',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">Thank you for your purchase!</h2>
                <p>Your crypto payment has been received. Order <strong>#${order.orderId}</strong>.</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                ${order.liveMeId ? `<p><strong>LiveMe ID:</strong> ${order.liveMeId}</p>` : ''}
                ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                <p>Your coins will be delivered to your LiveMe account shortly.</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">- The Dr. Coins Team</p>
              </div>
            `
          });
        } catch (e) {
          console.error('ForumPay webhook: failed to send customer email', e);
        }
      }
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('ForumPay webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
