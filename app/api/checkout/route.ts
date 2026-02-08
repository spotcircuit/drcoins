import { NextRequest, NextResponse } from 'next/server';
import { getHostedPaymentPageRequest, getHostedPaymentPage } from '@/lib/authorizenet';
import { getRateForEmail } from '@/lib/pricing-rates';
import { prisma } from '@/lib/prisma';

export async function GET() {
  return NextResponse.json({
    status: 'Checkout API is running',
    authNetConfigured: !!(process.env.AUTHORIZENET_API_LOGIN_ID && process.env.AUTHORIZENET_TRANSACTION_KEY),
    databaseConfigured: !!process.env.DATABASE_URL,
  });
}

export async function POST(req: NextRequest) {
  console.log('Checkout API called');

  try {
    const body = await req.json();
    const { items, liveMeId, email, firstName, lastName, phone, address, city, state, zip, country } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    if (!email || !liveMeId) {
      return NextResponse.json(
        { error: 'Email and LiveMe ID are required' },
        { status: 400 }
      );
    }

    // Get or create customer in database
    let customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() }
    });

    type CustomerWithAddress = typeof customer & { address?: string | null; city?: string | null; state?: string | null; zip?: string | null; country?: string | null };
    const existing = customer as CustomerWithAddress | null;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: email.toLowerCase(),
          firstName: firstName ?? null,
          lastName: lastName ?? null,
          phone: phone ?? null,
          liveMeId: liveMeId ?? null,
          ...(address != null || city != null || state != null || zip != null || country != null
            ? { address: address ?? null, city: city ?? null, state: state ?? null, zip: zip ?? null, country: country ?? null }
            : {}),
        } as Parameters<typeof prisma.customer.create>[0]['data'],
      });
    } else {
      // Update existing customer with new info when provided (user may have changed address/phone/name)
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: firstName ?? customer.firstName,
          lastName: lastName ?? customer.lastName,
          phone: phone ?? customer.phone,
          liveMeId: liveMeId ?? customer.liveMeId,
          address: address ?? existing?.address ?? undefined,
          city: city ?? existing?.city ?? undefined,
          state: state ?? existing?.state ?? undefined,
          zip: zip ?? existing?.zip ?? undefined,
          country: country ?? existing?.country ?? undefined,
        } as Parameters<typeof prisma.customer.update>[0]['data'],
      });
    }

    // Get applied rate from Vercel Blob
    let appliedRate = 87;
    try {
      appliedRate = await getRateForEmail(email);
    } catch (err) {
      console.error('Failed to get rate for email, using default:', err);
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (item.price * (item.quantity || 1)), 0
    );

    // Create order in database (PENDING status)
    const orderId = Date.now().toString();
    const order = await prisma.order.create({
      data: {
        orderId,
        customerId: customer.id,
        amount: totalAmount,
        currency: 'USD',
        status: 'PENDING',
        liveMeId,
        appliedRate,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            description: item.description || `Instant delivery to LiveMe ID: ${liveMeId}`,
            price: item.price,
            quantity: item.quantity || 1,
            amount: item.amount || null,
            type: item.type || 'coins'
          }))
        }
      },
      include: {
        items: true
      }
    });

    console.log('Order created in database:', order.orderId);

    // Create Authorize.Net hosted payment page
    const paymentRequest = getHostedPaymentPageRequest({
      orderId: order.orderId,
      amount: totalAmount,
      items: items.map((item: any) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1
      })),
      liveMeId,
      email,
      firstName,
      lastName
    });

    const { token, error } = await getHostedPaymentPage(paymentRequest);

    if (error) {
      // Update order status to FAILED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });

      return NextResponse.json(
        { error: `Payment page creation failed: ${error}` },
        { status: 500 }
      );
    }

    // Return token and payment page URL
    // Authorize.Net hosted payment page URLs:
    // Production: https://accept.authorize.net/payment/payment
    // Sandbox: https://test.authorize.net/payment/payment
    // 
    // IMPORTANT: Make sure AUTHORIZENET_ENV matches your API credentials
    // - If using sandbox/test credentials, set AUTHORIZENET_ENV=sandbox (or leave unset)
    // - If using production credentials, set AUTHORIZENET_ENV=production
    // 
    // If you get a 404 error, try switching the environment:
    // - If you have sandbox credentials, change AUTHORIZENET_ENV to 'sandbox' or remove it
    // - If you have production credentials, make sure AUTHORIZENET_ENV is set to 'production'
    // Determine environment - default to sandbox if not explicitly set to production
    const isProd = process.env.AUTHORIZENET_ENV === 'production';
    // Authorize.Net hosted payment page URLs
    // Note: If you get a 404, try the opposite environment URL
    const paymentPageUrl = isProd
      ? `https://accept.authorize.net/payment/payment`
      : `https://test.authorize.net/payment/payment`;

    console.log('Payment page created successfully');
    console.log('AUTHORIZENET_ENV:', process.env.AUTHORIZENET_ENV || 'not set (defaulting to sandbox)');
    console.log('Using environment:', isProd ? 'PRODUCTION' : 'SANDBOX');
    console.log('Payment page URL:', paymentPageUrl);
    console.log('⚠️  If you get a 404, verify your credentials match the environment above');

    // According to Authorize.Net documentation, the token must be sent via HTML POST
    // Return the base URL and token separately so frontend can create a POST form
    return NextResponse.json({
      token,
      paymentPageUrl, // Base URL without token
      orderId: order.orderId,
      environment: isProd ? 'production' : 'sandbox'
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
