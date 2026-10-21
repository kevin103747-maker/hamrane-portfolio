// src/app/en/layout.tsx — 영어 사이트의 루트 레이아웃(주소는 /en/...)
import '../globals.css';
import { RootShell } from '@/components/RootShell';
import { LocaleProvider } from '@/components/LocaleLink';
import { buildSiteMetadata } from '@/lib/site-metadata';

export async function generateMetadata() {
  return buildSiteMetadata('en');
}

export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="en">
      <LocaleProvider lang="en">{children}</LocaleProvider>
    </RootShell>
  );
}
