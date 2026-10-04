// src/lib/page-settings.ts — 사이트 제목·설명(SEO)과 홈 소개 문구. site_settings의 'seo', 'intro' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';

type SeoSettings = {
  title: string;
  description: string;
  shareTitle: string; // 비어 있으면 title 사용
  shareDescription: string; // 비어 있으면 description 사용
};
type IntroSettings = { eyebrow: string; roles: string };

const DEFAULT_SEO: SeoSettings = {
  title: 'HamRanè — Composer & Music Producer',
  description: '작곡가 · 음악 프로듀서 햄버거라네(HamRanè)의 포트폴리오와 외주 단가 안내.',
  shareTitle: '',
  shareDescription: '',
};
const DEFAULT_INTRO: IntroSettings = {
  eyebrow: 'COMPOSER & MUSIC PRODUCER',
  roles: '작곡 · 편곡 · 믹싱 · 마스터링',
};

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
const text = (v: unknown): string => {
  const t = typeof v === 'string' ? v : (v as { ko?: string } | null)?.ko;
  return typeof t === 'string' ? t.trim() : '';
};

async function load(): Promise<{ seo: SeoSettings; intro: IntroSettings }> {
  const fallback = { seo: { ...DEFAULT_SEO }, intro: { ...DEFAULT_INTRO } };
  if (!supabase) return fallback;

  const { data, error } = await supabase.from('site_settings').select('key, value').in('key', ['seo', 'intro']);
  if (error) {
    console.error('[page-settings] 조회 실패:', error.message);
    return fallback;
  }
  const get = (k: string) => (data?.find((r) => r.key === k)?.value ?? {}) as Record<string, unknown>;
  const seo = get('seo');
  const intro = get('intro');

  return {
    seo: {
      title: text(seo.title) || DEFAULT_SEO.title,
      description: text(seo.description) || DEFAULT_SEO.description,
      shareTitle: text(seo.shareTitle),
      shareDescription: text(seo.shareDescription),
    },
    intro: {
      eyebrow: text(intro.eyebrow) || DEFAULT_INTRO.eyebrow,
      roles: text(intro.roles) || DEFAULT_INTRO.roles,
    },
  };
}

// cache(): 같은 요청 안에서 layout과 page가 각각 불러도 조회는 1번만 합니다.
export const getPageSettings = cache(load);
