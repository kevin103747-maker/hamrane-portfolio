// src/app/layout.tsx — 전체 공통(글꼴/테마). 헤더·푸터는 (site)/layout.tsx에 있습니다.
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { getPageSettings } from '@/lib/page-settings';
import './globals.css';

const space = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-space', display: 'swap' });
const jb = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jb', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamrane-portfolio.vercel.app';

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPageSettings();
  const shareTitle = seo.shareTitle || seo.title;
  const shareDesc = seo.shareDescription || seo.description;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: '%s — HamRanè' },
    description: seo.description,
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
