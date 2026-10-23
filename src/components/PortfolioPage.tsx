// src/components/PortfolioPage.tsx — 포트폴리오 페이지 본문. 한국어(/portfolio)와 영어(/en/portfolio)가 함께 씁니다.
import { PageHead, SectionHead } from '@/components/Heads';
import { PortfolioView } from '@/components/PortfolioView';
import { ArtistsStrip } from '@/components/ArtistsStrip';
import { dict } from '@/lib/dict';

export function PortfolioPage({ lang = 'ko' }: { lang?: string }) {
  const L = dict(lang).folio;
  return (
    <>
      <PageHead crumb="PORTFOLIO" title={L.pageTitle} en={L.pageSub} desc={L.pageDesc} />
      <section>
        <PortfolioView />
        <div className="wrap artblk">
          <SectionHead n="ARTISTS" title="Artists" sub={L.artSub} />
          <ArtistsStrip />
        </div>
      </section>
    </>
  );
}
