'use client';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { useState, useEffect } from 'react';

type BannerTheme = 'default' | 'halloween' | 'thanksgiving' | 'christmas' | 'valentines' | 'easter';

const bannerImages: Record<BannerTheme, string[]> = {
  default: ['/default.png', '/default2.png', '/default3.png'],
  halloween: ['/halloween.png', '/halloween2.png', '/halloween3.png'],
  thanksgiving: ['/thanksgiving.png', '/thanksgiving2.png', '/thanksgiving3.png'],
  christmas: ['/christmas.png', '/christmas2.png', '/christmas3.png'],
  valentines: ['/valentines.png', '/valentines2.png', '/valentines3.png'],
  easter: ['/easter.png', '/easter2.png', '/easter3.png'],
};

export function ThemeBanner() {
  const { activeTheme } = useSeasonalTheme();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [fade, setFade] = useState(true);

  const themeImages = bannerImages[activeTheme as BannerTheme] || bannerImages.default;

  // Randomly select initial image
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * themeImages.length);
    setCurrentImageIndex(randomIndex);
  }, [activeTheme]);

  // Rotate images every 15 seconds
  useEffect(() => {
    if (themeImages.length <= 1) return; // Don't rotate if only one image

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % themeImages.length);
        setFade(true);
      }, 500); // Wait for fade out before changing image
    }, 15000); // Rotate every 15 seconds

    return () => clearInterval(interval);
  }, [themeImages.length, activeTheme]);

  const currentBanner = themeImages[currentImageIndex];

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative w-full h-[500px] rounded-xl overflow-hidden shadow-lg">
          <img
            src={currentBanner}
            alt={`${activeTheme} theme banner`}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              fade ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
