import { NextRequest, NextResponse } from 'next/server';
import { getRate, isForumPayConfigured } from '@/lib/forumpay';

/**
 * GET /api/forumpay/rate?currency=BTC&invoiceAmount=50.00
 * Returns current rate and crypto amount for the selected currency (for checkout UI).
 */
export async function GET(request: NextRequest) {
  if (!isForumPayConfigured()) {
    return NextResponse.json(
      { error: 'ForumPay is not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const currency = searchParams.get('currency')?.toUpperCase() || '';
  const invoiceAmount = searchParams.get('invoiceAmount')?.trim() || '';

  if (!currency || !invoiceAmount) {
    return NextResponse.json(
      { error: 'Missing currency or invoiceAmount' },
      { status: 400 }
    );
  }

  const amount = parseFloat(invoiceAmount);
  if (Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json(
      { error: 'Invalid invoiceAmount' },
      { status: 400 }
    );
  }

  try {
    const data = await getRate({
      invoiceCurrency: 'USD',
      invoiceAmount: amount.toFixed(2),
      currency,
    });

    return NextResponse.json({
      currency: data.currency || currency,
      rate: data.rate ?? null,
      amount: data.amount ?? null,
      amountExchange: data.amount_exchange ?? null,
      networkProcessingFee: data.network_processing_fee ?? null,
      paymentId: data.payment_id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get rate';
    console.error('ForumPay getRate (rate API):', err);
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
