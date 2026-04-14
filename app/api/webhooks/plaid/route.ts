import { NextRequest, NextResponse } from 'next/server';
import { getPlaidClient, isPlaidConfigured } from '@/lib/plaid';
import { logPlaid, logPlaidApiError } from '@/lib/plaid-log';
import { processPlaidTransferWebhook } from '@/lib/plaid-transfer-webhook';
import { verifyPlaidWebhook } from '@/lib/plaid-verify-webhook';

/**
 * Plaid webhooks — Transfer lifecycle (Dashboard → Transfer webhook URL).
 * Register: `{NEXT_PUBLIC_APP_URL}/api/webhooks/plaid`
 * @see https://plaid.com/docs/api/webhooks/#introduction-to-webhooks
 * @see https://plaid.com/docs/transfer/reconciling-transfers/
 */
export async function POST(req: NextRequest) {
  if (!isPlaidConfigured()) {
    return NextResponse.json({ error: 'Plaid is not configured' }, { status: 503 });
  }

  const rawBody = await req.text();

  const verificationJwt =
    req.headers.get('plaid-verification') ??
    req.headers.get('Plaid-Verification') ??
    req.headers.get('PLAID-VERIFICATION');

  if (verificationJwt) {
    const ok = await verifyPlaidWebhook(rawBody, verificationJwt);
    if (!ok) {
      logPlaid('webhook_reject', { reason: 'verification_failed' });
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
  } else if (process.env.PLAID_WEBHOOK_SKIP_VERIFY === 'true') {
    logPlaid('webhook_unverified_ok', { reason: 'PLAID_WEBHOOK_SKIP_VERIFY' });
  } else {
    logPlaid('webhook_reject', { reason: 'missing_plaid_verification' });
    return NextResponse.json({ error: 'Missing Plaid-Verification header' }, { status: 401 });
  }

  let body: { webhook_type?: string; webhook_code?: string };
  try {
    body = JSON.parse(rawBody) as { webhook_type?: string; webhook_code?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    if (body.webhook_type === 'TRANSFER' && body.webhook_code === 'TRANSFER_EVENTS_UPDATE') {
      await processPlaidTransferWebhook(getPlaidClient());
    } else {
      logPlaid('webhook_ack_unhandled', {
        webhook_type: body.webhook_type,
        webhook_code: body.webhook_code,
      });
    }
  } catch (e: unknown) {
    logPlaidApiError('webhook_handler_failed', e, {});
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
