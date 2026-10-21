// src/app/not-found.tsx
import Link from 'next/link';
import { COPY } from '@/lib/copy';

export default function NotFound() {
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>404</b></div>
      <h1>{COPY.notFound.title}<span>404</span></h1>
      <p>{COPY.notFound.body}</p>
      <div className="hr-lost">
        <Link href="/">홈으로</Link>
        <Link href="/portfolio">포트폴리오</Link>
        <Link href="/pricing">단가 안내</Link>
      </div>
    </div></section>
  );
}
