/**
 * Plaid observability only. Do not pass: access_token, public_token, link_token,
 * account/routing numbers, or other secrets.
 */

export function plaidRequestIdFromResponse(res: { headers?: Record<string, unknown> }): string | undefined {
  const h = res.headers ?? {};
  const a = h['plaid-request-id'];
  const b = h['Plaid-Request-Id'];
  if (typeof a === 'string') return a;
  if (typeof b === 'string') return b;
  return undefined;
}

export function logPlaid(stage: string, meta: Record<string, unknown> = {}) {
  console.info(`[plaid] ${stage}`, meta);
}

/** Log Plaid/axios-style API failures (response body is safe metadata from Plaid). */
export function logPlaidApiError(stage: string, err: unknown, meta: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = { ...meta };
  if (err && typeof err === 'object') {
    if ('response' in err) {
      const res = (err as { response?: { status?: number; data?: unknown; headers?: Record<string, unknown> } })
        .response;
      if (res?.status != null) out.httpStatus = res.status;
      if (res?.data != null) out.plaidErrorBody = res.data;
      const rid = res?.headers ? plaidRequestIdFromResponse({ headers: res.headers }) : undefined;
      if (rid) out.plaidRequestId = rid;
    }
    if ('message' in err && typeof (err as Error).message === 'string') {
      out.message = (err as Error).message;
    }
  }
  console.error(`[plaid] ${stage}`, out);
}
