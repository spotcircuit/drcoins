'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface CheckoutItem {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  amount?: number;
  type?: string;
}

interface AcceptJsCheckoutProps {
  items: CheckoutItem[];
  liveMeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    Accept: any;
  }
}

export default function AcceptJsCheckout({
  items,
  liveMeId,
  email,
  firstName,
  lastName,
  onSuccess,
  onError
}: AcceptJsCheckoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingState, setBillingState] = useState('');
  const [billingZip, setBillingZip] = useState('');
  const [billingCountry, setBillingCountry] = useState('USA');
  const acceptJsLoaded = useRef(false);

  // Calculate total
  const totalAmount = items.reduce((sum, item) => 
    sum + (item.price * (item.quantity || 1)), 0
  );

  // Load Accept.js library
  useEffect(() => {
    if (acceptJsLoaded.current) return;
    
    // Check if already loaded
    if (window.Accept && typeof window.Accept.dispatchData === 'function') {
      acceptJsLoaded.current = true;
      return;
    }
    
    const isProd = process.env.NEXT_PUBLIC_AUTHORIZENET_ENV === 'production';
    const acceptJsUrl = isProd
      ? 'https://js.authorize.net/v1/Accept.js'
      : 'https://jstest.authorize.net/v1/Accept.js';

    const script = document.createElement('script');
    script.src = acceptJsUrl;
    script.type = 'text/javascript';
    script.async = false; // Load synchronously to ensure it's available
    script.onload = () => {
      setTimeout(() => {
        if (window.Accept && typeof window.Accept.dispatchData === 'function') {
          acceptJsLoaded.current = true;
        } else {
          setError('Payment library failed to initialize');
        }
      }, 100);
    };
    script.onerror = () => {
      setError('Failed to load payment library. Please refresh the page.');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate form
    if (!cardNumber || !expMonth || !expYear || !cardCode) {
      setError('Please fill in all payment fields');
      setLoading(false);
      return;
    }

    // Check if Accept.js is loaded and ready
    if (!window.Accept || typeof window.Accept.dispatchData !== 'function') {
      setError('Payment library not ready. Please wait a moment and try again.');
      setLoading(false);
      return;
    }

    // Validate environment variables
    const clientKey = process.env.NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY;
    const apiLoginID = process.env.NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID;
    
    if (!clientKey || !apiLoginID) {
      setError('Payment configuration error. Please contact support.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Get opaque data from Accept.js
      const secureData = await new Promise<any>((resolve, reject) => {
        // Verify Accept.js is loaded
        if (!window.Accept || typeof window.Accept.dispatchData !== 'function') {
          reject(new Error('Payment library not fully loaded. Please refresh the page.'));
          return;
        }

        const clientKey = process.env.NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY || '';
        const apiLoginID = process.env.NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID || '';

        if (!clientKey || !apiLoginID) {
          reject(new Error('Payment configuration error. Please contact support.'));
          return;
        }

        const authData = {
          clientKey: clientKey,
          apiLoginID: apiLoginID
        };

        const cardData = {
          cardNumber: cardNumber.replace(/\s/g, ''),
          month: expMonth,
          year: expYear,
          cardCode: cardCode
        };

        const secureData = {
          authData: authData,
          cardData: cardData
        };

        try {
          const responseHandler = function(response: any) {
            try {
              if (!response) {
                reject(new Error('No response from payment processor'));
                return;
              }
              
              if (response.messages) {
                if (response.messages.resultCode === 'Error') {
                  const errorMsg = response.messages.message?.[0]?.text || 'Payment data tokenization failed';
                  reject(new Error(errorMsg));
                  return;
                }
              }
              
              if (response.opaqueData) {
                if (response.opaqueData.dataDescriptor && response.opaqueData.dataValue) {
                  resolve(response.opaqueData);
                } else {
                  reject(new Error('Invalid response from payment processor. Missing payment data.'));
                }
              } else {
                reject(new Error('Invalid response from payment processor. Missing payment data.'));
              }
            } catch (callbackError: any) {
              reject(new Error(callbackError.message || 'Error processing payment response'));
            }
          };
          
          window.Accept.dispatchData(secureData, responseHandler);
          
          setTimeout(() => {
            reject(new Error('Payment request timed out. Please try again.'));
          }, 30000);
          
        } catch (dispatchError: any) {
          reject(new Error(dispatchError.message || 'Failed to send payment data. Please try again.'));
        }
      });

      // Step 2: Send opaque data to server to process payment
      const response = await fetch('/api/checkout-acceptjs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          liveMeId,
          email,
          firstName,
          lastName,
          opaqueData: secureData,
          billingAddress: {
            address: billingAddress,
            city: billingCity,
            state: billingState,
            zip: billingZip,
            country: billingCountry
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment processing failed');
      }

      // Success - redirect to success page
      if (onSuccess) {
        onSuccess(data.orderId);
      } else {
        router.push(`/success?orderId=${data.orderId}&amount=${totalAmount}`);
      }

    } catch (err: any) {
      const errorMessage = err.message || 'Payment processing failed';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Card Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Payment Information</h3>
        
        {/* Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Number
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
              setCardNumber(formatted.substring(0, 19));
            }}
            placeholder="1234 5678 9012 3456"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
            maxLength={19}
          />
        </div>

        {/* Expiration and CVV */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Month
            </label>
            <select
              value={expMonth}
              onChange={(e) => setExpMonth(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, '0');
                return (
                  <option key={month} value={month}>
                    {month}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Year
            </label>
            <select
              value={expYear}
              onChange={(e) => setExpYear(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">YYYY</option>
              {Array.from({ length: 15 }, (_, i) => {
                const year = new Date().getFullYear() + i;
                return (
                  <option key={year} value={year}>
                    {year}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CVV
            </label>
            <input
              type="text"
              value={cardCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setCardCode(value.substring(0, 4));
              }}
              placeholder="123"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
              maxLength={4}
            />
          </div>
        </div>

        {/* Billing Address */}
        <div className="space-y-4 pt-4 border-t border-gray-700">
          <h4 className="text-md font-semibold text-white">Billing Address</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                value={billingState}
                onChange={(e) => setBillingState(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={billingZip}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setBillingZip(value.substring(0, 10));
                }}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country
              </label>
              <select
                value={billingCountry}
                onChange={(e) => setBillingCountry(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="USA">United States</option>
                <option value="CAN">Canada</option>
                <option value="MEX">Mexico</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-md font-semibold text-white mb-3">Order Summary</h4>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm text-gray-300">
              <span>{item.name} x{item.quantity || 1}</span>
              <span>${(item.price * (item.quantity || 1)).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between text-lg font-semibold text-white">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !acceptJsLoaded.current}
        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {loading ? 'Processing Payment...' : `Pay $${totalAmount.toFixed(2)}`}
      </button>

      {!acceptJsLoaded.current && (
        <p className="text-sm text-gray-400 text-center">
          Loading secure payment form...
        </p>
      )}
    </form>
  );
}

