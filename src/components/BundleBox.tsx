// src/components/BundleBox.tsx — 묶음 할인 안내: 단계, 대상 분야, 제외 분야
import type { BundleTier } from '@/lib/discounts';
import { dict, fill } from '@/lib/dict';

export function BundleBox({ tiers, yes, no, lang = 'ko' }: { tiers: BundleTier[]; yes: string[]; no: string[]; lang?: string }) {
  const B = dict(lang).bundle;
  if (!tiers.length || !yes.length) return null;
  return (
    <section className="hr-bd" aria-label={B.aria}>
      <h4>{B.title}</h4>
      <ul className="hr-bd-tiers">
        {tiers.map((t) => (
          <li key={t.min}>
            <span>{fill(B.tier, { min: t.min })}</span>
            <em>-{t.pct}%</em>
          </li>
        ))}
      </ul>
      <p><span className="lab">{B.yes}</span>{yes.join(', ')}</p>
      {no.length > 0 && <p className="no"><span className="lab">{B.no}</span>{no.join(', ')}</p>}
      <small>{B.note}</small>
    </section>
  );
}
