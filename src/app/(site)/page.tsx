// src/app/(site)/page.tsx
import { getSiteData } from '@/lib/site-data';
import { IndexReel } from '@/components/IndexReel';
import { RecentMarquee } from '@/components/RecentMarquee';
import { SectionHead } from '@/components/Heads';
import { SocialLinks } from '@/components/SocialLinks';
import { ScrollHint } from '@/components/ScrollHint';

export default async function Home() {
  const { links } = await getSiteData();
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
              <small className="hr-eyebrow">COMPOSER {'&'} MUSIC PRODUCER</small>
              <h1>햄버거라네 <span>HamRanè</span></h1>
              <p className="hx-roles">
                작곡 · 편곡 · 믹싱 · 마스터링<i>/</i>
              </p>
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
