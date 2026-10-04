// src/components/admin/Section.tsx — 어드민 공용: 접이식 섹션 · 사용법 · 저장 안내
import type { ReactNode } from 'react';

export type Tone = 'work' | 'request' | 'price' | 'site';

export function Section({
  title, badge, hint, tone, open, id, children,
}: {
  title: ReactNode;
  badge?: string;
  hint?: ReactNode;
  tone?: Tone;
  open?: boolean;
  id?: string;
  children: ReactNode;
}) {
  return (
    <details id={id} className="hr-sec" data-tone={tone ?? 'price'} open={open}>
      <summary>
        <span className="hr-sec-t">{title}</span>
        {badge ? <em className="hr-sec-badge">{badge}</em> : null}
        {hint ? <small className="hr-sec-h">{hint}</small> : null}
        <svg className="hr-sec-chev" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="hr-sec-b">{children}</div>
    </details>
  );
}

export function Help({ title = '사용법', children }: { title?: string; children: ReactNode }) {
  return (
    <details className="hr-help">
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (err) return <p role="alert" className="hr-flash bad">{err}</p>;
  if (!ok) return null;
  return (
    <p role="status" className="hr-flash good">
      <b>저장했습니다.</b> 아직 공개 사이트에는 반영되지 않았습니다. 오른쪽 위 <b>사이트에 게시</b>를 눌러야 반영됩니다.
    </p>
  );
}
