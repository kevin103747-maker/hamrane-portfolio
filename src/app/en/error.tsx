// src/app/en/error.tsx — 영어 사이트의 오류 화면
'use client';
import Link from '@/components/LocaleLink';
import { dict } from '@/lib/dict';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const c = dict('en').error;
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>ERROR</b></div>
      <h1>{c.title}<span>ERROR</span></h1>
      <p>{c.body}</p>
      <div className="hr-lost">
        <button type="button" onClick={reset}>{c.retry}</button>
        <Link href="/">{c.home}</Link>
      </div>
    </div></section>
  );
}
