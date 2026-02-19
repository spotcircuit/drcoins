/**
 * ForumPay Payment Gateway API client (crypto payments).
 * API docs: https://dashboard.forumpay.com/pay/payInfo.api (sandbox: https://sandbox.dashboard.forumpay.com/pay/payInfo.api)
 * PHP client reference: https://github.com/forumpay/payment-gateway-php-client
 */

const FORUMPAY_BASE = process.env.FORUMPAY_API_BASE_URL || 'https://sandbox.dashboard.forumpay.com/pay';
const FORUMPAY_USER = process.env.FORUMPAY_API_USER || '';
const FORUMPAY_SECRET = process.env.FORUMPAY_API_SECRET || '';
const POS_ID = process.env.FORUMPAY_POS_ID || 'web';

function getAuthHeader(): string {
  const encoded = Buffer.from(`${FORUMPAY_USER}:${FORUMPAY_SECRET}`).toString('base64');
  return `Basic ${encoded}`;
}

async function apiGet(action: string, params: Record<string, string | undefined>): Promise<any> {
  const url = new URL(`${FORUMPAY_BASE.replace(/\/$/, '')}/${action}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.err ?? data?.message ?? `ForumPay API error: ${res.status}`;
    throw new Error(errMsg);
  }
  if (data?.err) {
    throw new Error(data.err);
  }
  return data;
}

async function apiPost(action: string, body: Record<string, unknown>): Promise<any> {
  const url = `${FORUMPAY_BASE.replace(/\/$/, '')}/${action}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = data?.err ?? data?.message ?? `ForumPay API error: ${res.status}`;
    throw new Error(errMsg);
  }
  if (data?.err) {
    throw new Error(data.err);
  }
  return data;
}

/** ForumPay getRate response (snake_case as returned by API) */
export type GetRateResponse = {
  payment_id: string;
  rate?: string;
  amount?: string;
  amount_exchange?: string;
  network_processing_fee?: string;
  invoice_currency?: string;
  invoice_amount?: string;
  currency?: string;
  wait_time?: string;
  [k: string]: unknown;
};

/** Get rate for a single crypto currency; returns payment_id, rate, amount for use in startPayment and UI */
export async function getRate(params: {
  invoiceCurrency: string;
  invoiceAmount: string;
  currency: string;
  sid?: string;
}): Promise<GetRateResponse> {
  // ForumPay PHP client uses PascalCase action + trailing slash: uri/GetRate/
  const data = await apiGet('GetRate/', {
    pos_id: POS_ID,
    invoice_currency: params.invoiceCurrency,
    invoice_amount: params.invoiceAmount,
    currency: params.currency,
    accept_zero_confirmations: 'false',
    sid: params.sid ?? undefined,
  });
  return data;
}

/** Start a crypto payment. Returns access_url (redirect user), address, qr, etc. */
export async function startPayment(params: {
  paymentId: string;
  invoiceCurrency: string;
  invoiceAmount: string;
  currency: string;
  referenceNo: string;
  payerEmail?: string;
  payerId?: string;
  webhookUrl?: string;
  onSuccessRedirectUrl?: string;
  onFailureRedirectUrl?: string;
  sid?: string;
}): Promise<{
  access_url: string;
  address: string;
  payment_id: string;
  amount?: string;
  currency?: string;
  qr?: string;
  qr_img?: string;
  [k: string]: unknown;
}> {
  const body: Record<string, unknown> = {
    pos_id: POS_ID,
    invoice_currency: params.invoiceCurrency,
    invoice_amount: params.invoiceAmount,
    payment_id: params.paymentId,
    currency: params.currency,
    reference_no: params.referenceNo,
    accept_zero_confirmations: 'false',
    payer_ip_address: null,
    payer_email: params.payerEmail ?? null,
    payer_id: params.payerId ?? null,
    auto_accept_underpayment: 'false',
    auto_accept_underpayment_min: '0',
    auto_accept_overpayment: 'false',
    auto_accept_late_payment: 'false',
    sid: params.sid ?? null,
  };
  if (params.webhookUrl) body.webhook_url = params.webhookUrl;
  if (params.onSuccessRedirectUrl) body.on_success_redirect_url = params.onSuccessRedirectUrl;
  if (params.onFailureRedirectUrl) body.on_failure_redirect_url = params.onFailureRedirectUrl;

  // ForumPay PHP client uses PascalCase action + trailing slash: uri/StartPayment/
  const data = await apiPost('StartPayment/', body);
  return data;
}

export function isForumPayConfigured(): boolean {
  return !!(FORUMPAY_USER && FORUMPAY_SECRET);
}
