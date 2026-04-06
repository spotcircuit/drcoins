import crypto from 'crypto';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

export function isPlaidConfigured(): boolean {
  return !!(
    process.env.PLAID_CLIENT_ID?.trim() &&
    process.env.PLAID_SECRET?.trim() &&
    process.env.PLAID_ENV?.trim()
  );
}

function plaidBasePath(): string {
  const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
  if (env === 'production') return PlaidEnvironments.production;
  if (env === 'development') return PlaidEnvironments.development;
  return PlaidEnvironments.sandbox;
}

let client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (!isPlaidConfigured()) {
    throw new Error('Plaid is not configured');
  }
  if (!client) {
    const configuration = new Configuration({
      basePath: plaidBasePath(),
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
          'PLAID-SECRET': process.env.PLAID_SECRET!,
        },
      },
    });
    client = new PlaidApi(configuration);
  }
  return client;
}

/** Stable, non-PII id for Plaid Link `client_user_id` (max 256 chars). */
export function plaidClientUserIdFromEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}
