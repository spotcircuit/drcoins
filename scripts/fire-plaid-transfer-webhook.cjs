'use strict';

/**
 * Calls Plaid Sandbox POST /sandbox/transfer/fire_webhook so Plaid sends
 * TRANSFER_EVENTS_UPDATE to your app (same as Dashboard Transfer webhook).
 *
 * Usage: npm run plaid:fire-webhook
 * Requires .env.local: PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV=sandbox,
 * and NEXT_PUBLIC_APP_URL (base URL; script appends /api/webhooks/plaid).
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');
for (const name of ['.env.local', '.env']) {
  const p = path.join(root, name);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const clientId = process.env.PLAID_CLIENT_ID?.trim();
const secret = process.env.PLAID_SECRET?.trim();
const env = (process.env.PLAID_ENV || 'sandbox').toLowerCase();
const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

if (!clientId || !secret) {
  console.error('Missing PLAID_CLIENT_ID or PLAID_SECRET in .env.local');
  process.exit(1);
}
if (env !== 'sandbox') {
  console.error('PLAID_ENV must be "sandbox" for fire_webhook (got: %s)', env);
  process.exit(1);
}

const webhook = `${appUrl}/api/webhooks/plaid`;

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

async function main() {
  console.info('Calling sandbox/transfer/fire_webhook …');
  console.info('Webhook URL:', webhook);
  const res = await plaid.sandboxTransferFireWebhook({ webhook });
  console.info('Plaid response:', res.data);
  console.info('Done. Check your dev server logs for [plaid] webhook_transfer_sync (and Plaid Dashboard → Logs).');
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});
