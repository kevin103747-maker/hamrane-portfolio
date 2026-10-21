// src/components/HomeView.tsx — 홈 본문. 한국어(/)와 영어(/en)가 함께 씁니다.
import Link from '@/components/LocaleLink';
import { getSiteData } from '@/lib/site-data';
import { getPageSettings } from '@/lib/page-settings';
import { getStatusSettings } from '@/lib/status-settings';
import { getSocialOrder } from '@/lib/social-settings';
import { computeStats } from '@/lib/stats';
import { dict } from '@/lib/dict';
import { IndexReel } from '@/components/IndexReel';
import { RecentMarquee } from '@/components/RecentMarquee';
import { SectionHead } from '@/components/Heads';
import { SocialLinks } from '@/components/SocialLinks';
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

export async function HomeView({ lang = 'ko' }: { lang?: string }) {
  const h = dict(lang).home;
  const [{ links, works }, { intro }, status, socialOrder] = await Promise.all([
    getSiteData(),
    getPageSettings(),
    getStatusSettings(),
    getSocialOrder(),
  ]);
  const stats = status.showStats ? computeStats(works) : null;
  // 직업 줄은 한국어에서는 어드민 값, 영어에서는 고정 문구를 씁니다. (영어 입력칸은 다음 단계에서 만듭니다.)
  const roles = lang === 'ko' ? intro.roles : h.roles;
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
              <h1>{h.name}{h.nameSub && <>{' '}<span>{h.nameSub}</span></>}</h1>
              <p className="hx-roles">
                {roles}<i>/</i>
              </p>

              <div className="hr-cta-links">
                <Link className="hr-hero-cta" href="/guide">
                  {h.firstQ} <b>{h.firstGo}</b> →
                </Link>
                <Link className="hr-cta-mini first" href="/pricing">{h.pricing}</Link>
                <a className="hr-cta-mini" href="#contact">{dict(lang).common.askMe}</a>
              </div>

              {(status.state || stats) && (
                <div className="hr-trust">
                  <StatusBadge status={status} lang={lang} />
                  <StatsLine stats={stats} lang={lang} />
                </div>
              )}
            </div>
          </div>
          <SocialLinks links={links} order={socialOrder} lang={lang} />
        </div>
      </section>

      <section className="fx-sec" id="featured">
        <div className="wrap">
          <IndexReel />
        </div>
      </section>

      <section className="hx-recent" id="recent" data-scroll-next>
        <div className="wrap">
          <SectionHead n="01" title="Recent" sub={h.recentSub} href="/portfolio" link={h.recentLink} />
        </div>
        <RecentMarquee />
      </section>

    </>
  );
}
