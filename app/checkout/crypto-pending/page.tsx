'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';

const REDIRECT_DELAY_MS = 2500;

function CryptoPendingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY_MS / 1000);

  useEffect(() => {
    const url = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('forumpay_payment_url') : null;
    if (!url) return;

    setRedirecting(true);
    const start = Date.now();
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((REDIRECT_DELAY_MS - (Date.now() - start)) / 1000));
      setCountdown(left);
      if (left <= 0) clearInterval(interval);
    }, 200);

    const t = setTimeout(() => {
      sessionStorage.removeItem('forumpay_payment_url');
      window.location.href = url;
    }, REDIRECT_DELAY_MS);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-2xl bg-gray-900/50 border border-gray-800 p-8 text-center">
        <div className="flex justify-center mb-6">
          <span className="text-5xl" aria-hidden>₿</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Your payment is pending
        </h1>
        {redirecting ? (
          <>
            <p className="text-amber-200 mb-2">
              Redirecting you to complete your crypto payment…
            </p>
            <p className="text-gray-400 text-sm mb-6">
              You will be taken to the payment page in {countdown} second{countdown !== 1 ? 's' : ''}.
            </p>
          </>
        ) : (
          <p className="text-gray-300 mb-6">
            Once you complete payment, you will get notified via email.
          </p>
        )}
        {orderId && (
          <p className="text-sm text-gray-500 mb-6">
            Order reference: <span className="font-mono text-gray-400">{orderId}</span>
          </p>
        )}
        {!redirecting && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={orderId ? `/success?orderId=${orderId}` : '/'}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
            >
              I&apos;ve completed payment — view order
            </Link>
            <Link
              href="/"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Return to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CryptoPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <CryptoPendingContent />
    </Suspense>
  );
}
