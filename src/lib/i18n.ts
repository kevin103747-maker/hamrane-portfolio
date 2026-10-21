// src/lib/i18n.ts — 언어 목록과 주소 도우미
export type Text = { ko: string } & Record<string, string | undefined>;
export const T = (ko: string): Text => ({ ko });
export const LOCALES: { code: string; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];
export const DEFAULT_LOCALE = 'ko';

/** 영어 사이트를 방문자에게 공개할지. '1'일 때만 언어 선택·사이트맵의 영어 주소·검색 노출이 켜집니다. 빌드 때 정해집니다. */
export const EN_LIVE = process.env.NEXT_PUBLIC_EN_LIVE === '1';

export const tx = (v: Text, locale = DEFAULT_LOCALE) => v[locale] ?? v.ko;

/** 한국어는 주소 그대로, 다른 언어는 앞에 /언어를 붙입니다. 이미 붙어 있으면 그대로 둡니다. */
export const localePath = (locale: string, path: string) => {
  if (locale === DEFAULT_LOCALE) return path;
  if (path === `/${locale}` || path.startsWith(`/${locale}/`)) return path;
  return `/${locale}${path === '/' ? '' : path}`;
};

export const stripLocale = (p: string) => {
  const m = p.match(/^\/([a-z]{2})(\/.*)?$/);
  return m && m[1] !== DEFAULT_LOCALE && LOCALES.some((l) => l.code === m[1]) ? m[2] ?? '/' : p;
};
