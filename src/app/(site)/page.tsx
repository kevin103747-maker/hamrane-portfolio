// src/app/(site)/page.tsx
import Link from 'next/link';
import { getSiteData } from '@/lib/site-data';
import { getPageSettings } from '@/lib/page-settings';
import { getStatusSettings } from '@/lib/status-settings';
import { getSocialOrder } from '@/lib/social-settings';
import { computeStats } from '@/lib/stats';
import { IndexReel } from '@/components/IndexReel';
import { RecentMarquee } from '@/components/RecentMarquee';
import { SectionHead } from '@/components/Heads';
import { SocialLinks } from '@/components/SocialLinks';
import { ScrollHint } from '@/components/ScrollHint';
import { StatusBadge, StatsLine } from '@/components/Trust';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hamrane-portfolio.vercel.app';

/** 검색 엔진용 구조화 데이터. 화면에는 나타나지 않으며, 실제 정보만 담습니다. */
function personJsonLd(links: Record<string, unknown>, jobTitle: string) {
  const sameAs = [links.youtube, links.youtube2, links.soop, links.chzzk, links.x, links.instagram, links.tiktok]
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u));
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: '햄버거라네',
    alternateName: ['HamRanè', 'HamRane', '햄라네'],
    jobTitle,
    url: SITE_URL,
    sameAs,
  };
}

export default async function Home() {
  const [{ links, works }, { intro }, status, socialOrder] = await Promise.all([
    getSiteData(),
    getPageSettings(),
    getStatusSettings(),
    getSocialOrder(),
  ]);
  const stats = status.showStats ? computeStats(works) : null;
  return (
    <>
          <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd(links as unknown as Record<string, unknown>, intro.eyebrow)).replace(/</g, '\\u003c'),
        }}
      />
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
              <Link className="hr-hero-cta" href="/guide">
                의뢰가 처음이신가요? <b>의뢰 가이드 보기</b> →
              </Link>

              {(status.state || stats) && (
                <div className="hr-trust">
                  <StatusBadge status={status} />
                  <StatsLine stats={stats} />
                </div>
              )}
            </div>
          </div>
          <SocialLinks links={links} order={socialOrder} />
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
