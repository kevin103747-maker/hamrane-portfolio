// src/app/portfolio/page.tsx
import { PageHead, SectionHead } from '@/components/Heads';
import { PortfolioView } from '@/components/PortfolioView';
import { ArtistsStrip } from '@/components/ArtistsStrip';

export const metadata = { title: 'Portfolio' };

export default function Portfolio() {
  return (
    <>
      <PageHead crumb="PORTFOLIO" title="포트폴리오" en="Portfolio" desc="참여 파트별로 작업물을 모아볼 수 있습니다." />
      <section>
        <PortfolioView />
        <div className="wrap artblk">
          <SectionHead n="ARTISTS" title="Artists" sub="아티스트별 모아보기" />
          <ArtistsStrip />
        </div>
      </section>
    </>
  );
}
