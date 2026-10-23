// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { EN_LIVE, localePath } from '@/lib/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamrane-portfolio.vercel.app';

const PAGES: [string, number][] = [
  ['/', 1],
  ['/portfolio', 0.8],
  ['/pricing', 0.8],
  ['/guide', 0.7],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const koUrl = (p: string) => `${SITE_URL}${p}`;
  const enUrl = (p: string) => `${SITE_URL}${localePath('en', p)}`;
  return PAGES.flatMap(([p, priority]) => {
    // 영어 공개 전에는 한국어 주소만. 공개 후에는 두 언어 주소가 서로를 가리키도록 적습니다.
    if (!EN_LIVE) return [{ url: koUrl(p), priority }];
    const alternates = { languages: { ko: koUrl(p), en: enUrl(p) } };
    return [
      { url: koUrl(p), priority, alternates },
      { url: enUrl(p), priority, alternates },
    ];
  });
}
