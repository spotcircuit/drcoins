import { NextRequest, NextResponse } from 'next/server';
import { getRateForEmail } from '@/lib/pricing-rates';
import { prisma } from '@/lib/prisma';
import { getRate, startPayment, isForumPayConfigured } from '@/lib/forumpay';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

export async function POST(req: NextRequest) {
  if (!isForumPayConfigured()) {
    return NextResponse.json(
      { error: 'Crypto payment is not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { items, liveMeId, email, firstName, lastName, phone, address, city, state, zip, country, cryptoCurrency = 'BTC' } = body;

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

    // Get or create customer (same as main checkout)
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

    let appliedRate = 87;
    try {
      appliedRate = await getRateForEmail(email);
    } catch (err) {
      console.error('Failed to get rate for email, using default:', err);
    }

    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (item.price * (item.quantity || 1)), 0
    );
    const orderId = Date.now().toString();

    // Create order (PENDING) – will be COMPLETED by webhook
    const order = await prisma.order.create({
      data: {
        orderId,
        customerId: customer.id,
        amount: totalAmount,
        currency: 'USD',
        status: 'PENDING',
        paymentMethod: 'Crypto',
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
      include: { items: true }
    });

    const invoiceAmount = totalAmount.toFixed(2);
    const webhookUrl = `${APP_URL}/api/webhooks/forumpay`;
    const successUrl = `${APP_URL}/success?orderId=${order.orderId}`;
    const failureUrl = `${APP_URL}/checkout?error=crypto_failed`;

    // 1) Get rate (returns payment_id for this invoice)
    let rateData: { payment_id: string; [k: string]: unknown };
    try {
      rateData = await getRate({
        invoiceCurrency: 'USD',
        invoiceAmount,
        currency: cryptoCurrency,
      });
    } catch (err: any) {
      console.error('ForumPay getRate error:', err);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });
      return NextResponse.json(
        { error: err?.message || 'Failed to get crypto rate' },
        { status: 502 }
      );
    }

    const paymentId = rateData.payment_id;

    // 2) Start payment (get redirect URL)
    let startData: { access_url: string; address?: string; amount?: string; currency?: string; qr?: string; qr_img?: string; payment_id: string };
    try {
      startData = await startPayment({
        paymentId,
        invoiceCurrency: 'USD',
        invoiceAmount,
        currency: cryptoCurrency,
        referenceNo: order.orderId,
        payerEmail: email,
        payerId: liveMeId,
        webhookUrl,
        onSuccessRedirectUrl: successUrl,
        onFailureRedirectUrl: failureUrl,
      });
    } catch (err: any) {
      console.error('ForumPay startPayment error:', err);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FAILED' }
      });
      return NextResponse.json(
        { error: err?.message || 'Failed to start crypto payment' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      orderId: order.orderId,
      paymentUrl: startData.access_url,
      address: startData.address,
      amount: startData.amount,
      currency: startData.currency || cryptoCurrency,
      qr: startData.qr,
      qrImg: startData.qr_img,
    });
  } catch (error: any) {
    console.error('Checkout ForumPay error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
