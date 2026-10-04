// src/app/layout.tsx — 전체 공통(글꼴/테마). 헤더·푸터는 (site)/layout.tsx에 있습니다.
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { getPageSettings } from '@/lib/page-settings';
import './globals.css';

const space = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-space', display: 'swap' });
const jb = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jb', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamrane-portfolio.vercel.app';

// 검색 도구 소유 확인 코드. 발급받은 값을 따옴표 안에 넣으세요. 비워 두면 해당 태그는 사이트에 나오지 않습니다.
// (content="..." 안의 긴 문자열만 넣고, <meta ...> 태그 전체를 넣지 마세요)
const GOOGLE_VERIFY = 'uD8vLeezImxB1LzUUiOkGVZKOP8z-HL6h_UTFcLss6s';
const NAVER_VERIFY = '86468c6a04190f1ca171b61f26262bce56fa6d61';

export async function generateMetadata(): Promise<Metadata> {
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
    ...(Object.keys(verification).length ? { verification } : {}),
    openGraph: {
      type: 'website',
      siteName: 'HamRanè',
      locale: 'ko_KR',
      url: '/',
      title: shareTitle,
      description: shareDesc,
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDesc,
    },
  };
}

const THEME_INIT = "try{var t=localStorage.getItem('hamrane-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" className={`${space.variable} ${jb.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
