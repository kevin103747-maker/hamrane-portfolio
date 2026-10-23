// src/components/drop/DropPage.tsx — 무료 배포 페이지 본문. 공개 주소(/dl/..., /en/dl/...)와 어드민 미리보기가 같이 씁니다.
import Link from 'next/link';
import { dropFor, fileUrl, fmtSize, type Drop } from '@/lib/drops';
import { dict } from '@/lib/dict';
import { localePath } from '@/lib/i18n';
import { DropTheme } from './DropTheme';
import { DropTracker } from './DropTracker';

export function DropPage({ drop: raw, notice, tracked, lang = 'ko' }: {
  drop: Drop; notice?: string; tracked?: boolean; lang?: 'ko' | 'en';
}) {
  const drop = dropFor(raw, lang);
  const L = dict(lang).drop;
  const to = (p: string) => localePath(lang, p);
  const files = [
    { ext: 'mp3', label: 'MP3', note: L.mp3Note, path: drop.mp3Path, size: drop.mp3Size },
    { ext: 'wav', label: 'WAV', note: L.wavNote, path: drop.wavPath, size: drop.wavSize },
  ];
  return (
    <div className="app">
      <header className="gnb">
        <div className="wrap">
          <Link className="logo" href={to('/')} aria-label={L.logo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lg lg-dark" src="/logo-on-dark.png" alt="" width={480} height={96} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lg lg-light" src="/logo-on-light.png" alt="" width={480} height={96} />
          </Link>
          <div className="dl-bar">
            <Link className="dl-btn ghost" href={to('/portfolio')}>{L.portfolio}</Link>
            <Link className="dl-btn" href={to('/')}>{L.home}</Link>
            <DropTheme label={L.theme} />
          </div>
        </div>
      </header>
      {tracked && <DropTracker slug={drop.slug} />}
      {notice && <div className="dl-preview" role="status">{notice}</div>}

      <main className="wrap">
        <section className="dl-hero">
          <div className="eyebrow">FREE BGM · EVENT</div>
          <h1>{drop.title}</h1>
          {drop.subtitle && <p className="dl-sub">{drop.subtitle}</p>}
        </section>

        <section className="dl-grid">
          <div>
            {drop.youtubeId ? (
              <div className="dl-player">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${drop.youtubeId}?rel=0`}
                  title={drop.title}
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <div className="dl-player" />
            )}
            {drop.description && <p className="dl-desc">{drop.description}</p>}
          </div>

          <aside className="dl-card">
            <h2>{L.download}</h2>
            <div className="dl-files">
              {files.map((f) =>
                f.path ? (
                  <a key={f.ext} className="dl-file" data-dl={f.ext} href={tracked ? `/dl/${drop.slug}/get/${f.ext}` : fileUrl(f.path)}>
                    <span><b>{f.label}</b><small>{f.note}{f.size ? ` · ${fmtSize(f.size)}` : ''}</small></span>
                    <span className="go">{L.get}</span>
                  </a>
                ) : (
                  <div key={f.ext} className="dl-file off">
                    <span><b>{f.label}</b><small>{L.soon}</small></span>
                  </div>
                ),
              )}
            </div>
            {drop.endsOn && <p className="dl-hint">{L.untilPre}{drop.endsOn}{L.untilPost}</p>}
            {drop.terms && (
              <div className="dl-terms">
                <h3>{L.terms}</h3>
                <p>{drop.terms}</p>
              </div>
            )}
          </aside>
        </section>

        <section className="dl-about">
          <div>
            <h2>HamRanè</h2>
            <p>{L.aboutText}</p>
          </div>
          <div className="acts">
            <Link className="dl-btn solid" href={to('/portfolio')}>{L.viewPortfolio}</Link>
            <Link className="dl-btn ghost" href={to('/pricing')}>{L.rates}</Link>
            <Link className="dl-btn ghost" href={to('/guide')}>{L.guide}</Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>© 2026 HamRanè</span>
          <nav><Link href={to('/')}>Home</Link><Link href={to('/portfolio')}>Portfolio</Link></nav>
        </div>
      </footer>
    </div>
  );
}
