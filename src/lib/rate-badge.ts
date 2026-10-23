// src/lib/rate-badge.ts — 단가표 배지(추천·인기·신규). 서버/브라우저 양쪽에서 씁니다.
export const RATE_BADGES = [
  { label: '추천', en: 'Recommended', cls: 'bd-rec' },
  { label: '인기', en: 'Popular', cls: 'bd-hot' },
  { label: '신규', en: 'New', cls: 'bd-new' },
] as const;

/** 정해 둔 배지 문구인지 */
export const isBadge = (t?: string | null): boolean => RATE_BADGES.some((b) => b.label === t);

/** 배지 문구면 모양 클래스를, 아니면 undefined(기존 태그 모양 그대로) */
export const badgeClass = (t?: string | null): string | undefined => {
  const b = RATE_BADGES.find((x) => x.label === t);
  return b ? `bd ${b.cls}` : undefined;
};

/** 저장할 태그: 배지를 골랐으면 배지, 아니면 직접 입력한 글자(비면 null) */
export const pickTag = (badge: string, text: string): string | null =>
  isBadge(badge) ? badge : text || null;

/** 화면에 찍을 배지 글자. 한국어는 그대로, 영어는 정해 둔 배지만 번역합니다. */
export const badgeText = (t: string, lang = 'ko'): string =>
  lang === 'ko' ? t : RATE_BADGES.find((b) => b.label === t)?.en ?? t;
