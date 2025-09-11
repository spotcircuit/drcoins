import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.text();
  } catch (e) {
    return NextResponse.json(
      { error: 'Failed to read request body' },
      { status: 400 }
    );
  }
  
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No stripe signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        console.log('Payment successful:', session.id);
        console.log('Customer email:', customerEmail);
        console.log('Amount:', session.amount_total);
        console.log('LiveMe ID:', session.metadata?.liveMeId);
        console.log('Items purchased:', session.metadata?.items);

        // Send order confirmation email to customer
        if (customerEmail) {
          const items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];

          try {
            console.log('Attempting to send payment success email to:', customerEmail);
            console.log('Using APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

            const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: customerEmail,
                subject: 'Payment Successful - Dr. Coins',
                html: `
                  <h2>Thank you for your purchase!</h2>
                  <p>Your payment of $${((session.amount_total || 0) / 100).toFixed(2)} has been successfully processed.</p>
                  ${session.metadata?.liveMeId ? `<p><strong>LiveMe ID:</strong> ${session.metadata.liveMeId}</p>` : ''}
                  <h3>Items Purchased:</h3>
                  <ul>
                    ${items.map((item: any) => `<li>${item.quantity}x ${item.name} - $${item.price.toFixed(2)}</li>`).join('')}
                  </ul>
                  <p><strong>What's next?</strong></p>
                  <p>Your order is being processed and your coins will be delivered to your LiveMe account shortly. You will receive another email notification once your order has been successfully fulfilled.</p>
                  <p>If you have any questions, please don't hesitate to contact our support team.</p>
                `,
                text: `Payment Successful - Thank you for your purchase of $${((session.amount_total || 0) / 100).toFixed(2)}. Your order is being processed and you will receive another email once it has been fulfilled.`
              })
            });

            const emailResult = await emailResponse.json();

            if (!emailResponse.ok) {
              console.error('Failed to send payment success email:', emailResult);
            } else {
              console.log('Payment success email sent successfully:', emailResult);
            }
          } catch (error) {
            console.error('Error sending payment success email:', error);
          }
        }

        // Notify admin of new order
        if (process.env.ADMIN_EMAIL) {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: process.env.ADMIN_EMAIL,
              subject: `New Order - ${session.metadata?.liveMeId || 'No LiveMe ID'}`,
              html: `
                <h2>New Order Received</h2>
                <p><strong>Customer:</strong> ${customerEmail}</p>
                <p><strong>LiveMe ID:</strong> ${session.metadata?.liveMeId || 'Not provided'}</p>
                <p><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
                <p><strong>Items:</strong> ${session.metadata?.items}</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">View in Admin Panel</a></p>
              `,
              text: `New order from ${customerEmail} for $${((session.amount_total || 0) / 100).toFixed(2)}`
            })
          });
        }
        
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('PaymentIntent succeeded:', paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}