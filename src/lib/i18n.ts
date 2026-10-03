// src/lib/i18n.ts
export type Text = { ko: string } & Record<string, string | undefined>;
export const T = (ko: string): Text => ({ ko });
export const LOCALES: { code: string; label: string }[] = [{ code: 'ko', label: '한국어' }];
export const DEFAULT_LOCALE = 'ko';
export const tx = (v: Text, locale = DEFAULT_LOCALE) => v[locale] ?? v.ko;
export const localePath = (locale: string, path: string) =>
  locale === DEFAULT_LOCALE ? path : `/${locale}${path === '/' ? '' : path}`;
export const stripLocale = (p: string) => {
  const m = p.match(/^\/([a-z]{2})(\/.*)?$/);
  return m && m[1] !== DEFAULT_LOCALE && LOCALES.some((l) => l.code === m[1]) ? m[2] ?? '/' : p;
};
