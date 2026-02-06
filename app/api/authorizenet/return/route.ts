import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTransactionDetails } from '@/lib/authorizenet';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const transId = searchParams.get('transId');

    if (!transId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=missing_transaction`);
    }

    console.log('Return handler called with transId:', transId);

    // Get transaction details from Authorize.Net
    const transaction = await getTransactionDetails(transId);

    // Find order by orderId (stored in transaction invoice number)
    const orderId = transaction.getOrder()?.getInvoiceNumber() || transId;

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        customer: true,
        items: true
      }
    });

    if (!order) {
      console.error('Order not found for orderId:', orderId);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=order_not_found`);
    }

    // Update order with transaction details
    const responseCode = transaction.getResponseCode();
    const isApproved = responseCode === 1; // 1 = Approved

    console.log('Transaction response code:', responseCode, 'Approved:', isApproved);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: isApproved ? 'PAID' : 'FAILED',
        authNetTransactionId: transId,
        authNetResponseCode: responseCode.toString(),
        authNetAuthCode: transaction.getAuthCode() || null,
        paymentMethod: 'Card' // Authorize.Net doesn't provide detailed method info in basic integration
      }
    });

    if (isApproved) {
      // Update customer last order date
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { lastOrderDate: new Date() }
      });

      // Send customer email
      if (order.customer.email) {
        try {
          const totalCoins = order.items.reduce((sum, item) =>
            sum + (item.amount ? item.quantity * item.amount : 0), 0
          );

          const emailData = await resend.emails.send({
            from: getSenderEmail(),
            to: order.customer.email,
            bcc: 'drcoins73@gmail.com',
            subject: 'Payment Successful - Dr. Coins',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">Thank you for your purchase!</h2>
                <p>Your payment of <strong>$${order.amount}</strong> has been successfully processed.</p>
                ${order.liveMeId ? `<p><strong>LiveMe ID:</strong> ${order.liveMeId}</p>` : ''}
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1f2937; margin-top: 0;">Items Purchased:</h3>
                  <ul>
                    ${order.items.map(item => {
                      let itemText = `${item.quantity}x ${item.name} - $${item.price}`;
                      if (item.amount) {
                        const itemCoins = item.quantity * item.amount;
                        itemText += ` (${itemCoins.toLocaleString()} coins)`;
                      }
                      return `<li>${itemText}</li>`;
                    }).join('')}
                  </ul>
                  ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                </div>
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;"><strong>What's next?</strong></p>
                  <p style="margin: 10px 0 0 0;">Your order is being processed and your coins will be delivered to your LiveMe account shortly. You will receive another email notification once your order has been successfully fulfilled.</p>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  If you have any questions, please don't hesitate to contact our support team.
                </p>
                <p style="color: #6b7280; font-size: 14px;">
                  - The Dr. Coins Team
                </p>
              </div>
            `,
            text: `Payment Successful - Thank you for your purchase of $${order.amount}${totalCoins > 0 ? ` (${totalCoins.toLocaleString()} coins)` : ''}. Your order is being processed and you will receive another email once it has been fulfilled.`
          });

          // Log email
          await prisma.emailLog.create({
            data: {
              orderId: order.id,
              email: order.customer.email,
              type: 'PAYMENT_SUCCESS',
              subject: 'Payment Successful - Dr. Coins',
              success: true,
              resendId: emailData.data?.id || null
            }
          });

          console.log('Customer email sent successfully');
        } catch (emailError) {
          console.error('Error sending customer email:', emailError);

          await prisma.emailLog.create({
            data: {
              orderId: order.id,
              email: order.customer.email,
              type: 'PAYMENT_SUCCESS',
              subject: 'Payment Successful - Dr. Coins',
              success: false,
              error: emailError instanceof Error ? emailError.message : 'Unknown error'
            }
          });
        }
      }

      // Send admin email
      const adminEmail = process.env.ADMIN_EMAIL || 'drcoins73@gmail.com';
      try {
        const totalCoins = order.items.reduce((sum, item) =>
          sum + (item.amount ? item.quantity * item.amount : 0), 0
        );

        await resend.emails.send({
          from: getSenderEmail(),
          to: adminEmail,
          subject: `New Order - ${order.liveMeId || 'No LiveMe ID'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">New Order Received</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                <p><strong>Customer:</strong> ${order.customer.email}</p>
                <p><strong>LiveMe ID:</strong> ${order.liveMeId || 'Not provided'}</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                <p><strong>Transaction ID:</strong> ${transId}</p>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                <h4 style="margin-top: 20px;">Items:</h4>
                <ul>
                  ${order.items.map(item => {
                    let itemText = `${item.quantity}x ${item.name}`;
                    if (item.amount) {
                      const itemCoins = item.quantity * item.amount;
                      itemText += ` (${itemCoins.toLocaleString()} coins)`;
                    }
                    return `<li>${itemText}</li>`;
                  }).join('')}
                </ul>
              </div>
              <p style="margin-top: 20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View in Admin Panel</a>
              </p>
            </div>
          `,
          text: `New order from ${order.customer.email} for $${order.amount}. LiveMe ID: ${order.liveMeId || 'Not provided'}. Transaction ID: ${transId}`
        });

        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            email: adminEmail,
            type: 'ADMIN_NOTIFICATION',
            subject: `New Order - ${order.liveMeId || 'No LiveMe ID'}`,
            success: true
          }
        });

        console.log('Admin email sent successfully');
      } catch (emailError) {
        console.error('Error sending admin email:', emailError);

        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            email: adminEmail,
            type: 'ADMIN_NOTIFICATION',
            subject: `New Order - ${order.liveMeId || 'No LiveMe ID'}`,
            success: false,
            error: emailError instanceof Error ? emailError.message : 'Unknown error'
          }
        });
      }

      // Redirect to success page
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/success?orderId=${order.orderId}&amount=${order.amount}`
      );
    } else {
      // Payment failed
      console.error('Payment failed for order:', order.orderId);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/?error=payment_failed`
      );
    }

  } catch (error: any) {
    console.error('Return handler error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=processing_failed`
    );
  }
}
