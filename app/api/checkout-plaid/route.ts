import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { TransferIntentStatus } from 'plaid';
import { prisma } from '@/lib/prisma';
import { createPlaidOrderAndCustomer } from '@/lib/order-plaid';
import { getPlaidClient, isPlaidConfigured } from '@/lib/plaid';
import { logPlaid, logPlaidApiError, plaidRequestIdFromResponse } from '@/lib/plaid-log';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY);

function parsePlaidErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { error_message?: string; error_code?: string } } }).response?.data;
    if (data?.error_message) return data.error_message;
    if (data?.error_code) return data.error_code;
  }
  if (err instanceof Error) return err.message;
  return 'Payment failed';
}

export async function POST(req: NextRequest) {
  if (!isPlaidConfigured()) {
    return NextResponse.json({ error: 'Bank transfer (Plaid) is not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { createOnly, orderId: existingOrderId, publicToken, transferStatus } = body;

    if (createOnly === true) {
      const { items } = body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No items provided' }, { status: 400 });
      }
      if (!body.email || !body.liveMeId) {
        return NextResponse.json({ error: 'Email and LiveMe ID are required' }, { status: 400 });
      }
      const { order } = await createPlaidOrderAndCustomer(body);
      return NextResponse.json({ orderId: order.orderId });
    }

    if (!existingOrderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderId: String(existingOrderId) },
      include: { customer: true, items: true },
    });

    if (!order || order.paymentMethod !== 'Bank (ACH)') {
      return NextResponse.json({ error: 'Order not found or invalid' }, { status: 400 });
    }

    if (!order.otpVerified) {
      return NextResponse.json({ error: 'Please verify your email with the code first' }, { status: 403 });
    }

    if (order.status === 'COMPLETED' && order.plaidTransferId) {
      logPlaid('checkout_pay:idempotent', { orderId: order.orderId, plaidTransferId: order.plaidTransferId });
      return NextResponse.json({
        success: true,
        orderId: order.orderId,
        transactionId: order.plaidTransferId,
        amount: order.amount.toNumber(),
        status: order.status,
        bankTransferPendingSettlement: false,
        transferStatus: typeof transferStatus === 'string' ? transferStatus : undefined,
      });
    }

    /** Link success already recorded; ACH settlement happens via Plaid webhooks. */
    if (order.status === 'PROCESSING' && order.plaidTransferId) {
      logPlaid('checkout_pay:idempotent_processing', { orderId: order.orderId, plaidTransferId: order.plaidTransferId });
      return NextResponse.json({
        success: true,
        orderId: order.orderId,
        transactionId: order.plaidTransferId,
        amount: order.amount.toNumber(),
        status: order.status,
        bankTransferPendingSettlement: true,
        transferStatus: typeof transferStatus === 'string' ? transferStatus : undefined,
      });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Order not found or invalid' }, { status: 400 });
    }

    if (!order.plaidTransferIntentId) {
      return NextResponse.json(
        { error: 'Bank session expired. Go back and verify your code again to restart checkout.' },
        { status: 400 }
      );
    }

    const customer = order.customer;
    const plaid = getPlaidClient();
    let accessTokenForCleanup: string | null = null;
    const plaidEnv = (process.env.PLAID_ENV || '').toLowerCase();
    const isPlaidSandbox = plaidEnv === 'sandbox';
    const sandboxDebugSkipItemRemove =
      isPlaidSandbox && process.env.PLAID_DEBUG_SKIP_ITEM_REMOVE_SANDBOX === 'true';
    const sandboxDebugTokenFile = isPlaidSandbox
      ? process.env.PLAID_DEBUG_SAVE_SANDBOX_ACCESS_TOKEN_FILE?.trim()
      : undefined;

    try {
      logPlaid('checkout_pay:start', {
        orderId: order.orderId,
        transfer_intent_id: order.plaidTransferIntentId,
        link_transfer_status: typeof transferStatus === 'string' ? transferStatus : undefined,
      });

      const intentRes = await plaid.transferIntentGet({
        transfer_intent_id: order.plaidTransferIntentId,
      });
      const intent = intentRes.data.transfer_intent;
      logPlaid('transfer_intent_get:ok', {
        orderId: order.orderId,
        status: intent.status,
        transfer_id: intent.transfer_id,
        request_id: plaidRequestIdFromResponse(intentRes) ?? intentRes.data.request_id,
      });

      const metaRef = intent.metadata?.order_ref;
      if (metaRef !== order.orderId) {
        logPlaid('transfer_intent_get:metadata_mismatch', { orderId: order.orderId, metaRef });
        return NextResponse.json({ error: 'Payment session does not match this order.' }, { status: 400 });
      }

      const intentAmount = Number.parseFloat(intent.amount);
      const orderAmount = order.amount.toNumber();
      if (!Number.isFinite(intentAmount) || Math.abs(intentAmount - orderAmount) > 0.009) {
        return NextResponse.json({ error: 'Transfer amount does not match order total.' }, { status: 400 });
      }

      if (intent.status === TransferIntentStatus.Failed) {
        const fr = intent.failure_reason;
        const detail = fr?.error_message || fr?.error_code || 'Transfer could not be completed.';
        logPlaid('transfer_intent_get:failed', {
          orderId: order.orderId,
          failure_reason: fr,
        });
        await prisma.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
        return NextResponse.json({ error: detail }, { status: 400 });
      }

      if (intent.status === TransferIntentStatus.Pending || !intent.transfer_id) {
        return NextResponse.json(
          {
            error:
              'Your transfer is still processing in Plaid. Wait a few seconds and try confirming again, or finish any steps shown in the bank window.',
          },
          { status: 409 }
        );
      }

      if (intent.status !== TransferIntentStatus.Succeeded) {
        return NextResponse.json({ error: 'Unable to confirm bank payment. Please try again.' }, { status: 400 });
      }

      const transferId = intent.transfer_id;

      if (typeof publicToken === 'string' && publicToken.length > 0) {
        try {
          const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
          const accessToken = exchange.data.access_token;
          if (accessToken) {
            accessTokenForCleanup = accessToken;
            if (sandboxDebugTokenFile) {
              const abs = path.isAbsolute(sandboxDebugTokenFile)
                ? sandboxDebugTokenFile
                : path.join(process.cwd(), sandboxDebugTokenFile);
              try {
                await mkdir(path.dirname(abs), { recursive: true });
                await writeFile(abs, `${accessToken}\n`, 'utf8');
                logPlaid('debug_sandbox_access_token_file', { path: abs, orderId: order.orderId });
              } catch (fileErr: unknown) {
                logPlaidApiError('debug_sandbox_access_token_file_failed', fileErr, { orderId: order.orderId });
              }
            }
            if (sandboxDebugSkipItemRemove) {
              logPlaid('debug_skip_item_remove_sandbox', { orderId: order.orderId });
            } else {
              void plaid
                .itemRemove({ access_token: accessToken })
                .then((rm) => {
                  logPlaid('item_remove:ok', {
                    orderId: order.orderId,
                    request_id: plaidRequestIdFromResponse(rm) ?? rm.data?.request_id,
                  });
                })
                .catch((e: unknown) => {
                  logPlaidApiError('item_remove:failed', e, { orderId: order.orderId });
                });
            }
            accessTokenForCleanup = null;
          }
        } catch (e: unknown) {
          logPlaidApiError('item_public_token_exchange:after_transfer', e, { orderId: order.orderId });
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PROCESSING',
          plaidTransferId: transferId,
          paymentMethod: 'Bank (ACH)',
        },
        include: { items: true },
      });

      const finalOrderResult = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!finalOrderResult) {
        throw new Error('Order not found after payment processing');
      }

      const finalOrder = finalOrderResult;

      if (customer.email) {
        try {
          const totalCoins = finalOrder.items.reduce(
            (sum, item) => sum + (item.amount ? item.quantity * item.amount : 0),
            0
          );

          await resend.emails.send({
            from: getSenderEmail(),
            to: customer.email,
            bcc: 'drcoins73@gmail.com',
            subject: 'Bank transfer submitted - Dr. Coins',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #7c3aed;">We received your bank transfer</h2>
                  <p>Your payment of <strong>$${finalOrder.amount}</strong> has been <strong>submitted</strong> via ACH (Plaid). We will email you again when the transfer <strong>settles</strong> and your order is fully confirmed.</p>
                  ${finalOrder.liveMeId ? `<p><strong>LiveMe ID:</strong> ${finalOrder.liveMeId}</p>` : ''}
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin-top: 0;">Items:</h3>
                    <ul>
                      ${finalOrder.items
                        .map((item) => {
                          let itemText = `${item.quantity}x ${item.name} - $${item.price}`;
                          if (item.amount) {
                            const itemCoins = item.quantity * item.amount;
                            itemText += ` (${itemCoins.toLocaleString()} coins)`;
                          }
                          return `<li>${itemText}</li>`;
                        })
                        .join('')}
                    </ul>
                    ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                  </div>
                  <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>What's next?</strong></p>
                    <p style="margin: 10px 0 0 0;">ACH can take 1–3 business days to settle. Your order moves to confirmed when we receive the settlement webhook from Plaid.</p>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">- The Dr. Coins Team</p>
                </div>
              `,
            text: `Bank transfer submitted - $${finalOrder.amount}${totalCoins > 0 ? ` (${totalCoins.toLocaleString()} coins)` : ''}. You will receive another email when it settles.`,
          });

          await prisma.emailLog.create({
            data: {
              orderId: finalOrder.id,
              email: customer.email,
              type: 'PAYMENT_SUCCESS',
              subject: 'Bank transfer submitted - Dr. Coins',
              success: true,
            },
          });
        } catch (emailError) {
          console.error('Plaid checkout customer email:', emailError);
        }
      }

      logPlaid('checkout_pay:transfer_submitted', {
        orderId: updatedOrder.orderId,
        plaidTransferId: transferId,
      });

      return NextResponse.json({
        success: true,
        orderId: updatedOrder.orderId,
        transactionId: transferId,
        amount: orderAmount,
        status: updatedOrder.status,
        bankTransferPendingSettlement: true,
      });
    } catch (paymentError: unknown) {
      logPlaidApiError('checkout_pay:failed', paymentError, { orderId: order.orderId });
      console.error('Plaid Transfer checkout error:', paymentError);
      if (accessTokenForCleanup) {
        getPlaidClient()
          .itemRemove({ access_token: accessTokenForCleanup })
          .catch(() => {});
      }
      const msg = parsePlaidErrorMessage(paymentError);
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('checkout-plaid error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
