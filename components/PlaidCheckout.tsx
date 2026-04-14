'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import type { PlaidLinkOnSuccessMetadata } from 'react-plaid-link';
import { CountryAutocomplete } from '@/components/CountryAutocomplete';

interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  amount?: number;
  type?: string;
}

interface PlaidCheckoutProps {
  items: CheckoutItem[];
  liveMeId: string;
  email: string;
  /** Second arg is set when ACH is submitted but not yet settled in Plaid (webhook will complete the order). */
  onSuccess?: (orderId: string, meta?: { bankTransferPendingSettlement?: boolean }) => void;
  onError?: (error: string) => void;
}

export default function PlaidCheckout({ items, liveMeId, email, onSuccess, onError }: PlaidCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const orderIdRef = useRef<string | null>(null);
  orderIdRef.current = orderId;

  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [bankStepReady, setBankStepReady] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  /** After OTP we auto-open Link once; if user closes Link, offer a manual reopen. */
  const [showManualPlaidOpen, setShowManualPlaidOpen] = useState(false);
  const autoOpenPlaidAfterOtpRef = useRef(false);

  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  const [achAuthorized, setAchAuthorized] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  const completePlaidPayment = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const oid = orderIdRef.current;
      if (!oid) return;

      setPayLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/checkout-plaid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: oid,
            publicToken,
            transferStatus: metadata.transfer_status,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Bank payment failed');
        onSuccess?.(data.orderId, {
          bankTransferPendingSettlement: data.bankTransferPendingSettlement === true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Something went wrong';
        setError(msg);
        onError?.(msg);
      } finally {
        setPayLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const handlePlaidExit = useCallback(() => {
    setShowManualPlaidOpen(true);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      void completePlaidPayment(publicToken, metadata);
    },
    onExit: handlePlaidExit,
  });

  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!linkToken || !ready || payLoading) return;
    if (!autoOpenPlaidAfterOtpRef.current) return;
    autoOpenPlaidAfterOtpRef.current = false;
    setShowManualPlaidOpen(false);
    openRef.current();
  }, [linkToken, ready, payLoading]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formFirstName.trim() || !formLastName.trim()) {
      setError('Please enter your first and last name');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (!billingAddress.trim() || !billingCity.trim() || !billingState.trim() || !billingZip.trim()) {
      setError('Please fill in your full billing address (required for ACH)');
      return;
    }
    if (!billingCountry.trim()) {
      setError('Please select your country');
      return;
    }
    if (!achAuthorized) {
      setError('Please confirm authorization to debit your bank account for this purchase');
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch('/api/checkout-plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createOnly: true,
          items,
          liveMeId,
          email,
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          phone: phone.trim(),
          address: billingAddress.trim(),
          city: billingCity.trim(),
          state: billingState.trim(),
          zip: billingZip.trim(),
          country: billingCountry.trim(),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      setOrderId(orderData.orderId);

      setOtpLoading(true);
      const otpRes = await fetch('/api/checkout/generate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId, email }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.error || 'Failed to send verification code');

      setShowOTPStep(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
      setOtpLoading(false);
    }
  };

  const handleVerifyAndPreparePlaid = async () => {
    if (!orderId) return;
    setError(null);
    setOtpLoading(true);
    try {
      const verifyRes = await fetch('/api/checkout/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, otp: otpCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid verification code');

      const tokenRes = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, orderId }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || 'Could not start bank connection');

      setLinkToken(tokenData.link_token);
      setBankStepReady(true);
      setShowManualPlaidOpen(false);
      autoOpenPlaidAfterOtpRef.current = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      onError?.(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <form onSubmit={handleSendOtp} className="space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/35">
        <span className="text-2xl shrink-0" aria-hidden>
          🏦
        </span>
        <div className="text-sm text-emerald-100/95 space-y-1">
          <p className="font-semibold text-white">Pay from your bank (ACH)</p>
          <p>
            Connect your account with Plaid Transfer: your one-time debit is originated by Plaid (ACH). Settlement can take
            1–3 business days; your order is fully confirmed after Plaid reports settlement (we email you again then).
          </p>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-md font-semibold text-white mb-3">Order summary</h4>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-300">
              <span>
                {item.name} ×{item.quantity || 1}
              </span>
              <span>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between text-lg font-semibold text-white">
            <span>Total (USD)</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!showOTPStep && (
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-white">Contact & billing</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="First name"
              value={formFirstName}
              onChange={(e) => setFormFirstName(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="Last name"
              value={formLastName}
              onChange={(e) => setFormLastName(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            placeholder="Street address"
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="City"
              value={billingCity}
              onChange={(e) => setBillingCity(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="State"
              value={billingState}
              onChange={(e) => setBillingState(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="text"
              placeholder="ZIP"
              value={billingZip}
              onChange={(e) => setBillingZip(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <CountryAutocomplete
              value={billingCountry}
              onChange={setBillingCountry}
              aria-label="Country"
              placeholder="Select country…"
              required
              inputClassName="w-full min-w-0 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={achAuthorized}
              onChange={(e) => setAchAuthorized(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-300 group-hover:text-gray-200">
              I authorize Dr. Coins to initiate a one-time ACH debit from my selected bank account for the total above via
              Plaid (internet-initiated / WEB). I confirm I am an authorized signer on the account.
            </span>
          </label>
        </div>
      )}

      {showOTPStep && !bankStepReady && (
        <div className="space-y-4 rounded-lg bg-gray-800 border border-gray-600 p-4">
          <h4 className="text-lg font-semibold text-white">Verification code</h4>
          <p className="text-sm text-gray-300">
            We sent a 6-digit code to <strong className="text-white">{email}</strong>. Enter it below to continue to your
            bank.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => void handleVerifyAndPreparePlaid()}
            disabled={otpLoading || loading || otpCode.length !== 6}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {otpLoading ? 'Verifying…' : 'Verify & connect bank'}
          </button>
        </div>
      )}

      {bankStepReady && linkToken && (
        <div className="space-y-4 rounded-lg bg-gray-800 border border-emerald-700/40 p-4">
          <h4 className="text-lg font-semibold text-white">Connect your bank</h4>
          <p className="text-sm text-gray-300">
            {showManualPlaidOpen
              ? 'You closed the bank window. Open it again when you’re ready to finish payment.'
              : 'Plaid should open automatically. If it doesn’t, tap the button below.'}
          </p>
          {payLoading && <p className="text-sm text-emerald-200/90">Confirming your Plaid transfer…</p>}
          <button
            type="button"
            onClick={() => {
              setShowManualPlaidOpen(false);
              open();
            }}
            disabled={!ready || payLoading}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {payLoading
              ? 'Confirming transfer…'
              : ready
                ? showManualPlaidOpen
                  ? 'Open bank connection again'
                  : 'Open bank connection'
                : 'Loading secure link…'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200" role="alert">
          {error}
        </div>
      )}

      {!showOTPStep && (
        <button
          type="submit"
          disabled={loading || otpLoading}
          className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading || otpLoading ? 'Sending verification code…' : 'Send verification code'}
        </button>
      )}
    </form>
  );
}
