// src/app/en/(site)/layout.tsx — 영어 공개 사이트 껍데기. 본문은 SiteShell에 있습니다.
import { SiteShell } from '@/components/SiteShell';

export default function EnSiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
