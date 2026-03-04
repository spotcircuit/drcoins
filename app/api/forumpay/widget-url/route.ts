import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createCryptoOrderAndCustomer } from '@/lib/order-crypto';
import {
  createPaymentLink,
  getPaymentLinkFromResponse,
  isForumPayConfigured,
} from '@/lib/forumpay';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * POST /api/forumpay/widget-url
 * Option A: Body has orderId (OTP flow). Use existing order if PENDING, Crypto, and otpVerified; create payment link only.
 * Option B: Body has items, liveMeId, email. Create order, then create payment link.
 * Response: { orderId, widgetUrl }
 */
export async function POST(req: NextRequest) {
  if (!isForumPayConfigured()) {
    return NextResponse.json(
      { error: 'ForumPay is not configured (set FORUMPAY_API_USER and FORUMPAY_API_SECRET)' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { orderId: existingOrderId, items, liveMeId, email } = body;

    // --- OTP flow: use existing order (must be OTP-verified) ---
    if (existingOrderId) {
      const order = await prisma.order.findUnique({
        where: { orderId: String(existingOrderId) },
        include: { customer: true, items: true }
      });
      if (!order || order.status !== 'PENDING' || order.paymentMethod !== 'Crypto') {
        return NextResponse.json({ error: 'Order not found or invalid' }, { status: 400 });
      }
      if (!order.otpVerified) {
        return NextResponse.json(
          { error: 'Please verify your email with the code first' },
          { status: 400 }
        );
      }

      const invoiceAmount = Number(order.amount).toFixed(2);
      const itemName = order.items?.[0]?.name || 'DrCoins Order';
      const webhookUrl = `${APP_URL}/api/webhooks/forumpay`;
      const redirectSuccess = `${APP_URL}/success?orderId=${order.orderId}`;
      const redirectFailure = `${APP_URL}/checkout?error=crypto_failed`;

      const linkResponse = await createPaymentLink({
        invoice_amount: invoiceAmount,
        invoice_currency: 'USD',
        widget_type: '0',
        item_name: itemName,
        reference_no: order.orderId,
        webhook_url: webhookUrl,
        redirect_url_on_success: redirectSuccess,
        redirect_url_on_failure: redirectFailure,
        secure_link: true,
        locale: 'en-gb',
        payer_id: order.liveMeId ?? undefined,
        payer_email: order.customer?.email ?? undefined,
        allow_multiple_payments: false,
      });

      const widgetUrl = getPaymentLinkFromResponse(linkResponse);
      if (!widgetUrl) {
        console.error('ForumPay CreatePaymentLink did not return a payment link', linkResponse);
        return NextResponse.json(
          { error: 'Payment link could not be created' },
          { status: 502 }
        );
      }
      return NextResponse.json({ orderId: order.orderId, widgetUrl });
    }

    // --- New order flow: create order then payment link ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }
    if (!email || !liveMeId) {
      return NextResponse.json(
        { error: 'Email and LiveMe ID are required' },
        { status: 400 }
      );
    }

    const { order } = await createCryptoOrderAndCustomer(body);
    const invoiceAmount = Number(order.amount).toFixed(2);
    const itemName = order.items?.[0]?.name || 'DrCoins Order';
    const webhookUrl = `${APP_URL}/api/webhooks/forumpay`;
    const redirectSuccess = `${APP_URL}/success?orderId=${order.orderId}`;
    const redirectFailure = `${APP_URL}/checkout?error=crypto_failed`;

    const linkResponse = await createPaymentLink({
      invoice_amount: invoiceAmount,
      invoice_currency: 'USD',
      widget_type: '0', // Payment only
      item_name: itemName,
      reference_no: order.orderId,
      webhook_url: webhookUrl,
      redirect_url_on_success: redirectSuccess,
      redirect_url_on_failure: redirectFailure,
      secure_link: true,
      locale: 'en-gb',
      payer_id: liveMeId,
      payer_email: email,
      allow_multiple_payments: false,
    });

    const widgetUrl = getPaymentLinkFromResponse(linkResponse);
    if (!widgetUrl) {
      console.error('ForumPay CreatePaymentLink did not return a payment link', linkResponse);
      return NextResponse.json(
        { error: 'Payment link could not be created' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      orderId: order.orderId,
      widgetUrl,
    });
  } catch (error: any) {
    console.error('ForumPay widget-url error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
