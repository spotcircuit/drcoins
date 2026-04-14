'use strict';

/**
 * Creates a Sandbox Item via /sandbox/public_token/create + /item/public_token/exchange
 * and prints access_token once.
 *
 * Does NOT work for Plaid's NEW_ACCOUNTS_AVAILABLE + /sandbox/item/fire_webhook checklist
 * (Plaid returns SANDBOX_ACCOUNT_SELECT_V2_NOT_ENABLED — those Items must come from real Link).
 *
 * Usage: npm run plaid:sandbox-access-token
 *
 * Optional .env.local:
 *   PLAID_SANDBOX_INSTITUTION_ID=ins_...   (default tries common sandbox IDs)
 *   NEXT_PUBLIC_APP_URL — if set, attaches webhook to the Item (recommended)
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');
for (const name of ['.env.local', '.env']) {
  const p = path.join(root, name);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const { Configuration, PlaidApi, PlaidEnvironments, Products } = require('plaid');

const clientId = process.env.PLAID_CLIENT_ID?.trim();
const secret = process.env.PLAID_SECRET?.trim();
const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
const appBase = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
const webhook = appBase ? `${appBase}/api/webhooks/plaid` : undefined;
const institutionOverride = process.env.PLAID_SANDBOX_INSTITUTION_ID?.trim();

const DEFAULT_INSTITUTIONS = [
  'ins_109508', // First Platypus Bank (common sandbox)
  'ins_116241',
  'ins_128026',
];

if (!clientId || !secret) {
  console.error('Missing PLAID_CLIENT_ID or PLAID_SECRET');
  process.exit(1);
}
if (env !== 'sandbox') {
  console.error('PLAID_ENV must be sandbox');
  process.exit(1);
}

const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
      },
    },
  })
);

async function tryCreate(institution_id) {
  const res = await plaid.sandboxPublicTokenCreate({
    institution_id,
    initial_products: [Products.Transfer],
    options: {
      ...(webhook ? { webhook } : {}),
    },
  });
  const publicToken = res.data.public_token;
  const ex = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  return { access_token: ex.data.access_token, item_id: ex.data.item_id };
}

async function main() {
  const ids = institutionOverride ? [institutionOverride] : DEFAULT_INSTITUTIONS;
  let lastErr;
  for (const institution_id of ids) {
    try {
      console.info('Trying institution_id:', institution_id);
      const { access_token, item_id } = await tryCreate(institution_id);
      console.info('');
      console.info('item_id:', item_id);
      console.info('access_token (Sandbox — treat as secret, do not commit):');
      console.info(access_token);
      console.info('');
      console.info('Next (NEW_ACCOUNTS_AVAILABLE checklist):');
      console.info('  npm run plaid:fire-item-new-accounts -- ' + access_token);
      if (!webhook) {
        console.info('');
        console.info('Tip: set NEXT_PUBLIC_APP_URL so the Item has a webhook URL for /sandbox/item/fire_webhook.');
      }
      return;
    } catch (e) {
      lastErr = e;
      const body = e?.response?.data;
      console.warn('  failed:', body?.error_code || body?.error_message || e?.message);
    }
  }
  console.error('Could not create Sandbox Item with Transfer. Last error:', lastErr?.response?.data || lastErr);
  console.error('Set PLAID_SANDBOX_INSTITUTION_ID to an institution that supports Transfer in Sandbox.');
  process.exit(1);
}

main();
