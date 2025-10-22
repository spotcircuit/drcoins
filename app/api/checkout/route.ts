import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { checkoutConfig, getBillingAddressConfig } from '@/lib/checkout-config';
import { getRateForEmail } from '@/lib/pricing-rates';

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
    let items, liveMeId, email, firstName, lastName, phone;
    try {
      const body = await req.json();
      items = body.items;
      liveMeId = body.liveMeId;
      email = body.email;
      firstName = body.firstName;
      lastName = body.lastName;
      phone = body.phone;
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

    // Create or update customer in Stripe
    let customer;
    if (email) {
      // Check if customer exists
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        // Update existing customer
        customer = await stripe.customers.update(existingCustomers.data[0].id, {
          name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
          phone: phone || undefined,
          metadata: {
            firstName: firstName || '',
            lastName: lastName || '',
            liveMeId: liveMeId || '',
            lastOrderDate: new Date().toISOString()
          }
        });
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: email,
          name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
          phone: phone || undefined,
          metadata: {
            firstName: firstName || '',
            lastName: lastName || '',
            liveMeId: liveMeId || '',
            password: '', // Will be set when they create account
            createdDate: new Date().toISOString()
          }
        });
      }
    }

    // Get the applied rate for this customer
    let appliedRate = 87; // default rate
    try {
      appliedRate = await getRateForEmail(email);
    } catch (err) {
      console.error('Failed to get rate for email, using default:', err);
    }

    // Build session configuration
    const sessionConfig: any = {
      payment_method_types: checkoutConfig.paymentMethods,
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: liveMeId
              ? `Instant delivery to LiveMe ID: ${liveMeId}`
              : (item.description || 'Instant delivery to your LiveMe account'),
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
        liveMeId: liveMeId || 'Not provided',
        appliedRate: appliedRate.toString(),
        items: JSON.stringify(items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity || 1,
          description: liveMeId
            ? `Instant delivery to LiveMe ID: ${liveMeId}`
            : 'Instant delivery to your LiveMe account'
        }))),
      },
      ...(customer?.id ? { customer: customer.id } : { customer_email: email, customer_creation: 'always' }),
      billing_address_collection: getBillingAddressConfig(),
      phone_number_collection: {
        enabled: checkoutConfig.collectPhoneNumber,
      },
    };

    // Add payment method configuration if specified
    if (checkoutConfig.paymentMethodConfigurationId) {
      sessionConfig.payment_method_configuration = checkoutConfig.paymentMethodConfigurationId;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}