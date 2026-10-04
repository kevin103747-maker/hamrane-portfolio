// src/components/Trust.tsx — 의뢰 상태 배지와 작업 현황 한 줄. 값이 없으면 아무것도 그리지 않습니다.
import { STATUS_LABEL, type StatusSettings } from '@/lib/status';
import type { Stats } from '@/lib/stats';

export function StatusBadge({ status }: { status: StatusSettings }) {
  if (!status.state) return null;
  const d = status.updatedAt.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return (
    <div className={`hr-st hr-st-${status.state}`}>
      <span className="hr-st-pill"><i aria-hidden="true" />{STATUS_LABEL[status.state]}</span>
      {status.note && <span className="hr-st-note">{status.note}</span>}
      {d && <span className="hr-st-date">{d[1]}.{d[2]} 기준</span>}
    </div>
  );
}

export function StatsLine({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  return (
    <ul className="hr-stats" aria-label="작업 현황">
      <li>누적 작업 <b>{stats.works.toLocaleString('ko-KR')}</b>곡</li>
      <li>함께한 아티스트 <b>{stats.artists.toLocaleString('ko-KR')}</b>명</li>
      {stats.latest && <li>최근 작업 <b>{stats.latest}</b></li>}
    </ul>
  );
}
