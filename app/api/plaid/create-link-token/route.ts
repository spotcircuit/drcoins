import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isPlaidConfigured } from '@/lib/plaid';
import { createTransferUiSession } from '@/lib/plaid-transfer-ui';
import { logPlaid, logPlaidApiError } from '@/lib/plaid-log';

export async function POST(req: NextRequest) {
  if (!isPlaidConfigured()) {
    return NextResponse.json({ error: 'Bank transfer (Plaid) is not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    if (!email || !orderId) {
      logPlaid('link_token_create:reject', { reason: !email ? 'missing_email' : 'missing_orderId' });
      return NextResponse.json({ error: 'Email and orderId are required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: { customer: true },
    });

    if (!order || order.status !== 'PENDING' || order.paymentMethod !== 'Bank (ACH)') {
      return NextResponse.json({ error: 'Order not found or invalid' }, { status: 400 });
    }
    if (!order.otpVerified) {
      return NextResponse.json({ error: 'Verify your email before connecting your bank' }, { status: 403 });
    }
    if (order.customer.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Order does not match this email' }, { status: 403 });
    }

    const c = order.customer;
    if (!c.address?.trim() || !c.city?.trim() || !c.state?.trim() || !c.zip?.trim()) {
      return NextResponse.json(
        { error: 'Complete billing address is required before opening Plaid Transfer.' },
        { status: 400 }
      );
    }

    const { link_token, transfer_intent_id } = await createTransferUiSession({
      orderId: order.orderId,
      amount: order.amount.toNumber(),
      customer: {
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        zip: c.zip,
        country: c.country || 'USA',
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { plaidTransferIntentId: transfer_intent_id },
    });

    return NextResponse.json({ link_token, transfer_intent_id });
  } catch (err: unknown) {
    logPlaidApiError('link_token_create:failed', err);
    const message = err instanceof Error ? err.message : 'Failed to create bank link session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
