// src/components/GuideBlocks.tsx — 의뢰 가이드 페이지의 블록들(진행 단계, 안심 카드, 질문 목록)
import type { GuideAssure, GuideFaq, GuideStep } from '@/lib/guide';

export function StepList({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="hr-gp-steps">
      {steps.map((s, i) => (
        <li key={`${i}-${s.title}`}>
          <span className="hr-gp-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <b>{s.title}</b>
            <p>{s.desc}</p>
            {s.note && <span className="hr-gp-nt">{s.note}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AssureGrid({ items }: { items: GuideAssure[] }) {
  return (
    <ul className="hr-gp-assure">
      {items.map((a, i) => (
        <li key={`${i}-${a.title}`}>
          <i aria-hidden="true">✓</i>
          <b>{a.title}</b>
          <p>{a.desc}</p>
        </li>
      ))}
    </ul>
  );
}

export function QaList({ items }: { items: GuideFaq[] }) {
  return (
    <div className="hr-gp-qa">
      {items.map((q, i) => (
        <details key={`${i}-${q.q}`}>
          <summary>{q.q}</summary>
          <p>{q.a}</p>
        </details>
      ))}
    </div>
  );
}
