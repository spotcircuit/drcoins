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

  // Contact info (editable; if user has existing data we could prefill via props later)
  const [formFirstName, setFormFirstName] = useState(firstName ?? '');
  const [formLastName, setFormLastName] = useState(lastName ?? '');
  const [phone, setPhone] = useState('');
  
  // OTP verification state
  const [showOTPStep, setShowOTPStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

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

  // Handle initial form submission - create order and request OTP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate form: contact info, payment, and billing address
    if (!formFirstName?.trim() || !formLastName?.trim()) {
      setError('Please enter your first and last name');
      setLoading(false);
      return;
    }
    if (!phone?.trim()) {
      setError('Please enter your phone number');
      setLoading(false);
      return;
    }
    if (!billingAddress?.trim() || !billingCity?.trim() || !billingState?.trim() || !billingZip?.trim()) {
      setError('Please fill in your full billing address');
      setLoading(false);
      return;
    }
    if (!cardNumber || !expMonth || !expYear || !cardCode) {
      setError('Please fill in all payment fields');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create order first (saves/updates customer with contact + address)
      const orderResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          liveMeId,
          email,
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          phone: phone.trim(),
          address: billingAddress.trim(),
          city: billingCity.trim(),
          state: billingState.trim(),
          zip: billingZip.trim(),
          country: billingCountry.trim()
        })
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      setOrderId(orderData.orderId);

      // Step 2: Generate and send OTP
      setOtpLoading(true);
      const otpResponse = await fetch('/api/checkout/generate-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          email
        })
      });

      const otpData = await otpResponse.json();
      if (!otpResponse.ok) {
        throw new Error(otpData.error || 'Failed to send verification code');
      }

      // Show OTP input step
      setShowOTPStep(true);
      setOtpSent(true);
      setOtpLoading(false);
      setLoading(false);

    } catch (err: any) {
      setError(err.message);
      setOtpLoading(false);
      setLoading(false);
    }
  };

  // Handle OTP verification and payment processing
  const handleOTPVerify = async () => {
    if (!orderId) return;

    setOtpLoading(true);
    setError(null);

    try {
      // Step 1: Verify OTP
      const verifyResponse = await fetch('/api/checkout/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          otp: otpCode
        })
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

      // OTP verified - now process payment
      await processPayment();

    } catch (err: any) {
      setError(err.message);
      setOtpLoading(false);
    }
  };

  // Process payment after OTP verification
  const processPayment = async () => {
    setLoading(true);
    setError(null);

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
          orderId, // Include orderId so server can verify OTP
          items,
          liveMeId,
          email,
          firstName: formFirstName,
          lastName: formLastName,
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

  // Show OTP verification step
  if (showOTPStep) {
    return (
      <div className="space-y-6">
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-6 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Verification Code Sent</h3>
          <p className="text-gray-300 mb-4">
            We've sent a 6-digit verification code to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-400">
            Please check your email and enter the code below to complete your purchase.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Enter Verification Code
          </label>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              setOtpCode(value.substring(0, 6));
            }}
            placeholder="000000"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-2xl tracking-widest font-mono"
            maxLength={6}
            autoFocus
          />
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleOTPVerify}
            disabled={otpLoading || otpCode.length !== 6}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
          >
            {otpLoading ? 'Verifying...' : 'Verify & Pay'}
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!orderId) return;
              setOtpLoading(true);
              setError(null);
              try {
                const response = await fetch('/api/checkout/generate-otp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ orderId, email })
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to resend code');
                }
                setOtpCode('');
                setError(null);
                alert('New verification code sent to your email!');
              } catch (err: any) {
                setError(err.message);
              } finally {
                setOtpLoading(false);
              }
            }}
            disabled={otpLoading}
            className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Resend
          </button>
        </div>

        <p className="text-sm text-gray-400 text-center">
          Didn't receive the code? Check your spam folder or click "Resend" above.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Your information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={formFirstName}
              onChange={(e) => setFormFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={formLastName}
              onChange={(e) => setFormLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>
      </div>

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
                <option value="BRA">Brazil</option>
                <option value="COL">Colombia</option>
                <option value="JAM">Jamaica</option>
                <option value="NGA">Nigeria</option>
                <option value="PRI">Puerto Rico</option>
                <option value="GBR">United Kingdom</option>
                <option value="VEN">Venezuela</option>
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
        disabled={loading || otpLoading || !acceptJsLoaded.current}
        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {loading || otpLoading ? 'Sending Verification Code...' : `Continue to Verification`}
      </button>

      {!acceptJsLoaded.current && (
        <p className="text-sm text-gray-400 text-center">
          Loading secure payment form...
        </p>
      )}
    </form>
  );
}

