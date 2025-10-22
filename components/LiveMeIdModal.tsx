'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

type LiveMeIdModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onConfirmAction: (liveMeId: string, email: string) => void;
  initialValue?: string;
};

export default function LiveMeIdModal({ isOpen, onCloseAction, onConfirmAction, initialValue = '' }: LiveMeIdModalProps) {
  const [liveMeId, setLiveMeId] = useState(initialValue);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Rate checking state
  const [checkingRate, setCheckingRate] = useState(false);
  const [appliedRate, setAppliedRate] = useState<number | null>(null);
  const [isCustomRate, setIsCustomRate] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Load saved data from session storage
      const savedId = sessionStorage.getItem('liveMeId');
      const savedEmail = sessionStorage.getItem('email');
      if (savedId) {
        setLiveMeId(savedId);
        setRememberMe(true);
      }
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [isOpen]);

  // Check rate when email is entered
  useEffect(() => {
    const checkRate = async () => {
      if (email && email.includes('@')) {
        setCheckingRate(true);
        try {
          const res = await fetch(`/api/rates/check?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await res.json();
            setAppliedRate(data.rate);
            setIsCustomRate(data.isCustomRate);
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
  }, [email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveMeId.trim()) {
      setError('Please enter your LiveMe ID');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (rememberMe) {
      sessionStorage.setItem('liveMeId', liveMeId.trim());
      sessionStorage.setItem('email', email.trim());
    } else {
      sessionStorage.removeItem('liveMeId');
      sessionStorage.removeItem('email');
    }

    onConfirmAction(liveMeId.trim(), email.trim());
    onCloseAction();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Enter Your LiveMe ID</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
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
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>

              <div className="mb-4">
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
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
              </div>

              {/* Rate Display */}
              {checkingRate && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">Checking your rate...</p>
                </div>
              )}
              {!checkingRate && appliedRate && (
                <div className={`mb-4 p-4 rounded-lg border-2 ${
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

              <div className="flex items-center mb-4">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember my information on this device
                </label>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={onCloseAction}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  return createPortal(modalContent, document.body);
}
