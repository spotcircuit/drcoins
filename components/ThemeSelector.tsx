'use client';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';

export function ThemeSelector() {
  const { selectedTheme, activeTheme, changeTheme, themes } = useSeasonalTheme();

  return (
    <div className="relative inline-block">
      <select
        value={selectedTheme}
        onChange={(e) => changeTheme(e.target.value as any)}
        className="appearance-none bg-gray-800 text-white rounded-lg px-4 py-2 pr-10 border border-gray-600 hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
        title="Select Theme"
      >
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.icon} {theme.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
        </svg>
      </div>
      {selectedTheme === 'auto' && (
        <div className="absolute top-full mt-2 left-0 right-0 text-center">
          <span className="inline-block bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-600">
            Currently: {themes.find(t => t.id === activeTheme)?.icon} {themes.find(t => t.id === activeTheme)?.name}
          </span>
        </div>
      )}
    </div>
  );
}
