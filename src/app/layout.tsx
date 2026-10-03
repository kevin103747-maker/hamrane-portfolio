// src/app/layout.tsx — 전체 공통(글꼴/테마). 헤더·푸터는 (site)/layout.tsx에 있습니다.
import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const space = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-space', display: 'swap' });
const jb = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jb', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'HamRanè — Composer & Music Producer', template: '%s — HamRanè' },
  description: '작곡가 · 음악 프로듀서 햄버거라네(HamRanè)의 포트폴리오와 외주 단가 안내.', // 3단계에서 대시보드 값으로 교체
};

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
