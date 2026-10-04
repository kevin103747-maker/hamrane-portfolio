// src/app/(site)/page.tsx
import Link from 'next/link';
import { getSiteData } from '@/lib/site-data';
import { getPageSettings } from '@/lib/page-settings';
import { getStatusSettings } from '@/lib/status-settings';
import { computeStats } from '@/lib/stats';
import { IndexReel } from '@/components/IndexReel';
import { RecentMarquee } from '@/components/RecentMarquee';
import { SectionHead } from '@/components/Heads';
import { SocialLinks } from '@/components/SocialLinks';
import { ScrollHint } from '@/components/ScrollHint';
import { StatusBadge, StatsLine } from '@/components/Trust';

export default async function Home() {
  const [{ links, works }, { intro }, status] = await Promise.all([
    getSiteData(),
    getPageSettings(),
    getStatusSettings(),
  ]);
  const stats = status.showStats ? computeStats(works) : null;
  return (
    <>
      <section className="hero hx-hero">
        <div className="wrap hx-hero-in">
          <div className="hx-id">
            <div className="hx-av">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={links.profileUrl || '/character.png'} alt="" />
            </div>
            <div className="hx-id-text">
              <small className="hr-eyebrow">{intro.eyebrow}</small>
              <h1>햄버거라네 <span>HamRanè</span></h1>
              <p className="hx-roles">
                {intro.roles}<i>/</i>
              </p>
              <Link className="hr-hero-cta" href="/pricing#process">
                의뢰가 처음이신가요? <b>진행 방식 보기</b> →
              </Link>
              {(status.state || stats) && (
                <div className="hr-trust">
                  <StatusBadge status={status} />
                  <StatsLine stats={stats} />
                </div>
              )}
            </div>
          </div>
          <SocialLinks links={links} />
        </div>
      </section>

      <section className="fx-sec" id="featured">
        <div className="wrap">
          <IndexReel />
        </div>
      </section>

      <section className="hx-recent" id="recent">
        <div className="wrap">
          <SectionHead n="01" title="Recent" sub="최근 작업물" href="/portfolio" link="포트폴리오 전체" />
        </div>
        <RecentMarquee />
      </section>

      <ScrollHint targetId="recent" />
    </>
  );
}
