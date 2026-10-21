// src/components/RootShell.tsx — 모든 루트 레이아웃이 함께 쓰는 <html>/<body> 껍데기(글꼴·테마). 전역 CSS는 각 레이아웃 파일에서 불러옵니다.
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

const space = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-space', display: 'swap' });
const jb = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jb', display: 'swap' });

const THEME_INIT = "try{var t=localStorage.getItem('hamrane-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}";

export function RootShell({ lang, children }: { lang: string; children: React.ReactNode }) {
  return (
    <html lang={lang} data-theme="dark" className={`${space.variable} ${jb.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
