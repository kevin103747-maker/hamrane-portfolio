// src/app/global-not-found.tsx — 어떤 주소와도 맞지 않을 때 보이는 404. 언어를 알 수 없어 한국어·영어를 함께 적습니다.
import './globals.css';
import { RootShell } from '@/components/RootShell';
import { COPY } from '@/lib/copy';

export const metadata = { title: 'Not found — HamRanè' };

export default function GlobalNotFound() {
  return (
    <RootShell lang="ko">
      <section className="phead"><div className="wrap">
        <div className="crumb"><a href="/">HOME</a>/<b>404</b></div>
        <h1>{COPY.notFound.title}<span>404</span></h1>
        <p>{COPY.notFound.body}</p>
        <p>Page not found. The address may have changed, or the page may have been removed.</p>
        <div className="hr-lost">
          <a href="/">홈으로 · Home</a>
          <a href="/portfolio">포트폴리오 · Portfolio</a>
          <a href="/pricing">단가 안내 · Pricing</a>
        </div>
      </div></section>
    </RootShell>
  );
}
