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
        console.log('Payment successful:', session.id);
        console.log('Customer email:', session.customer_email);
        console.log('Amount:', session.amount_total);
        console.log('LiveMe ID:', session.metadata?.liveMeId);
        console.log('Items purchased:', session.metadata?.items);
        
        // Send order confirmation email to customer
        if (session.customer_email) {
          const items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
          
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: session.customer_email,
              subject: 'Order Confirmation - DrCoins',
              html: `
                <h2>Thank you for your order!</h2>
                <p>Your payment of $${((session.amount_total || 0) / 100).toFixed(2)} has been received.</p>
                ${session.metadata?.liveMeId ? `<p><strong>LiveMe ID:</strong> ${session.metadata.liveMeId}</p>` : ''}
                <h3>Items:</h3>
                <ul>
                  ${items.map((item: any) => `<li>${item.quantity}x ${item.name} - $${item.price.toFixed(2)}</li>`).join('')}
                </ul>
                <p>Your coins will be delivered to your LiveMe account shortly.</p>
              `,
              text: `Order Confirmation - Thank you for your order of $${((session.amount_total || 0) / 100).toFixed(2)}`
            })
          });
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
                <p><strong>Customer:</strong> ${session.customer_email}</p>
                <p><strong>LiveMe ID:</strong> ${session.metadata?.liveMeId || 'Not provided'}</p>
                <p><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
                <p><strong>Items:</strong> ${session.metadata?.items}</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">View in Admin Panel</a></p>
              `,
              text: `New order from ${session.customer_email} for $${((session.amount_total || 0) / 100).toFixed(2)}`
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