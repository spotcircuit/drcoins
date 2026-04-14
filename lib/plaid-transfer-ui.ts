import {
  ACHClass,
  CountryCode,
  Products,
  TransferIntentCreateMode,
  TransferIntentCreateNetwork,
} from 'plaid';
import { getPlaidClient, plaidClientUserIdFromEmail } from '@/lib/plaid';
import { logPlaid, logPlaidApiError, plaidRequestIdFromResponse } from '@/lib/plaid-log';

function countryIso2(country: string): string {
  const u = country.trim().toUpperCase();
  if (u === 'USA' || u === 'UNITED STATES' || u === 'US') return 'US';
  if (u.length === 2) return u;
  return 'US';
}

export type TransferUiSessionInput = {
  orderId: string;
  amount: number;
  customer: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
};

export type TransferUiSessionResult = {
  link_token: string;
  transfer_intent_id: string;
};

/**
 * Plaid Transfer UI: one-time ACH debit (WEB) originated by Plaid after the user completes Link.
 * Requires Transfer enabled in the Plaid Dashboard and a Link customization with one-account Account Select.
 */
export async function createTransferUiSession(input: TransferUiSessionInput): Promise<TransferUiSessionResult> {
  const plaid = getPlaidClient();
  const amountStr = input.amount.toFixed(2);
  const legalName =
    [input.customer.firstName, input.customer.lastName].filter(Boolean).join(' ').trim() ||
    input.customer.email;

  const funding = process.env.PLAID_TRANSFER_FUNDING_ACCOUNT_ID?.trim();
  const intentBody = {
    mode: TransferIntentCreateMode.Payment,
    network: TransferIntentCreateNetwork.Ach,
    amount: amountStr,
    description: 'DrCoins',
    ach_class: ACHClass.Web,
    user: {
      legal_name: legalName,
      phone_number: input.customer.phone || undefined,
      email_address: input.customer.email,
      address: {
        street: input.customer.address,
        city: input.customer.city,
        region: input.customer.state,
        postal_code: input.customer.zip,
        country: countryIso2(input.customer.country),
      },
    },
    metadata: { order_ref: input.orderId },
    iso_currency_code: 'USD',
    ...(funding ? { funding_account_id: funding } : {}),
  };

  let intentId: string;
  try {
    const intentRes = await plaid.transferIntentCreate(intentBody);
    intentId = intentRes.data.transfer_intent.id;
    logPlaid('transfer_intent_create:ok', {
      orderId: input.orderId,
      transfer_intent_id: intentId,
      request_id: plaidRequestIdFromResponse(intentRes) ?? intentRes.data.request_id,
    });
  } catch (e: unknown) {
    logPlaidApiError('transfer_intent_create:failed', e, { orderId: input.orderId });
    throw e;
  }

  const customization = process.env.PLAID_LINK_CUSTOMIZATION_NAME?.trim() || 'default';
  const appBase = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  /** Item/Link webhooks (e.g. onboarding /sandbox/item/fire_webhook); Transfer team webhooks are configured separately in Dashboard. */
  const itemWebhook = appBase ? `${appBase}/api/webhooks/plaid` : undefined;

  try {
    const linkRes = await plaid.linkTokenCreate({
      user: { client_user_id: plaidClientUserIdFromEmail(input.customer.email) },
      client_name: 'Dr. Coins',
      products: [Products.Transfer],
      country_codes: [CountryCode.Us],
      language: 'en',
      transfer: { intent_id: intentId },
      link_customization_name: customization,
      ...(itemWebhook ? { webhook: itemWebhook } : {}),
    });
    logPlaid('link_token_create_transfer_ui:ok', {
      orderId: input.orderId,
      transfer_intent_id: intentId,
      request_id: plaidRequestIdFromResponse(linkRes) ?? linkRes.data.request_id,
      expiration: linkRes.data.expiration,
      item_webhook: itemWebhook ?? '(not set — set NEXT_PUBLIC_APP_URL)',
    });
    return {
      link_token: linkRes.data.link_token,
      transfer_intent_id: intentId,
    };
  } catch (e: unknown) {
    logPlaidApiError('link_token_create_transfer_ui:failed', e, {
      orderId: input.orderId,
      transfer_intent_id: intentId,
    });
    throw e;
  }
}
