import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  return NextResponse.json({
    status: 'Checkout API is running',
    stripeConfigured: !!stripe,
    hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasPublishableKey: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}

export async function POST(req: NextRequest) {
  console.log('Checkout API called');
  
  // Check if Stripe is initialized
  if (!stripe) {
    console.error('Stripe not initialized - check STRIPE_SECRET_KEY');
    return NextResponse.json(
      { error: 'Payment system not configured' },
      { status: 500 }
    );
  }
  
  try {
    let items, liveMeId;
    try {
      const body = await req.json();
      items = body.items;
      liveMeId = body.liveMeId;
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: liveMeId 
              ? `Instant delivery to LiveMe ID: ${liveMeId}` 
              : (item.description || 'Instant delivery to your LiveMe account'),
            // Stripe requires absolute URLs for images, removing for now
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity || 1,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      metadata: {
        orderId: Date.now().toString(),
        liveMeId: liveMeId || '',
        items: JSON.stringify(items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity || 1 }))),
      },
      customer_email: undefined, // Will be collected by Stripe checkout
      billing_address_collection: 'auto',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}