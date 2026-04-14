'use strict';

/**
 * Calls Plaid Sandbox POST /accounts/get (Plaid Dashboard "Test Item endpoint" checklist).
 *
 * Token resolution (same as plaid:fire-item-new-accounts):
 *   npm run plaid:accounts-get
 *   npm run plaid:accounts-get -- access-sandbox-...
 *   npm run plaid:accounts-get -- @tmp/plaid-sandbox-access-token.txt
 *   PLAID_SANDBOX_ACCESS_TOKEN in .env.local
 *
 * @see https://plaid.com/docs/api/accounts/#accountsget
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
        console.info('(Ignoring invalid CLI token; using file instead.)');
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
  console.error('Missing or invalid Sandbox access_token.');
  console.error('  npm run plaid:accounts-get');
  console.error('  npm run plaid:accounts-get -- access-sandbox-...');
  console.error('  npm run plaid:accounts-get -- @tmp/plaid-sandbox-access-token.txt');
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
  console.info('Calling /accounts/get …');
  const res = await plaid.accountsGet({ access_token: accessToken });
  const { accounts, item } = res.data;
  console.info('request_id:', res.data.request_id);
  console.info('item_id:', item?.item_id);
  console.info('accounts:', accounts?.length ?? 0);
  for (const a of accounts || []) {
    console.info(
      '  -',
      a.name || '(no name)',
      '|',
      a.type,
      a.subtype || '',
      '|',
      'mask:',
      a.mask || '—',
      '|',
      'id:',
      a.account_id
    );
  }
  console.info('OK — Plaid Dashboard "Test Item endpoint" should register this call in Sandbox.');
}

main().catch((err) => {
  console.error(err?.response?.data || err);
  process.exit(1);
});
