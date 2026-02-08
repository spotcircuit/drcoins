import { NextRequest, NextResponse } from 'next/server';
import { createTransactionRequest } from '@/lib/acceptjs';
import { getRateForEmail } from '@/lib/pricing-rates';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const { orderId, items, liveMeId, email, firstName, lastName, opaqueData, billingAddress } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!opaqueData || !opaqueData.dataDescriptor || !opaqueData.dataValue) {
      return NextResponse.json(
        { error: 'Payment data is required' },
        { status: 400 }
      );
    }

    // Find order by orderId
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: { customer: true, items: true }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check OTP verification
    if (!(order as any).otpVerified) {
      return NextResponse.json(
        { error: 'Order not verified. Please complete OTP verification first.' },
        { status: 403 }
      );
    }

    // Use customer from order
    const customer = order.customer;

    // Calculate total amount from order
    const totalAmount = order.amount.toNumber();

    // Process payment with Accept.js opaque data
    try {
      const transactionResult = await createTransactionRequest({
        amount: totalAmount,
        orderId: order.orderId,
        items: order.items.map((item) => ({
          name: item.name,
          price: item.price.toNumber(),
          quantity: item.quantity
        })),
        liveMeId: order.liveMeId,
        email: customer.email,
        firstName: customer.firstName || undefined,
        lastName: customer.lastName || undefined,
        opaqueData,
        billingAddress
      });

      if (transactionResult.responseCode === '1') {
        // Payment successful - Update order status to COMPLETED
        // First, verify order items exist before updating
        const orderBeforeUpdate = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true }
        });
        
        // If items are missing, create them BEFORE updating the order status
        if (!orderBeforeUpdate?.items || orderBeforeUpdate.items.length === 0) {
          await prisma.orderItem.createMany({
            data: items.map((item: any) => ({
              orderId: order.id,
              name: item.name,
              description: item.description || `Instant delivery to LiveMe ID: ${liveMeId}`,
              price: item.price,
              quantity: item.quantity || 1,
              amount: item.amount || null,
              type: item.type || 'coins'
            }))
          });
        }
        
        // Now update the order status to COMPLETED
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED' as any,
            authNetTransactionId: transactionResult.transactionId,
            authNetResponseCode: transactionResult.responseCode,
            authNetAuthCode: transactionResult.authCode || null,
            paymentMethod: 'Card'
          },
          include: {
            items: true
          }
        });

        // Update customer last order date
        await prisma.customer.update({
          where: { id: customer.id },
          data: { lastOrderDate: new Date() }
        });

        // Refresh order to get latest items (ensure we have the most up-to-date data)
        const finalOrderResult = await prisma.order.findUnique({
          where: { id: order.id },
          include: { items: true }
        });

        if (!finalOrderResult) {
          throw new Error('Order not found after payment processing');
        }

        // TypeScript now knows finalOrderResult is non-null after the check
        // Using non-null assertion to satisfy TypeScript's strict null checks
        const finalOrder: NonNullable<typeof finalOrderResult> = finalOrderResult;

        // Send customer email
        if (customer.email) {
          try {
            const totalCoins = finalOrder.items.reduce((sum, item) =>
              sum + (item.amount ? item.quantity * item.amount : 0), 0
            );

            await resend.emails.send({
              from: getSenderEmail(),
              to: customer.email,
              bcc: 'drcoins73@gmail.com',
              subject: 'Payment Successful - Dr. Coins',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #7c3aed;">Thank you for your purchase!</h2>
                  <p>Your payment of <strong>$${finalOrder.amount}</strong> has been successfully processed.</p>
                  ${finalOrder.liveMeId ? `<p><strong>LiveMe ID:</strong> ${finalOrder.liveMeId}</p>` : ''}
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin-top: 0;">Items Purchased:</h3>
                    <ul>
                      ${finalOrder.items.map(item => {
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

            await prisma.emailLog.create({
              data: {
                orderId: finalOrder.id,
                email: customer.email,
                type: 'PAYMENT_SUCCESS',
                subject: 'Payment Successful - Dr. Coins',
                success: true
              }
            });
          } catch (emailError) {
            console.error('Error sending customer email:', emailError);
            await prisma.emailLog.create({
              data: {
                orderId: finalOrder.id,
                email: customer.email,
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
          const totalCoins = finalOrder.items.reduce((sum, item) =>
            sum + (item.amount ? item.quantity * item.amount : 0), 0
          );

          await resend.emails.send({
            from: getSenderEmail(),
            to: adminEmail,
            subject: `New Order - ${finalOrder.liveMeId || 'No LiveMe ID'}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">New Order Received</h2>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px;">
                  <p><strong>Customer:</strong> ${customer.email}</p>
                  <p><strong>LiveMe ID:</strong> ${finalOrder.liveMeId || 'Not provided'}</p>
                  <p><strong>Amount:</strong> $${finalOrder.amount}</p>
                  <p><strong>Transaction ID:</strong> ${transactionResult.transactionId}</p>
                  <p><strong>Order ID:</strong> ${finalOrder.orderId}</p>
                  <p><strong>Status:</strong> ${finalOrder.status}</p>
                  ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                  <h4 style="margin-top: 20px;">Items:</h4>
                  <ul>
                    ${finalOrder.items.map(item => {
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
            text: `New order from ${customer.email} for $${finalOrder.amount}. LiveMe ID: ${finalOrder.liveMeId || 'Not provided'}. Transaction ID: ${transactionResult.transactionId}`
          });

          await prisma.emailLog.create({
            data: {
              orderId: finalOrder.id,
              email: adminEmail,
              type: 'ADMIN_NOTIFICATION',
              subject: `New Order - ${finalOrder.liveMeId || 'No LiveMe ID'}`,
              success: true
            }
          });
        } catch (emailError) {
          console.error('Error sending admin email:', emailError);
          await prisma.emailLog.create({
            data: {
              orderId: finalOrder.id,
              email: adminEmail,
              type: 'ADMIN_NOTIFICATION',
              subject: `New Order - ${finalOrder.liveMeId || 'No LiveMe ID'}`,
              success: false,
              error: emailError instanceof Error ? emailError.message : 'Unknown error'
            }
          });
        }

        return NextResponse.json({
          success: true,
          orderId: finalOrder.orderId,
          transactionId: transactionResult.transactionId,
          amount: totalAmount,
          status: finalOrder.status
        });

      } else {
        // Payment failed - Update order status to FAILED
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            authNetTransactionId: transactionResult.transactionId,
            authNetResponseCode: transactionResult.responseCode,
            paymentMethod: 'Card'
          }
        });

        return NextResponse.json(
          { error: 'Payment was declined. Please try a different payment method.' },
          { status: 400 }
        );
      }

    } catch (paymentError: any) {
      console.error('Payment processing error:', paymentError);
      
      // Update order status to FAILED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });

      return NextResponse.json(
        { error: paymentError.error || paymentError.message || 'Payment processing failed' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

