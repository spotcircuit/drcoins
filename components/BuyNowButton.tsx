'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import LiveMeIdModal from './LiveMeIdModal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BuyNowButtonProps {
  item: {
    name: string;
    description?: string;
    price: number;
    quantity?: number;
  };
  className?: string;
  buttonText?: string;
}

export default function BuyNowButton({ 
  item, 
  className = '',
  buttonText = 'Buy Now'
}: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showLiveMeModal, setShowLiveMeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuyNow = () => {
    // Always show the modal first to get LiveMe ID
    setShowLiveMeModal(true);
  };

  const proceedWithCheckout = async (liveMeId: string, email: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{
            name: item.name,
            description: item.description,
            price: item.price,
            quantity: item.quantity || 1
          }],
          liveMeId: liveMeId,
          email: email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleBuyNow}
        disabled={loading}
        className={`px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {loading ? 'Processing...' : buttonText}
      </button>
      
      <LiveMeIdModal
        isOpen={showLiveMeModal}
        onCloseAction={() => {
          setShowLiveMeModal(false);
          setError(null);
        }}
        onConfirmAction={async (id, email) => {
          setShowLiveMeModal(false);
          await proceedWithCheckout(id, email);
        }}
        initialValue=""
      />
      
      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </>
  );
}