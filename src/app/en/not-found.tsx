// src/app/en/not-found.tsx — 영어 사이트 안에서 notFound()가 불렸을 때의 404
import Link from '@/components/LocaleLink';
import { dict } from '@/lib/dict';

export default function NotFound() {
  const c = dict('en').notFound;
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>404</b></div>
      <h1>{c.title}<span>404</span></h1>
      <p>{c.body}</p>
      <div className="hr-lost">
        <Link href="/">{c.home}</Link>
        <Link href="/portfolio">{c.portfolio}</Link>
        <Link href="/pricing">{c.pricing}</Link>
      </div>
    </div></section>
  );
}
