// src/components/Trust.tsx — 의뢰 상태 배지와 작업 현황 한 줄. 값이 없으면 아무것도 그리지 않습니다.
import { STATUS_LABEL, type StatusSettings } from '@/lib/status';
import type { Stats } from '@/lib/stats';
import { Ago } from './Ago';

export function StatusBadge({ status }: { status: StatusSettings }) {
  if (!status.state) return null;
  return (
    <div className={`hr-st hr-st-${status.state}`}>
      <span className="hr-st-pill"><i aria-hidden="true" />현재 {STATUS_LABEL[status.state]}</span>
      {status.note && <span className="hr-st-note">{status.note}</span>}
    </div>
  );
}

/** 숫자가 0에서 올라가는 효과(CSS). 실제 숫자는 화면 밖 글자로 함께 들어 있어 읽기 도구에도 전달됩니다. */
function Count({ n }: { n: number }) {
  return (
    <b className="hr-cnt" style={{ '--to': n } as React.CSSProperties}>
      <span className="hr-cnt-real">{n}</span>
    </b>
  );
}

export function StatsLine({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  return (
    <ul className="hr-stats" aria-label="작업 현황">
      <li>누적 작업 <Count n={stats.works} />곡</li>
      <li>함께한 아티스트 <Count n={stats.artists} />명</li>
      {stats.latest && <li>최근 작업 <b><Ago date={stats.latest} /></b></li>}
    </ul>
  );
}
