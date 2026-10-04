// src/components/Guide.tsx — 자주 묻는 질문(의뢰 진행 순서 포함). 값이 비어 있으면 표시하지 않습니다.
import type { GuideFaq, GuideSettings, GuideStep } from '@/lib/guide';

function Chev() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 한 줄로 접혀 있다가 펼치면 [의뢰 진행 순서] + 질문 목록이 나옵니다. */
export function FaqList({
  faq, steps = [], first,
}: {
  faq: GuideFaq[];
  steps?: GuideStep[];
  first?: GuideSettings['firstTime'];
}) {
  const f = first && (first.title || first.body) ? first : null;
  const hasProcess = steps.length > 0 || !!f;
  const count = faq.length + (hasProcess ? 1 : 0);
  if (!count) return null;

  const processTitle = steps.length > 0 ? '의뢰는 이렇게 진행됩니다' : f?.title || '처음 의뢰하시나요?';

  return (
    <details className="hr-tg hr-faq">
      <summary>
        <span className="hr-tg-t">자주 묻는 질문</span>
        <span className="hr-tg-n">{count}</span>
        {hasProcess && <span className="hr-tg-s">의뢰 진행 순서 포함</span>}
        <span className="hr-tg-act"><span className="c">펼치기</span><span className="o">접기</span><Chev /></span>
      </summary>

      <div className="hr-gd-faq hr-faq-list">
        {hasProcess && (
          <details id="process">
            <summary>{processTitle}</summary>
            <div className="hr-faq-steps">
              {f?.body && <p className="hr-pr-first">{f.body}</p>}
              {steps.length > 0 && (
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
              )}
            </div>
          </details>
        )}

        {faq.map((q, i) => (
          <details key={`${i}-${q.q}`}>
            <summary>{q.q}</summary>
            <p>{q.a}</p>
          </details>
        ))}
      </div>
    </details>
  );
}
