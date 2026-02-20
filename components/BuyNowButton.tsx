'use client';

import { useState } from 'react';
import LiveMeIdModal from './LiveMeIdModal';

interface BuyNowButtonProps {
  item: {
    name: string;
    description?: string;
    price: number;
    quantity?: number;
    amount?: number;
    type?: string;
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

  const proceedWithCheckout = (liveMeId: string, email: string) => {
    // Redirect to checkout; order is created only when user clicks OTP (card) or Pay with Crypto (crypto)
    const items = [{
      name: item.name,
      description: item.description,
      price: item.price,
      quantity: item.quantity || 1,
      amount: item.amount,
      type: item.type || 'coins'
    }];
    const itemsParam = encodeURIComponent(JSON.stringify(items));
    window.location.href = `/checkout?items=${itemsParam}&liveMeId=${encodeURIComponent(liveMeId)}&email=${encodeURIComponent(email)}`;
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
