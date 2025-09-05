'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import StripeCheckoutButton from './StripeCheckoutButton';

export default function CartDrawer() {
  const { items, removeFromCart, updateQuantity, getTotalPrice, isOpen, setIsOpen, clearCart } = useCart();
  const [liveMeId, setLiveMeId] = useState('');
  const [error, setError] = useState('');

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
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-bold">Your Cart</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                        <h3 className="font-semibold">{item.name}</h3>
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
                          className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg bg-purple-100 hover:bg-purple-200 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-lg font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-4 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              
              <div className="space-y-4">
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
                
                <StripeCheckoutButton
                  items={items.map(item => ({
                    name: item.name,
                    description: item.description,
                    price: item.price,
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