import crypto from 'node:crypto';
import * as jose from 'jose';
import { getPlaidClient } from '@/lib/plaid';
import type { JWK as JoseJwk } from 'jose';

const jwkByKid = new Map<string, JoseJwk>();

/**
 * Verify Plaid-Verification JWT and raw body SHA-256 per
 * https://plaid.com/docs/api/webhooks/webhook-verification/
 */
export async function verifyPlaidWebhook(rawBody: string, plaidVerificationJwt: string): Promise<boolean> {
  let protectedHeader: jose.ProtectedHeaderParameters;
  try {
    protectedHeader = jose.decodeProtectedHeader(plaidVerificationJwt);
  } catch {
    return false;
  }

  if (protectedHeader.alg !== 'ES256' || typeof protectedHeader.kid !== 'string') {
    return false;
  }

  const { kid } = protectedHeader;
  let jwk = jwkByKid.get(kid);
  if (!jwk) {
    try {
      const res = await getPlaidClient().webhookVerificationKeyGet({ key_id: kid });
      jwk = res.data.key as JoseJwk;
      jwkByKid.set(kid, jwk);
    } catch {
      return false;
    }
  }

  let payload: jose.JWTPayload;
  try {
    const key = await jose.importJWK(jwk, 'ES256');
    const verified = await jose.jwtVerify(plaidVerificationJwt, key, { maxTokenAge: '5 min' });
    payload = verified.payload;
  } catch {
    jwkByKid.delete(kid);
    return false;
  }

  const claimed = payload.request_body_sha256;
  if (typeof claimed !== 'string') return false;

  const digest = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  if (digest.length !== claimed.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(claimed, 'utf8'));
}
