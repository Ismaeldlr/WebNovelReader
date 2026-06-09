import { useState, useEffect } from 'react';

export const THEMES = [
  { id: 'light', label: 'Light', accent: '#F7F4EF' },
  { id: 'obsidian', label: 'Obsidian', accent: '#C9A84C' },
  { id: 'forest', label: 'Forest', accent: '#4D9E75' },
  { id: 'crimson', label: 'Crimson', accent: '#B85450' },
  { id: 'ocean', label: 'Ocean', accent: '#4A80B5' },
] as const;

export type ThemeId = typeof THEMES[number]['id'];

const THEME_KEY = 'wnh-theme';
const DEFAULT_THEME: ThemeId = 'obsidian';
const THEME_IDS = new Set<string>(THEMES.map(theme => theme.id));

function normalizeThemeId(themeId: string | null): ThemeId {
  if (themeId === 'dark') return DEFAULT_THEME;
  if (themeId && THEME_IDS.has(themeId)) return themeId as ThemeId;
  return DEFAULT_THEME;
}

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    return normalizeThemeId(localStorage.getItem(THEME_KEY));
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem(THEME_KEY, currentTheme);
  }, [currentTheme]);

  const setTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
  };

  return { currentTheme, setTheme };
}
