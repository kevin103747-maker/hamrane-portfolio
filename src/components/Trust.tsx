// src/components/Trust.tsx — 의뢰 상태 배지와 작업 현황 한 줄. 값이 없으면 아무것도 그리지 않습니다.
import { STATUS_LABEL, type StatusSettings } from '@/lib/status';
import type { Stats } from '@/lib/stats';
import { Ago } from './Ago';
import { Scramble } from './Scramble';

export function StatusBadge({ status }: { status: StatusSettings }) {
  if (!status.state) return null;
  return (
    <div className={`hr-st hr-st-${status.state}`}>
      <span className="hr-st-pill"><i aria-hidden="true" />현재 {STATUS_LABEL[status.state]}</span>
      {status.note && <span className="hr-st-note">{status.note}</span>}
    </div>
  );
}

export function StatsLine({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  return (
    <ul className="hr-stats" aria-label="작업 현황">
      <li>누적 작업 <b><Scramble text={stats.works.toLocaleString('ko-KR')} /></b>곡</li>
      <li>함께한 아티스트 <b><Scramble text={stats.artists.toLocaleString('ko-KR')} delay={150} /></b>명</li>
      {stats.latest && <li>최근 작업 <b><Ago date={stats.latest} delay={300} /></b></li>}
    </ul>
  );
}
