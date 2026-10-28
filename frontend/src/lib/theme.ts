// Names must match a [data-theme='<name>'] block in src/styles/themes.css.
export const THEMES = ['light', 'dark'] as const;
export type ThemeName = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeName = 'light';
export const THEME_STORAGE_KEY = 'suns-theme';

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

// Runs before hydration to avoid a flash of the wrong theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var ok=${JSON.stringify(THEMES)};if(ok.indexOf(t)<0){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'${DEFAULT_THEME}';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
