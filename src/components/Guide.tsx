// src/components/Guide.tsx — 의뢰 안내(처음 의뢰 문구, 진행 순서, 자주 묻는 질문). 값이 비어 있으면 표시하지 않습니다.
import type { GuideFaq, GuideSettings, GuideStep } from '@/lib/guide';

export function FirstTimeNote({ data }: { data: GuideSettings['firstTime'] }) {
  if (!data.title && !data.body) return null;
  return (
    <div className="hr-gd-first">
      {data.title && <b>{data.title}</b>}
      {data.body && <p>{data.body}</p>}
    </div>
  );
}

export function ProcessSteps({ steps }: { steps: GuideStep[] }) {
  if (!steps.length) return null;
  return (
    <section className="hr-gd-steps-wrap" id="process" aria-label="의뢰 진행 순서">
      <div className="hr-gd-label">의뢰는 이렇게 진행됩니다</div>
      <ol className="hr-gd-steps">
        {steps.map((s, i) => (
          <li key={`${i}-${s.title}`}>
            <span className="hr-gd-no">{String(i + 1).padStart(2, '0')}</span>
            <b>{s.title}</b>
            <p>{s.desc}</p>
            {s.note && <span className="nt">{s.note}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FaqList({ faq }: { faq: GuideFaq[] }) {
  if (!faq.length) return null;
  return (
    <div className="hr-gd-faq">
      {faq.map((f, i) => (
        <details key={`${i}-${f.q}`}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
