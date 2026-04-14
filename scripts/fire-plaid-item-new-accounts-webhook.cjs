'use strict';

/**
 * Fires ONE Sandbox Item webhook: NEW_ACCOUNTS_AVAILABLE (Plaid onboarding checklist).
 * POST /sandbox/item/fire_webhook — sends ITEM webhook to the URL set on that Item's Link token.
 *
 * Requires a Sandbox access_token for an Item created through **Link with Account Select v2**
 * (e.g. your real Transfer UI checkout with a Link customization that uses Account Select — see Plaid Transfer UI docs).
 * Tokens from /sandbox/public_token/create will fail with SANDBOX_ACCOUNT_SELECT_V2_NOT_ENABLED.
 *
 * To capture a token after a real Sandbox Link: set in .env.local (dev only):
 *   PLAID_DEBUG_SAVE_SANDBOX_ACCESS_TOKEN_FILE=tmp/plaid-sandbox-access-token.txt
 *   PLAID_DEBUG_SKIP_ITEM_REMOVE_SANDBOX=true
 * then complete one bank checkout. Run this script with **no args** to read that file automatically.
 *
 * Usage (pick one):
 *   npm run plaid:fire-item-new-accounts
 *   npm run plaid:fire-item-new-accounts -- access-sandbox-xxxx-xxxx-...
 *   npm run plaid:fire-item-new-accounts -- @tmp/plaid-sandbox-access-token.txt
 * or PLAID_SANDBOX_ACCESS_TOKEN=access-sandbox-... in .env.local
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

function readTokenFirstLine(absPath) {
  if (!fs.existsSync(absPath)) return '';
  const line = fs.readFileSync(absPath, 'utf8').trim().split(/\r?\n/)[0];
  return (line || '').trim();
}

/** Plaid sandbox access tokens look like access-sandbox-<uuid-ish> */
function isPlaidSandboxAccessToken(t) {
  return typeof t === 'string' && /^access-sandbox-[0-9a-f-]{20,}$/i.test(t);
}

function resolveAccessToken() {
  let t = (process.argv[2] || '').trim();

  if (t.startsWith('@')) {
    const filePath = path.isAbsolute(t.slice(1)) ? t.slice(1) : path.join(root, t.slice(1));
    const fromFile = readTokenFirstLine(filePath);
    if (!isPlaidSandboxAccessToken(fromFile)) {
      console.error('No valid access-sandbox- token in file:', filePath);
      process.exit(1);
    }
    console.info('Using token from file:', filePath);
    return fromFile;
  }

  if (t && isPlaidSandboxAccessToken(t)) {
    return t;
  }

  const fromEnv = (process.env.PLAID_SANDBOX_ACCESS_TOKEN || '').trim();
  if (fromEnv && isPlaidSandboxAccessToken(fromEnv)) {
    return fromEnv;
  }

  const tryPaths = [];
  const envFile = process.env.PLAID_DEBUG_SAVE_SANDBOX_ACCESS_TOKEN_FILE?.trim();
  if (envFile) {
    tryPaths.push(path.isAbsolute(envFile) ? envFile : path.join(root, envFile));
  }
  tryPaths.push(path.join(root, 'tmp/plaid-sandbox-access-token.txt'));

  for (const abs of tryPaths) {
    const fromFile = readTokenFirstLine(abs);
    if (isPlaidSandboxAccessToken(fromFile)) {
      if (t && !isPlaidSandboxAccessToken(t)) {
        console.info('(Ignoring invalid CLI token; using file instead — paste real access-sandbox-… value, not a placeholder.)');
      }
      console.info('Using token from file:', abs);
      return fromFile;
    }
  }

  if (t) {
    return t;
  }
  return '';
}

if (!clientId || !secret) {
  console.error('Missing PLAID_CLIENT_ID or PLAID_SECRET in .env.local');
  process.exit(1);
}
if (env !== 'sandbox') {
  console.error('PLAID_ENV must be "sandbox" for this script (got: %s)', env);
  process.exit(1);
}

const accessToken = resolveAccessToken();

if (!isPlaidSandboxAccessToken(accessToken)) {
  console.error('Missing or invalid Sandbox access token.');
  console.error('Do not use the literal "PASTE_FROM_FILE" — paste the real token from tmp/plaid-sandbox-access-token.txt');
  console.error('');
  console.error('  npm run plaid:fire-item-new-accounts');
  console.error('  npm run plaid:fire-item-new-accounts -- access-sandbox-<uuid>');
  console.error('  npm run plaid:fire-item-new-accounts -- @tmp/plaid-sandbox-access-token.txt');
  console.error('  or PLAID_SANDBOX_ACCESS_TOKEN=access-sandbox-... in .env.local');
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

async function main() {
  console.info('Calling sandbox/item/fire_webhook (NEW_ACCOUNTS_AVAILABLE) …');
  const res = await plaid.sandboxItemFireWebhook({
    access_token: accessToken,
    webhook_type: 'ITEM',
    webhook_code: 'NEW_ACCOUNTS_AVAILABLE',
  });
  console.info('Plaid response:', res.data);
  if (res.data.webhook_fired) {
    console.info('Done. Check your server logs for POST /api/webhooks/plaid (ITEM webhook).');
  }
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});
