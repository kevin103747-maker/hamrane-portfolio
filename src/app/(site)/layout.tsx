// src/app/(site)/layout.tsx — 공개 사이트 전용 껍데기(헤더/문의/푸터)
import Link from 'next/link';
import { getSiteData } from '@/lib/site-data';
import { SiteProvider } from '@/components/SiteProvider';
import { ModalProvider } from '@/components/Modals';
import { Header } from '@/components/Header';
import { Contact } from '@/components/Contact';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const data = await getSiteData();
  return (
    <SiteProvider data={data}>
      <ModalProvider>
        <div className="app">
          <Header />
          {children}
          <Contact />
          <footer>
            <div className="wrap">
              <span>© 2026 HamRanè</span>
              <nav>
                <Link href="/">Home</Link><Link href="/portfolio">Portfolio</Link><Link href="/pricing">Pricing</Link>
                <a href={data.links.crewUrl} target="_blank" rel="noopener noreferrer">@VRSounds</a>
              </nav>
            </div>
          </footer>
        </div>
      </ModalProvider>
    </SiteProvider>
  );
}
