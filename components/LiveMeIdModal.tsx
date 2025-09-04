'use client';

import { useState, useEffect } from 'react';

type LiveMeIdModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onConfirmAction: (liveMeId: string) => void;
  initialValue?: string;
};

export default function LiveMeIdModal({ isOpen, onCloseAction, onConfirmAction, initialValue = '' }: LiveMeIdModalProps) {
  const [liveMeId, setLiveMeId] = useState(initialValue);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load saved LiveMe ID from session storage
      const savedId = sessionStorage.getItem('liveMeId');
      if (savedId) {
        setLiveMeId(savedId);
        setRememberMe(true);
      }
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveMeId.trim()) {
      setError('Please enter your LiveMe ID');
      return;
    }

    if (rememberMe) {
      sessionStorage.setItem('liveMeId', liveMeId.trim());
    } else {
      sessionStorage.removeItem('liveMeId');
    }

    onConfirmAction(liveMeId.trim());
    onCloseAction();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
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
                  Remember my LiveMe ID on this device
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
}
