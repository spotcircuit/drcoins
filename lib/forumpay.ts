/**
 * ForumPay Payment Gateway API client (crypto payments).
 * API docs: https://dashboard.forumpay.com/pay/payInfo.api (sandbox: https://sandbox.dashboard.forumpay.com/pay/payInfo.api)
 * PHP client reference: https://github.com/forumpay/payment-gateway-php-client
 */

const FORUMPAY_BASE = process.env.FORUMPAY_API_BASE_URL || 'https://sandbox.api.forumpay.com/pay/v2';
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

/** Build application/x-www-form-urlencoded body; v2 API expects form params, not JSON */
function buildFormBody(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

/** ForumPay rejects reserved IPs (0.0.0.0, localhost, private). Use a public fallback when needed. */
function ensureNonReservedIp(ip: string | undefined): string {
  const raw = (ip || '').trim();
  if (!raw) return '8.8.8.8';
  if (raw === '0.0.0.0' || raw === '::' || raw === '::1') return '8.8.8.8';
  if (raw.startsWith('127.') || raw.startsWith('10.') || raw.startsWith('192.168.') || raw.startsWith('172.16.') || raw.startsWith('172.17.') || raw.startsWith('172.18.') || raw.startsWith('172.19.') || raw.startsWith('172.2') || raw.startsWith('172.30.') || raw.startsWith('172.31.')) return '8.8.8.8';
  return raw;
}

async function apiPost(action: string, body: Record<string, unknown>): Promise<any> {
  const url = `${FORUMPAY_BASE.replace(/\/$/, '')}/${action}`;
  const formBody = buildFormBody(body);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
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
  payerIpAddress?: string;
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
    payer_ip_address: ensureNonReservedIp(params.payerIpAddress),
    payer_email: params.payerEmail ?? '',
    payer_id: params.payerId ?? '',
    auto_accept_underpayment: 'false',
    auto_accept_underpayment_min: '0',
    auto_accept_overpayment: 'false',
    auto_accept_late_payment: 'false',
    sid: params.sid ?? '',
  };
  if (params.webhookUrl) body.webhook_url = params.webhookUrl;
  if (params.onSuccessRedirectUrl) body.on_success_redirect_url = params.onSuccessRedirectUrl;
  if (params.onFailureRedirectUrl) body.on_failure_redirect_url = params.onFailureRedirectUrl;
  const data = await apiPost('StartPayment/', body);
  return data;
}

/** CheckPayment API response (snake_case); use confirmed, cancelled, state, status to determine order status */
export type CheckPaymentResponse = {
  reference_no?: string;
  state?: string;
  status?: string;
  confirmed?: boolean;
  cancelled?: boolean;
  confirmed_time?: string;
  cancelled_time?: string;
  [k: string]: unknown;
};

/**
 * Check payment status (used from webhook when payload has no status).
 * Requires pos_id, currency, payment_id, address from webhook payload.
 */
export async function checkPayment(params: {
  posId: string;
  currency: string;
  paymentId: string;
  address: string;
}): Promise<CheckPaymentResponse> {
  const data = await apiGet('CheckPayment/', {
    pos_id: params.posId,
    currency: params.currency,
    payment_id: params.paymentId,
    address: params.address,
  });
  return data;
}

export function isForumPayConfigured(): boolean {
  return !!(FORUMPAY_USER && FORUMPAY_SECRET);
}

/**
 * Create Payment Link (Payment API).
 * Creates a new payment link and optionally sends it to the consumer by email.
 * Doc: https://sandbox.dashboard.forumpay.com/pay/payInfo.api#tag/Payment-API/operation/createPaymentLink
 * Request: application/x-www-form-urlencoded, BasicAuth.
 */
export type CreatePaymentLinkParams = {
  invoice_amount: string;
  invoice_currency: string;
  widget_type: string; // "0" | "1" | "2" | "3"
  item_name?: string;
  reference_no?: string;
  website_id?: string;
  webhook_url?: string;
  redirect_url_on_success?: string;
  redirect_url_on_failure?: string;
  locale?: string;
  secure_link?: boolean;
  payer_id?: string;
  payer_email?: string;
  filter_countries?: string;
  network_processing_fee_paid_by?: 'payer' | 'merchant';
  allow_multiple_payments?: boolean;
  email?: string; // optional; sending by email limited to 30/hour
};

export type CreatePaymentLinkResponse = {
  payment_link?: string;
  link?: string;
  url?: string;
  [k: string]: unknown;
};

const PAYMENT_API_BASE = process.env.FORUMPAY_PAYMENT_API_BASE_URL || FORUMPAY_BASE;

async function paymentApiPost(action: string, body: Record<string, unknown>): Promise<any> {
  const base = PAYMENT_API_BASE.replace(/\/$/, '');
  const url = `${base}/${action}`;
  const formBody = buildFormBody(body);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
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

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<CreatePaymentLinkResponse> {
  const body: Record<string, unknown> = {
    invoice_amount: params.invoice_amount,
    invoice_currency: params.invoice_currency,
    widget_type: params.widget_type,
  };
  if (params.item_name != null && params.item_name !== '') body.item_name = params.item_name;
  if (params.reference_no != null && params.reference_no !== '') body.reference_no = params.reference_no;
  if (params.website_id != null && params.website_id !== '') body.website_id = params.website_id;
  if (params.locale != null && params.locale !== '') body.locale = params.locale;
  if (params.payer_id != null && params.payer_id !== '') body.payer_id = params.payer_id;
  if (params.payer_email != null && params.payer_email !== '') body.payer_email = params.payer_email;
  if (params.filter_countries != null && params.filter_countries !== '') body.filter_countries = params.filter_countries;
  if (params.network_processing_fee_paid_by != null) body.network_processing_fee_paid_by = params.network_processing_fee_paid_by;
  if (params.allow_multiple_payments !== undefined) body.allow_multiple_payments = params.allow_multiple_payments ? 'true' : 'false';
  if (params.email != null && params.email !== '') body.email = params.email;

  if (params.secure_link === true) {
    body.secure_link = 'true';
    if (params.webhook_url != null && params.webhook_url !== '') body.webhook_url = params.webhook_url;
    if (params.redirect_url_on_success != null && params.redirect_url_on_success !== '') body.redirect_url_on_success = params.redirect_url_on_success;
    if (params.redirect_url_on_failure != null && params.redirect_url_on_failure !== '') body.redirect_url_on_failure = params.redirect_url_on_failure;
  }

  const data = await paymentApiPost('CreatePaymentLink/', body as Record<string, unknown>);
  return data;
}

/** Resolve payment URL from Create Payment Link response (field name may vary) */
export function getPaymentLinkFromResponse(data: CreatePaymentLinkResponse): string | null {
  return data.payment_link ?? data.link ?? data.url ?? null;
}
