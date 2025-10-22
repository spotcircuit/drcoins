'use client';

import { useState, useEffect } from 'react';

export type ThemeId = 'auto' | 'default' | 'halloween' | 'thanksgiving' | 'christmas' | 'valentines' | 'easter';

export interface Theme {
  id: ThemeId;
  name: string;
  icon: string;
  description: string;
}

export const themes: Theme[] = [
  { id: 'auto', name: 'Auto (Seasonal)', icon: '🎨', description: 'Automatically changes with seasons' },
  { id: 'default', name: 'Default', icon: '💰', description: 'Classic Dr. Coins theme' },
  { id: 'halloween', name: 'Halloween', icon: '🎃', description: 'Spooky October vibes' },
  { id: 'thanksgiving', name: 'Thanksgiving', icon: '🦃', description: 'Harvest season warmth' },
  { id: 'christmas', name: 'Christmas', icon: '🎄', description: 'Festive holiday cheer' },
  { id: 'valentines', name: 'Valentine\'s Day', icon: '💝', description: 'Love is in the air' },
  { id: 'easter', name: 'Easter', icon: '🐰', description: 'Spring celebration' },
];

function getSeasonalTheme(): ThemeId {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day = now.getDate();

  // Halloween: October 1-31
  if (month === 9) return 'halloween';

  // Thanksgiving: November 1-30
  if (month === 10) return 'thanksgiving';

  // Christmas: December 1-31
  if (month === 11) return 'christmas';

  // Valentine's Day: February 1-14
  if (month === 1 && day <= 14) return 'valentines';

  // Easter: March 15 - April 30 (approximate spring season)
  if ((month === 2 && day >= 15) || month === 3) return 'easter';

  return 'default';
}

export function useSeasonalTheme() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('auto');
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default');

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem('theme-preference');
    if (saved && themes.find(t => t.id === saved)) {
      setSelectedTheme(saved as ThemeId);
    }
  }, []);

  useEffect(() => {
    // Determine active theme based on selection
    const theme = selectedTheme === 'auto' ? getSeasonalTheme() : selectedTheme;
    setActiveTheme(theme);

    // Apply theme to document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [selectedTheme]);

  const changeTheme = (themeId: ThemeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem('theme-preference', themeId);
  };

  return {
    selectedTheme,
    activeTheme,
    changeTheme,
    themes,
  };
}
