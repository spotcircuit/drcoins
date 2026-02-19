'use client';

import { useState, useEffect } from 'react';
import LiveMeIdModal from './LiveMeIdModal';

interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  amount?: number;
  type?: string;
}

interface AuthorizeNetCheckoutButtonProps {
  items: CheckoutItem[];
  buttonText?: string;
  className?: string;
  liveMeId?: string;
  email?: string;
  isCartCheckout?: boolean;
}

export default function AuthorizeNetCheckoutButton({
  items,
  buttonText = 'Checkout',
  className = '',
  liveMeId: initialLiveMeId = '',
  email: initialEmail = '',
  isCartCheckout = false
}: AuthorizeNetCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showLiveMeModal, setShowLiveMeModal] = useState(false);
  const [liveMeId, setLiveMeId] = useState(initialLiveMeId);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLiveMeId(initialLiveMeId);
  }, [initialLiveMeId]);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleCheckout = async (idToUse?: string, emailToUse?: string) => {
    const effectiveId = idToUse || liveMeId;
    const effectiveEmail = emailToUse || email;

    if (!effectiveId || !effectiveId.trim()) {
      if (isCartCheckout) {
        setError('Please enter your LiveMe ID before checkout');
        return;
      } else {
        setShowLiveMeModal(true);
        return;
      }
    }

    if (!effectiveEmail || !effectiveEmail.trim()) {
      if (isCartCheckout) {
        setError('Please enter your email address before checkout');
        return;
      } else {
        setShowLiveMeModal(true);
        return;
      }
    }

    // Redirect to checkout; order is created only when user clicks OTP (card) or Pay with Crypto (crypto)
    const cleanItems = items.map(({ ...item }) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: item.quantity || 1,
      amount: item.amount,
      type: item.type || 'coins'
    }));
    const itemsParam = encodeURIComponent(JSON.stringify(cleanItems));
    window.location.href = `/checkout?items=${itemsParam}&liveMeId=${encodeURIComponent(effectiveId)}&email=${encodeURIComponent(effectiveEmail)}`;
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
        onConfirmAction={async (id, email) => {
          setLiveMeId(id);
          await handleCheckout(id, email);
        }}
        initialValue={liveMeId}
      />

      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
