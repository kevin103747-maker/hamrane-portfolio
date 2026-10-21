// src/app/(ko)/layout.tsx — 한국어 사이트(주소에 언어 표시 없음)의 루트 레이아웃
import '../globals.css';
import { RootShell } from '@/components/RootShell';
import { buildSiteMetadata } from '@/lib/site-metadata';

export async function generateMetadata() {
  return buildSiteMetadata();
}

export default function KoRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell lang="ko">{children}</RootShell>;
}
