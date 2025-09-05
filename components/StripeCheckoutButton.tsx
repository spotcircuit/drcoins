'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import LiveMeIdModal from './LiveMeIdModal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  images?: string;
}

interface StripeCheckoutButtonProps {
  items: CheckoutItem[];
  buttonText?: string;
  className?: string;
  liveMeId?: string;
  isCartCheckout?: boolean;
}

export default function StripeCheckoutButton({ 
  items, 
  buttonText = 'Checkout',
  className = '',
  liveMeId: initialLiveMeId = '',
  isCartCheckout = false
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showLiveMeModal, setShowLiveMeModal] = useState(false);
  const [liveMeId, setLiveMeId] = useState(initialLiveMeId);
  const [error, setError] = useState<string | null>(null);

  // Update liveMeId when prop changes
  useEffect(() => {
    setLiveMeId(initialLiveMeId);
  }, [initialLiveMeId]);

  const handleCheckout = async (idToUse?: string) => {
    const effectiveId = idToUse || liveMeId;
    
    // Check for LiveMe ID for all checkouts
    if (!effectiveId || !effectiveId.trim()) {
      if (isCartCheckout) {
        // For cart checkout, show error message
        setError('Please enter your LiveMe ID before checkout');
        return;
      } else {
        // For direct checkout, show modal
        setShowLiveMeModal(true);
        return;
      }
    }
    
    setLoading(true);
    setError(null);

    try {
      // Remove images field from items as Stripe requires absolute URLs
      const cleanItems = items.map(({ images, ...item }) => item);
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: cleanItems,
          liveMeId: effectiveId || null // Always send LiveMeId if available
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
    <div>
      <button
        onClick={() => handleCheckout()}
        disabled={loading}
        className={`px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {loading ? 'Processing...' : buttonText}
      </button>
      
      <LiveMeIdModal
        isOpen={showLiveMeModal}
        onCloseAction={() => setShowLiveMeModal(false)}
        onConfirmAction={async (id) => {
          setLiveMeId(id);
          await handleCheckout(id);
        }}
        initialValue={liveMeId}
      />
      
      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}