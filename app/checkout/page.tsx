'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AcceptJsCheckout from '@/components/AcceptJsCheckout';
import ForumPayCheckout from '@/components/ForumPayCheckout';
import PlaidCheckout from '@/components/PlaidCheckout';
import LiveMeIdModal from '@/components/LiveMeIdModal';
import { useCart } from '@/contexts/CartContext';

type PaymentMethod = 'card' | 'bank' | 'crypto';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items: cartItems, clearCart } = useCart();
  const [liveMeId, setLiveMeId] = useState('');
  const [email, setEmail] = useState('');
  const [showLiveMeModal, setShowLiveMeModal] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  /** Keep Plaid mounted after first visit so switching Card ↔ Bank does not reload Link (avoids duplicate script warning). */
  const [bankTabEverOpened, setBankTabEverOpened] = useState(false);

  useEffect(() => {
    if (paymentMethod === 'bank') setBankTabEverOpened(true);
  }, [paymentMethod]);

  useEffect(() => {
    // Get items from URL params (for direct checkout) or cart
    const itemsParam = searchParams.get('items');
    if (itemsParam) {
      try {
        setCheckoutItems(JSON.parse(decodeURIComponent(itemsParam)));
      } catch (e) {
        console.error('Failed to parse items from URL');
      }
    } else if (cartItems.length > 0) {
      setCheckoutItems(cartItems);
    } else {
      // No items, redirect to home
      router.push('/');
    }

    // Get LiveMe ID and email from URL params if available
    const idParam = searchParams.get('liveMeId');
    const emailParam = searchParams.get('email');
    if (idParam) setLiveMeId(idParam);
    if (emailParam) setEmail(emailParam);
  }, [searchParams, cartItems, router]);

  // Show modal if LiveMe ID or email is missing
  useEffect(() => {
    if (checkoutItems.length > 0 && (!liveMeId || !email)) {
      setShowLiveMeModal(true);
    }
  }, [checkoutItems, liveMeId, email]);

  const handleSuccess = (orderId: string) => {
    clearCart();
    router.push(`/success?orderId=${orderId}`);
  };

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">No items to checkout</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!liveMeId || !email) {
    return (
      <>
        <LiveMeIdModal
          isOpen={showLiveMeModal}
          onCloseAction={() => {
            if (!liveMeId || !email) {
              router.push('/');
            } else {
              setShowLiveMeModal(false);
            }
          }}
          onConfirmAction={(id, emailValue) => {
            setLiveMeId(id);
            setEmail(emailValue);
            setShowLiveMeModal(false);
          }}
          initialValue={liveMeId}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

        <p className="text-gray-400 text-sm mb-4 max-w-2xl">
          Choose how you want to pay. Card and bank use email verification first; crypto opens ForumPay after you verify.
        </p>

        {/* Payment method selector — three equal columns, stacks on very small screens */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-1 rounded-xl bg-gray-900/80 border border-gray-800 p-1.5 sm:p-1 mb-6"
          role="tablist"
          aria-label="Payment method"
        >
          <button
            type="button"
            role="tab"
            aria-selected={paymentMethod === 'card'}
            onClick={() => setPaymentMethod('card')}
            className={`py-3 px-3 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              paymentMethod === 'card'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              💳
            </span>
            Card
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={paymentMethod === 'bank'}
            onClick={() => setPaymentMethod('bank')}
            className={`py-3 px-3 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              paymentMethod === 'bank'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              🏦
            </span>
            Bank (ACH)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={paymentMethod === 'crypto'}
            onClick={() => setPaymentMethod('crypto')}
            className={`py-3 px-3 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors ${
              paymentMethod === 'crypto'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/80'
            }`}
          >
            <span className="mr-1.5" aria-hidden>
              ₿
            </span>
            Crypto
          </button>
        </div>

        <div className="bg-gray-900/50 rounded-2xl p-6 sm:p-8 border border-gray-800">
          {paymentMethod === 'card' && (
            <AcceptJsCheckout
              items={checkoutItems}
              liveMeId={liveMeId}
              email={email}
              onSuccess={handleSuccess}
              onError={(err) => {
                console.error('Checkout error:', err);
              }}
            />
          )}
          {bankTabEverOpened && (
            <div className={paymentMethod === 'bank' ? '' : 'hidden'} aria-hidden={paymentMethod !== 'bank'}>
              <PlaidCheckout
                items={checkoutItems}
                liveMeId={liveMeId}
                email={email}
                onSuccess={handleSuccess}
                onError={(err) => {
                  console.error('Bank checkout error:', err);
                }}
              />
            </div>
          )}
          {paymentMethod === 'crypto' && (
            <ForumPayCheckout
              items={checkoutItems}
              liveMeId={liveMeId}
              email={email}
              onError={(err) => {
                console.error('Crypto checkout error:', err);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-purple-950 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Loading checkout...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

