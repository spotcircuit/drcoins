import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';
import { checkPayment } from '@/lib/forumpay';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * ForumPay webhook: receives minimal payload (no status). We call CheckPayment API
 * to get payment status, then update order. Payload: user, pos_id, address, currency, payment_id, reference_no.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const referenceNo = body.reference_no ?? body.referenceNo ?? body.order_id ?? body.orderId;
    const paymentId = body.payment_id ?? body.paymentId ?? body.id;
    const posId = body.pos_id ?? 'web';
    const currency = body.currency ?? '';
    const address = body.address ?? '';

    if (!referenceNo && !paymentId) {
      console.warn('ForumPay webhook: missing order reference and payment_id', body);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Find order by orderId (reference_no) or by ForumPay payment_id
    let order = referenceNo
      ? await prisma.order.findUnique({
          where: { orderId: String(referenceNo) },
          include: { customer: true, items: true }
        })
      : null;
    if (!order && paymentId) {
      const rows = await prisma.$queryRaw<[{ id: string }]>`
        SELECT id FROM "Order" WHERE "forumpayPaymentId" = ${String(paymentId)} LIMIT 1
      `;
      const foundId = rows[0]?.id;
      if (foundId) {
        order = await prisma.order.findUnique({
          where: { id: foundId },
          include: { customer: true, items: true }
        });
      }
    }

    if (!order) {
      console.warn('ForumPay webhook: order not found', { referenceNo, paymentId });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Webhook payload has no status; get it from CheckPayment API
    if (!currency || !address || !paymentId) {
      console.warn('ForumPay webhook: missing currency/address/payment_id for CheckPayment', body);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let paymentStatus: { confirmed?: boolean; cancelled?: boolean; state?: string; status?: string };
    try {
      paymentStatus = await checkPayment({
        posId: String(posId),
        currency: String(currency),
        paymentId: String(paymentId),
        address: String(address),
      });
    } catch (e) {
      console.error('ForumPay webhook: CheckPayment API error', e);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const confirmed = paymentStatus.confirmed === true;
    const cancelled = paymentStatus.cancelled === true;
    const state = (paymentStatus.state ?? '').toString().toLowerCase();

    if (confirmed && !cancelled) {
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
    } else if (cancelled || state === 'cancelled' || state === 'failed') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });
    }
    // else: still waiting (e.g. state 'waiting') – leave order as PENDING

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('ForumPay webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
