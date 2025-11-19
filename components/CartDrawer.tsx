'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import StripeCheckoutButton from './StripeCheckoutButton';

export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, isOpen, setIsOpen, clearCart } = useCart();
  const [liveMeId, setLiveMeId] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [checkingRate, setCheckingRate] = useState(false);
  const [appliedRate, setAppliedRate] = useState<number | null>(null);
  const [isCustomRate, setIsCustomRate] = useState(false);

  // Load saved email and LiveMe ID from session storage
  useEffect(() => {
    if (isOpen) {
      const savedEmail = sessionStorage.getItem('email');
      const savedLiveMeId = sessionStorage.getItem('liveMeId');
      if (savedEmail) setEmail(savedEmail);
      if (savedLiveMeId) setLiveMeId(savedLiveMeId);
    }
  }, [isOpen]);

  // Check rate when email and LiveMe ID both change
  useEffect(() => {
    const checkRate = async () => {
      // Only check rate when both email and LiveMe ID are filled
      if (email && email.includes('@') && liveMeId && liveMeId.trim()) {
        setCheckingRate(true);
        try {
          const res = await fetch(`/api/rates/check?email=${encodeURIComponent(email)}&liveMeId=${encodeURIComponent(liveMeId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.error) {
              // LiveMe ID doesn't match - show error and don't apply custom rate
              setError(data.error);
              setAppliedRate(data.rate); // Will be global rate
              setIsCustomRate(false);
            } else {
              // Clear any previous error
              setError('');
              setAppliedRate(data.rate);
              setIsCustomRate(data.isCustomRate);
            }
          }
        } catch (err) {
          console.error('Failed to check rate:', err);
        } finally {
          setCheckingRate(false);
        }
      } else {
        setAppliedRate(null);
        setIsCustomRate(false);
      }
    };

    const debounceTimer = setTimeout(checkRate, 500);
    return () => clearTimeout(debounceTimer);
  }, [email, liveMeId]);

  // Helper function to extract coin amount from item name
  const getCoinsFromItemName = (name: string): number => {
    const match = name.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
    return 0;
  };

  // Calculate adjusted price based on custom rate
  const getAdjustedPrice = (item: any): number => {
    if (!appliedRate || appliedRate === 87) {
      return item.price; // No adjustment needed for standard rate
    }
    const coins = getCoinsFromItemName(item.name);
    if (coins > 0) {
      return coins / appliedRate;
    }
    return item.price;
  };

  // Calculate total with adjusted prices
  const getAdjustedTotal = (): number => {
    if (!appliedRate || appliedRate === 87) {
      return getTotalPrice();
    }
    return items.reduce((total, item) => {
      return total + (getAdjustedPrice(item) * item.quantity);
    }, 0);
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveMeId.trim()) {
      setError('Please enter your LiveMe ID');
      return;
    }
    // Proceed with checkout - this will be handled by the StripeCheckoutButton
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform text-gray-900">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <p className="text-center text-gray-500 mt-8">Your cart is empty</p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        {liveMeId && (
                          <p className="text-sm text-purple-600 font-medium">LiveMe ID: {liveMeId}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          {liveMeId 
                            ? `Instant delivery to LiveMe ID: ${liveMeId}`
                            : (item.description || 'Instant delivery to your LiveMe account')
                          }
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 flex items-center justify-center text-purple-700 font-bold"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-gray-900 font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 flex items-center justify-center text-purple-700 font-bold"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {appliedRate && appliedRate !== 87 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-400 line-through">
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                            <span className="text-green-600">
                              ${(getAdjustedPrice(item) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-4">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total:</span>
                {appliedRate && appliedRate !== 87 ? (
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-gray-400 line-through font-normal">
                      ${getTotalPrice().toFixed(2)}
                    </span>
                    <span className="text-green-600">
                      ${getAdjustedTotal().toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span>${getTotalPrice().toFixed(2)}</span>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="your@email.com"
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'}`}
                  />
                </div>

                <div>
                  <label htmlFor="liveMeId" className="block text-sm font-medium text-gray-700 mb-1">
                    LiveMe ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="liveMeId"
                    value={liveMeId}
                    onChange={(e) => {
                      setLiveMeId(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter your LiveMe ID"
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                </div>

                {/* Rate Display */}
                {checkingRate && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">Checking your rate...</p>
                  </div>
                )}
                {!checkingRate && appliedRate && (
                  <div className={`p-4 rounded-lg border-2 ${
                    isCustomRate
                      ? 'bg-green-50 border-green-400'
                      : 'bg-blue-50 border-blue-300'
                  }`}>
                    {isCustomRate ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🎉</span>
                          <span className="font-bold text-green-800">Special Rate Applied!</span>
                        </div>
                        <p className="text-sm text-green-700">
                          You have a custom rate of <strong>{appliedRate} coins per $1</strong>
                          <br />
                          <span className="text-xs text-green-600">(Standard rate: 87 coins per $1)</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-blue-800">
                        Standard rate: <strong>{appliedRate} coins per $1</strong>
                      </p>
                    )}
                  </div>
                )}

                <StripeCheckoutButton
                  items={items.map(item => ({
                    name: item.name,
                    description: item.description,
                    price: appliedRate && appliedRate !== 87 ? getAdjustedPrice(item) : item.price,
                    quantity: item.quantity,
                    images: item.image,
                    metadata: {
                      liveMeId: liveMeId.trim()
                    }
                  }))}
                  buttonText="Proceed to Checkout"
                  className="w-full"
                  isCartCheckout={true}
                  liveMeId={liveMeId.trim()}
                  email={email.trim()}
                />
              </div>
              
              <button
                onClick={clearCart}
                className="w-full px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}