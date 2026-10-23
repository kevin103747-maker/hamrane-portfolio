// src/lib/site-metadata.ts — 사이트 공통 메타데이터(제목·설명·공유 미리보기). 루트 레이아웃이 호출합니다.
import type { Metadata } from 'next';
import { getPageSettings } from '@/lib/page-settings';
import { EN_LIVE } from '@/lib/i18n';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamrane-portfolio.vercel.app';

// 검색 도구 소유 확인 코드. 발급받은 값을 따옴표 안에 넣으세요. 비워 두면 해당 태그는 사이트에 나오지 않습니다.
// (content="..." 안의 긴 문자열만 넣고, <meta ...> 태그 전체를 넣지 마세요)
const GOOGLE_VERIFY = 'uD8vLeezImxB1LzUUiOkGVZKOP8z-HL6h_UTFcLss6s';
const NAVER_VERIFY = '86468c6a04190f1ca171b61f26262bce56fa6d61';

// 영어 사이트의 제목·설명. 임시 문구이니 직접 고쳐 주세요.
const EN_SEO = {
  title: 'HamRanè — Music production portfolio',
  description: 'Portfolio and commission rates of HamRanè, a music producer. Browse works by role and check pricing.',
  shareTitle: 'HamRanè — Music production portfolio',
  shareDescription: 'Portfolio and commission rates of HamRanè, a music producer.',
};

export async function buildSiteMetadata(lang = 'ko'): Promise<Metadata> {
  const en = lang === 'en';
  const { seo } = await getPageSettings();
  const title = en ? EN_SEO.title : seo.title;
  const description = en ? EN_SEO.description : seo.description;
  const shareTitle = en ? EN_SEO.shareTitle : seo.shareTitle || seo.title;
  const shareDesc = en ? EN_SEO.shareDescription : seo.shareDescription || seo.description;

  const verification = {
    ...(GOOGLE_VERIFY ? { google: GOOGLE_VERIFY } : {}),
    ...(NAVER_VERIFY ? { other: { 'naver-site-verification': NAVER_VERIFY } } : {}),
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: '%s — HamRanè' },
    description,
    alternates: { canonical: './' },
    // 영어 사이트를 공개하기 전에는 검색에 잡히지 않게 합니다. (robots.txt로 막으면 이 표시를 읽지 못해 쓰지 않습니다)
    ...(en && !EN_LIVE ? { robots: { index: false, follow: false } } : {}),
    ...(Object.keys(verification).length ? { verification } : {}),
    openGraph: {
      type: 'website',
      siteName: 'HamRanè',
      locale: en ? 'en_US' : 'ko_KR',
      title: shareTitle,
      description: shareDesc,
    },
  };
}
