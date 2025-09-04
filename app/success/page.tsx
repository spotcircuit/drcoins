'use client';

import { Suspense } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const amount = searchParams.get('amount');
  const coins = searchParams.get('coins');
  const [loading, setLoading] = useState(true);
  const [videoSrc, setVideoSrc] = useState('');
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [confettiItems, setConfettiItems] = useState<Array<{emoji: string, left: string, delay: string, duration: string}>>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      // Randomly select a video
      const videos = [
        '/Coins_Dropped_Slot_Machine_Sound.mp4',
        '/Dropping_Coins_Video_Updated.mp4'
      ];
      const randomVideo = videos[Math.floor(Math.random() * videos.length)];
      setVideoSrc(randomVideo);

      // Create celebration message based on amount
      const purchaseAmount = amount ? parseFloat(amount) : Math.floor(Math.random() * 500) + 20;
      const purchaseCoins = coins ? parseInt(coins) : Math.floor(purchaseAmount * 34.8);
      
      const messages = [
        `💰 JACKPOT! You just scored ${purchaseCoins} coins for $${purchaseAmount}!`,
        `🎉 AMAZING! ${purchaseCoins} coins are heading your way!`,
        `✨ INCREDIBLE! You've secured ${purchaseCoins} shiny coins!`,
        `🎊 FANTASTIC! ${purchaseCoins} coins purchased for $${purchaseAmount}!`,
        `🌟 WINNER! You've got ${purchaseCoins} coins coming!`
      ];
      setCelebrationMessage(messages[Math.floor(Math.random() * messages.length)]);
      
      // Generate confetti items on client side only
      const items = [...Array(20)].map(() => ({
        emoji: ['🪙', '💰', '✨', '🎉', '🎊'][Math.floor(Math.random() * 5)],
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${3 + Math.random() * 2}s`
      }));
      setConfettiItems(items);
      
      setLoading(false);
    }
  }, [sessionId, amount, coins]);

  useEffect(() => {
    if (videoRef.current && videoSrc) {
      // Set volume and play
      videoRef.current.volume = 0.5;
      videoRef.current.play().catch(e => console.log('Video autoplay failed:', e));
    }
  }, [videoSrc]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-blue-600 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Video with Sound */}
      {videoSrc && (
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover opacity-30"
            src={videoSrc}
            loop
            playsInline
            autoPlay
            controls={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 to-transparent" />
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-lg w-full text-center z-10 animate-fadeIn">
        <div className="mb-6">
          <div className="relative">
            <svg
              className="w-24 h-24 mx-auto text-green-400 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-green-400/20 rounded-full animate-ping" />
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4 animate-slideUp">
          Payment Successful!
        </h1>
        
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
          <p className="text-2xl font-bold mb-4 animate-pulse">
            {celebrationMessage}
          </p>
        </div>
        
        <p className="text-white/90 mb-6 text-lg">
          Your Dr. Coins are being delivered to your LiveMe account!
        </p>
        
        {sessionId && (
          <div className="bg-purple-900/30 rounded-lg p-3 mb-6">
            <p className="text-white/70 text-xs mb-1">Order ID:</p>
            <p className="text-white/90 text-sm font-mono">
              {sessionId.slice(0, 30)}...
            </p>
          </div>
        )}
        
        <Link
          href="/"
          className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 font-semibold shadow-lg"
        >
          Buy More Coins! 🎰
        </Link>
        
        <p className="text-white/60 text-sm mt-4">
          Check your email for the receipt
        </p>
      </div>

      {/* Confetti Effect */}
      {confettiItems.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {confettiItems.map((item, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: item.left,
                animationDelay: item.delay,
                animationDuration: item.duration
              }}
            >
              <span className="text-4xl">
                {item.emoji}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full text-center">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}