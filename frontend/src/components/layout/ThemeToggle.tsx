'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { THEME_STORAGE_KEY, type ThemeName } from '@/lib/theme';

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
};
const getSnapshot = () => document.documentElement.getAttribute('data-theme');

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => null);

  function toggle() {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage unavailable; the theme still applies for this session
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle light and dark theme">
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
