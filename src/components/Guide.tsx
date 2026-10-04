// src/components/Guide.tsx — 의뢰 안내(처음 의뢰 문구, 진행 순서, 자주 묻는 질문). 값이 비어 있으면 표시하지 않습니다.
import type { GuideFaq, GuideSettings, GuideStep } from '@/lib/guide';

function Chev() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FirstTimeNote({ data }: { data: GuideSettings['firstTime'] }) {
  if (!data.title && !data.body) return null;
  return (
    <div className="hr-gd-first">
      {data.title && <b>{data.title}</b>}
      {data.body && <p>{data.body}</p>}
    </div>
  );
}

/** 평소에는 한 줄로 접혀 있고, 눌러서 펼치고 다시 접을 수 있습니다. */
export function ProcessSteps({ steps, first }: { steps: GuideStep[]; first?: GuideSettings['firstTime'] }) {
  if (!steps.length) return null;
  const f = first && (first.title || first.body) ? first : null;
  return (
    <details className="hr-tg hr-pr" id="process">
      <summary>
        <span className="hr-tg-t">의뢰 진행 순서</span>
        <span className="hr-tg-s">{f?.title || '처음이시라면 확인해 보세요'}</span>
        <span className="hr-tg-act"><span className="c">보기</span><span className="o">접기</span><Chev /></span>
      </summary>
      <div className="hr-tg-b">
        {f?.body && <p className="hr-pr-first">{f.body}</p>}
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
      </div>
    </details>
  );
}

/** 접힌 한 줄로 시작하고, 펼치면 질문 목록이 나옵니다. */
export function FaqList({ faq }: { faq: GuideFaq[] }) {
  if (!faq.length) return null;
  return (
    <details className="hr-tg hr-faq">
      <summary>
        <span className="hr-tg-t">자주 묻는 질문</span>
        <span className="hr-tg-n">{faq.length}</span>
        <span className="hr-tg-act"><span className="c">펼치기</span><span className="o">접기</span><Chev /></span>
      </summary>
      <div className="hr-gd-faq hr-faq-list">
        {faq.map((f, i) => (
          <details key={`${i}-${f.q}`}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </details>
  );
}
