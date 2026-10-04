// src/components/BundleBox.tsx — 묶음 할인 안내: 단계, 대상 분야, 제외 분야
import { bundleLabel, type BundleTier } from '@/lib/discounts';

export function BundleBox({ tiers, yes, no }: { tiers: BundleTier[]; yes: string[]; no: string[] }) {
  if (!tiers.length || !yes.length) return null;
  return (
    <section className="hr-bd" aria-label="묶음 할인 안내">
      <h4>여러 분야를 함께 의뢰하면 묶음 할인</h4>
      <ul className="hr-bd-tiers">
        {tiers.map((t) => (
          <li key={t.min}>
            <span>{bundleLabel(t).replace(/ -\d+%$/, '')}</span>
            <em>-{t.pct}%</em>
          </li>
        ))}
      </ul>
      <p><span className="lab">대상</span>{yes.join(', ')}</p>
      {no.length > 0 && <p className="no"><span className="lab">제외</span>{no.join(', ')}</p>}
      <small>
        대상 분야의 금액에만 적용되며, 제외 분야와 제외된 작업은 할인되지 않습니다. 수량 할인과는 함께 적용될 수 있고,
        이벤트 할인 중인 작업은 겹치지 않고 더 낮은 금액 하나만 적용됩니다. 최종 금액은 견적 시 확정됩니다.
      </small>
    </section>
  );
}
