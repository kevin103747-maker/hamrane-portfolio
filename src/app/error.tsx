// src/app/error.tsx — 예기치 못한 오류가 났을 때 보이는 화면
'use client';
import Link from 'next/link';
import { COPY } from '@/lib/copy';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>ERROR</b></div>
      <h1>{COPY.error.title}<span>ERROR</span></h1>
      <p>{COPY.error.body}</p>
      <div className="hr-lost">
        <button type="button" onClick={reset}>{COPY.error.retry}</button>
        <Link href="/">홈으로</Link>
      </div>
    </div></section>
  );
}
