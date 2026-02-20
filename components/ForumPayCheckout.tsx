'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

// Coin list with images (CoinGecko static assets)
const CRYPTO_OPTIONS: { value: string; label: string; image: string }[] = [
  { value: 'BTC', label: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
  { value: 'ETH', label: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
  { value: 'USDT', label: 'USDT', image: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
  { value: 'SOL', label: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  { value: 'USDC', label: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
  { value: 'TRX', label: 'TRON', image: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png' },
  { value: 'LTC', label: 'Litecoin', image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
];

export default function ForumPayCheckout({
  items,
  liveMeId,
  email,
  firstName,
  lastName,
  onSuccess,
  onError
}: ForumPayCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formFirstName, setFormFirstName] = useState(firstName ?? '');
  const [formLastName, setFormLastName] = useState(lastName ?? '');
  const [phone, setPhone] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');
  const router = useRouter();

  // OTP step (same as card flow)
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const totalAmount = items.reduce((sum, item) =>
    sum + (item.price * (item.quantity || 1)), 0
  );

  // Rate and crypto amount for selected currency (shown in UI)
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  const [cryptoRate, setCryptoRate] = useState<string | null>(null);
  const [cryptoAmount, setCryptoAmount] = useState<string | null>(null);

  useEffect(() => {
    if (totalAmount <= 0) {
      setCryptoRate(null);
      setCryptoAmount(null);
      setRateError(null);
      return;
    }
    let cancelled = false;
    setRateLoading(true);
    setRateError(null);
    setCryptoRate(null);
    setCryptoAmount(null);
    const params = new URLSearchParams({
      currency: cryptoCurrency,
      invoiceAmount: totalAmount.toFixed(2),
    });
    fetch(`/api/forumpay/rate?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setRateError(data.error);
          return;
        }
        setCryptoRate(data.rate ?? null);
        setCryptoAmount(data.amount ?? data.amountExchange ?? null);
      })
      .catch((err) => {
        if (!cancelled) setRateError(err.message || 'Failed to load rate');
      })
      .finally(() => {
        if (!cancelled) setRateLoading(false);
      });
    return () => { cancelled = true; };
  }, [cryptoCurrency, totalAmount]);

  // Step 1: Create order and send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formFirstName?.trim() || !formLastName?.trim()) {
      setError('Please enter your first and last name');
      return;
    }
    if (!phone?.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const orderRes = await fetch('/api/checkout-forumpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          liveMeId,
          email,
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          phone: phone.trim(),
          cryptoCurrency,
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
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      onError?.(err.message);
    } finally {
      setLoading(false);
      setOtpLoading(false);
    }
  };

  // Step 2: Verify OTP and start crypto payment
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
      const res = await fetch('/api/checkout-forumpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          items,
          liveMeId,
          email,
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          phone: phone.trim(),
          cryptoCurrency,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start crypto payment');

      if (data.orderId && onSuccess) onSuccess(data.orderId);

      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank', 'noopener,noreferrer');
        router.push(`/checkout/crypto-pending?orderId=${encodeURIComponent(data.orderId)}`);
        return;
      }
      setError('No payment URL received. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      onError?.(err.message);
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
          Pay with cryptocurrency. We&apos;ll send a verification code to your email before opening the payment page.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
            <input
              type="text"
              value={formFirstName}
              onChange={(e) => setFormFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
            <input
              type="text"
              value={formLastName}
              onChange={(e) => setFormLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Cryptocurrency</h3>
        <p className="text-sm text-gray-400 mb-2">Select currency</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CRYPTO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setCryptoCurrency(opt.value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${
                cryptoCurrency === opt.value
                  ? 'bg-amber-500/20 border-amber-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600 hover:bg-gray-700/50'
              }`}
            >
              <img
                src={opt.image}
                alt={opt.label}
                className="w-8 h-8 rounded-full object-contain flex-shrink-0"
              />
              <span className="text-xs font-medium truncate w-full text-center">{opt.value}</span>
            </button>
          ))}
        </div>
        {rateLoading && (
          <p className="text-sm text-amber-200/80">Loading rate…</p>
        )}
        {!rateLoading && (cryptoRate != null || cryptoAmount != null) && (
          <div className="rounded-lg bg-gray-800 border border-gray-600 p-3 text-sm">
            {cryptoRate != null && (
              <p className="text-gray-300">
                Rate: <span className="text-white font-medium">1 {cryptoCurrency} = ${cryptoRate} USD</span>
              </p>
            )}
            {cryptoAmount != null && (
              <p className="text-amber-200 mt-1">
                You pay: <span className="font-semibold">{cryptoAmount} {cryptoCurrency}</span>
              </p>
            )}
          </div>
        )}
        {!rateLoading && rateError && (
          <p className="text-sm text-red-400">Rate unavailable: {rateError}</p>
        )}
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
          {!rateLoading && cryptoAmount != null && (
            <div className="flex justify-between text-sm text-amber-200 mt-2">
              <span>Amount in {cryptoCurrency}</span>
              <span className="font-medium">{cryptoAmount} {cryptoCurrency}</span>
            </div>
          )}
          {!rateLoading && !cryptoAmount && !rateError && totalAmount > 0 && (
            <p className="text-xs text-gray-500 mt-2">Select a currency to see the crypto amount.</p>
          )}
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
