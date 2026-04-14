import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';
import { logPlaidApiError } from '@/lib/plaid-log';

const resend = new Resend(process.env.RESEND_API_KEY);

/** Customer + admin emails when a bank (Plaid ACH) order reaches COMPLETED after settlement. */
export async function sendPlaidAchSettledCompletionEmails(orderInternalId: string): Promise<void> {
  const finalOrder = await prisma.order.findUnique({
    where: { id: orderInternalId },
    include: { items: true, customer: true },
  });
  if (!finalOrder || !finalOrder.customer?.email) return;

  const customer = finalOrder.customer;
  const amountUsd = Number(finalOrder.amount);
  const totalCoins = finalOrder.items.reduce(
    (sum, item) => sum + (item.amount ? item.quantity * item.amount : 0),
    0
  );

  try {
    await resend.emails.send({
      from: getSenderEmail(),
      to: customer.email,
      bcc: 'drcoins73@gmail.com',
      subject: 'Payment Successful - Dr. Coins',
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #7c3aed;">Thank you for your purchase!</h2>
                  <p>Your bank payment of <strong>$${amountUsd.toFixed(2)}</strong> has <strong>settled</strong>. Your order is confirmed.</p>
                  ${finalOrder.liveMeId ? `<p><strong>LiveMe ID:</strong> ${finalOrder.liveMeId}</p>` : ''}
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin-top: 0;">Items Purchased:</h3>
                    <ul>
                      ${finalOrder.items
                        .map((item) => {
                          const line = Number(item.price);
                          let itemText = `${item.quantity}x ${item.name} - $${line.toFixed(2)}`;
                          if (item.amount) {
                            const itemCoins = item.quantity * item.amount;
                            itemText += ` (${itemCoins.toLocaleString()} coins)`;
                          }
                          return `<li>${itemText}</li>`;
                        })
                        .join('')}
                    </ul>
                    ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                  </div>
                  <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>What's next?</strong></p>
                    <p style="margin: 10px 0 0 0;">Your coins will be delivered to your LiveMe account per our fulfillment timeline.</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">- The Dr. Coins Team</p>
                </div>
              `,
      text: `Payment settled - $${amountUsd.toFixed(2)}${totalCoins > 0 ? ` (${totalCoins.toLocaleString()} coins)` : ''}. Bank transfer via Plaid.`,
    });

    await prisma.emailLog.create({
      data: {
        orderId: finalOrder.id,
        email: customer.email,
        type: 'PAYMENT_SUCCESS',
        subject: 'Payment Successful - Dr. Coins',
        success: true,
      },
    });
  } catch (emailError) {
    console.error('Plaid settlement customer email:', emailError);
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'drcoins73@gmail.com';
  try {
    await resend.emails.send({
      from: getSenderEmail(),
      to: adminEmail,
      subject: `Order settled (Plaid ACH) - ${finalOrder.liveMeId || 'No LiveMe ID'}`,
      html: `<p>Bank order settled: ${customer.email} — $${amountUsd.toFixed(2)} — Plaid transfer ${finalOrder.plaidTransferId}</p>`,
      text: `Bank order settled from ${customer.email} for $${amountUsd.toFixed(2)}. Plaid transfer ${finalOrder.plaidTransferId}`,
    });
    await prisma.emailLog.create({
      data: {
        orderId: finalOrder.id,
        email: adminEmail,
        type: 'ADMIN_NOTIFICATION',
        subject: `Order settled (Plaid ACH) - ${finalOrder.liveMeId || 'No LiveMe ID'}`,
        success: true,
      },
    });
  } catch (e) {
    logPlaidApiError('plaid_settlement_admin_email', e, { orderId: finalOrder.orderId });
  }
}
