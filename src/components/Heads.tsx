// src/components/Heads.tsx
import Link from 'next/link';
import { Icon } from './Icons';

export function PageHead({ crumb, title, en, desc }: { crumb: string; title: string; en: string; desc: string }) {
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>{crumb}</b></div>
      <h1>{title}<span>{en}</span></h1>
      <p>{desc}</p>
    </div></section>
  );
}

export function SectionHead({ n, title, sub, href, link }: { n: string; title: string; sub?: string; href?: string; link?: string }) {
  return (
    <div className="sh">
      <div><span className="n">{n}</span><h2>{title}{sub && <span>{sub}</span>}</h2></div>
      {href && <Link className="lk" href={href}>{link} <Icon name="arrow" /></Link>}
    </div>
  );
}
