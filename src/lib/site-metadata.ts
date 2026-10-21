// src/lib/site-metadata.ts — 사이트 공통 메타데이터(제목·설명·공유 미리보기). 루트 레이아웃이 호출합니다.
import type { Metadata } from 'next';
import { getPageSettings } from '@/lib/page-settings';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamrane-portfolio.vercel.app';

// 검색 도구 소유 확인 코드. 발급받은 값을 따옴표 안에 넣으세요. 비워 두면 해당 태그는 사이트에 나오지 않습니다.
// (content="..." 안의 긴 문자열만 넣고, <meta ...> 태그 전체를 넣지 마세요)
const GOOGLE_VERIFY = 'uD8vLeezImxB1LzUUiOkGVZKOP8z-HL6h_UTFcLss6s';
const NAVER_VERIFY = '86468c6a04190f1ca171b61f26262bce56fa6d61';

export async function buildSiteMetadata(): Promise<Metadata> {
  const { seo } = await getPageSettings();
  const shareTitle = seo.shareTitle || seo.title;
  const shareDesc = seo.shareDescription || seo.description;

  const verification = {
    ...(GOOGLE_VERIFY ? { google: GOOGLE_VERIFY } : {}),
    ...(NAVER_VERIFY ? { other: { 'naver-site-verification': NAVER_VERIFY } } : {}),
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: '%s — HamRanè' },
    description: seo.description,
    alternates: { canonical: './' },
    ...(Object.keys(verification).length ? { verification } : {}),
    openGraph: {
      type: 'website',
      siteName: 'HamRanè',
      locale: 'ko_KR',
      title: shareTitle,
      description: shareDesc,
    },
  };
}
