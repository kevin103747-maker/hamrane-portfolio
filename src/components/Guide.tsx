// src/components/Guide.tsx — 의뢰 안내(처음 의뢰 문구, 진행 순서, 자주 묻는 질문)
import { FIRST_TIME, STEPS, FAQ } from '@/lib/guide';

export function FirstTimeNote() {
  return (
    <div className="hr-gd-first">
      <b>{FIRST_TIME.title}</b>
      <p>{FIRST_TIME.body}</p>
    </div>
  );
}

export function ProcessSteps() {
  return (
    <section className="hr-gd-steps-wrap" id="process" aria-label="의뢰 진행 순서">
      <div className="hr-gd-label">의뢰는 이렇게 진행됩니다</div>
      <ol className="hr-gd-steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
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

export function FaqList() {
  return (
    <div className="hr-gd-faq">
      {FAQ.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
