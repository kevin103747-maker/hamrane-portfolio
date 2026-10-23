// src/components/SiteShell.tsx — 공개 사이트 껍데기(헤더/문의/푸터). 한국어·영어 레이아웃이 함께 씁니다.
import Link from '@/components/LocaleLink';
import { getSiteData } from '@/lib/site-data';
import { getGuideSettings } from '@/lib/guide-settings';
import { getStatusSettings } from '@/lib/status-settings';
import { SiteProvider } from '@/components/SiteProvider';
import { ModalProvider } from '@/components/Modals';
import { Header } from '@/components/Header';
import { Contact } from '@/components/Contact';
import { PointerFx } from '@/components/PointerFx';
import { BackToTop } from '@/components/BackToTop';
import { ScrollHint } from '@/components/ScrollHint';
import { Tracker } from '@/components/Tracker';
import { BottomNav } from '@/components/BottomNav';

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const [data, guide, status] = await Promise.all([getSiteData(), getGuideSettings(), getStatusSettings()]);
  return (
    <SiteProvider data={data}>
      <ModalProvider>
        <div className="app">
          <Header />
          <PointerFx />
          <BackToTop />
          <Tracker />
          <ScrollHint />
          {children}
          <Contact guide={guide.contact} status={status} />
          <footer>
            <div className="wrap">
              <span>© 2026 HamRanè</span>
              <nav>
                <Link href="/">Home</Link><Link href="/portfolio">Portfolio</Link><Link href="/pricing">Pricing</Link><Link href="/guide">Guide</Link>
                <a href={data.links.crewUrl} target="_blank" rel="noopener noreferrer">@VRSounds</a>
              </nav>
            </div>
          </footer>
          <BottomNav />
        </div>
      </ModalProvider>
    </SiteProvider>
  );
}
