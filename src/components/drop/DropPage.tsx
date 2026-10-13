// src/components/drop/DropPage.tsx — 무료 배포 페이지 본문. 공개 주소(/dl/...)와 어드민 미리보기가 같이 씁니다.
import Link from 'next/link';
import { fileUrl, fmtSize, saveName, type Drop } from '@/lib/drops';
import { DropTheme } from './DropTheme';

export function DropPage({ drop, notice }: { drop: Drop; notice?: string }) {
  const name = saveName(drop);
  const files = [
    { ext: 'mp3', label: 'MP3', note: '가볍고 어디서나 재생돼요', path: drop.mp3Path, size: drop.mp3Size },
    { ext: 'wav', label: 'WAV', note: '무손실 원본 음질 · 편집용', path: drop.wavPath, size: drop.wavSize },
  ];
  return (
    <div className="app">
      <header className="gnb">
        <div className="wrap">
          <Link className="logo" href="/" aria-label="HamRanè 홈">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lg lg-dark" src="/logo-on-dark.png" alt="" width={480} height={96} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lg lg-light" src="/logo-on-light.png" alt="" width={480} height={96} />
          </Link>
          <div className="dl-bar">
            <Link className="dl-btn ghost" href="/portfolio">포트폴리오</Link>
            <Link className="dl-btn" href="/">홈페이지 가기</Link>
            <DropTheme />
          </div>
        </div>
      </header>

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
            <h2>다운로드</h2>
            <div className="dl-files">
              {files.map((f) =>
                f.path ? (
                  <a key={f.ext} className="dl-file" href={fileUrl(f.path, `${name}.${f.ext}`)} download>
                    <span><b>{f.label}</b><small>{f.note}{f.size ? ` · ${fmtSize(f.size)}` : ''}</small></span>
                    <span className="go">받기 ↓</span>
                  </a>
                ) : (
                  <div key={f.ext} className="dl-file off">
                    <span><b>{f.label}</b><small>준비 중</small></span>
                  </div>
                ),
              )}
            </div>
            {drop.endsOn && <p className="dl-hint">{drop.endsOn}까지 받을 수 있어요.</p>}
            {drop.terms && (
              <div className="dl-terms">
                <h3>이용 안내</h3>
                <p>{drop.terms}</p>
              </div>
            )}
          </aside>
        </section>

        <section className="dl-about">
          <div>
            <h2>HamRanè</h2>
            <p>더 많은 작업물과 의뢰 안내는 홈페이지에서 볼 수 있어요.</p>
          </div>
          <div className="acts">
            <Link className="dl-btn solid" href="/portfolio">포트폴리오 보기</Link>
            <Link className="dl-btn ghost" href="/pricing">외주단가</Link>
            <Link className="dl-btn ghost" href="/guide">의뢰 가이드</Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>© 2026 HamRanè</span>
          <nav><Link href="/">Home</Link><Link href="/portfolio">Portfolio</Link></nav>
        </div>
      </footer>
    </div>
  );
}
