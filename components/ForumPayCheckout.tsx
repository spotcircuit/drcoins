'use client';

import { useState } from 'react';

interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  amount?: number;
  type?: string;
}

interface ForumPayCheckoutProps {
  items: CheckoutItem[];
  liveMeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
}

export default function ForumPayCheckout({
  items,
  liveMeId,
  email,
  onError
}: ForumPayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const totalAmount = items.reduce((sum, item) =>
    sum + (item.price * (item.quantity || 1)), 0
  );

  // Step 1: Create order and send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const orderRes = await fetch('/api/checkout-forumpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          liveMeId,
          email,
          createOnly: true,
        })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      setOrderId(orderData.orderId);

      setOtpLoading(true);
      const otpRes = await fetch('/api/checkout/generate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderData.orderId, email })
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.error || 'Failed to send verification code');

      setShowOTPStep(true);
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP and get payment link, then redirect
  const handleVerifyAndPay = async () => {
    if (!orderId) return;
    setError(null);
    setOtpLoading(true);
    try {
      const verifyRes = await fetch('/api/checkout/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, otp: otpCode })
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid verification code');

      setLoading(true);
      const res = await fetch('/api/forumpay/widget-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open payment');

      if (data.widgetUrl) {
        window.location.href = data.widgetUrl;
        return;
      }
      setError('No payment URL received. Please try again.');
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
      setOtpLoading(false);
    }
  };

  return (
    <form onSubmit={handleSendOtp} className="space-y-6">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <span className="text-2xl">₿</span>
        <p className="text-amber-200 text-sm">
          Pay with cryptocurrency via ForumPay. We&apos;ll send a verification code to your email before opening the payment page.
        </p>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-md font-semibold text-white mb-3">Order Summary</h4>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-300">
              <span>{item.name} x{item.quantity || 1}</span>
              <span>${((item.price * (item.quantity || 1))).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between text-lg font-semibold text-white">
            <span>Total (USD)</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {showOTPStep && (
        <div className="space-y-4 rounded-lg bg-gray-800 border border-gray-600 p-4">
          <h4 className="text-lg font-semibold text-white">Verification code</h4>
          <p className="text-sm text-gray-300">
            We sent a 6-digit code to <strong className="text-white">{email}</strong>. Enter it below.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-xl tracking-widest placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleVerifyAndPay}
            disabled={otpLoading || loading || otpCode.length !== 6}
            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {otpLoading || loading ? 'Verifying & opening payment...' : 'Verify and Pay with Crypto'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
          {error}
        </div>
      )}

      {!showOTPStep && (
        <button
          type="submit"
          disabled={loading || otpLoading}
          className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading || otpLoading ? 'Sending verification code...' : 'Send verification code'}
        </button>
      )}
    </form>
  );
}
