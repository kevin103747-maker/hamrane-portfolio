// src/components/Trust.tsx — 의뢰 상태 배지와 작업 현황 한 줄. 값이 없으면 아무것도 그리지 않습니다.
import type { StatusSettings } from '@/lib/status';
import type { Stats } from '@/lib/stats';
import { dict } from '@/lib/dict';
import { Ago } from './Ago';
import { Scramble } from './Scramble';

export function StatusBadge({ status, lang = 'ko' }: { status: StatusSettings; lang?: string }) {
  if (!status.state) return null;
  const c = dict(lang).status;
  return (
    <div className={`hr-st hr-st-${status.state}`}>
      <span className="hr-st-pill"><i aria-hidden="true" />{c.prefix}{c.label[status.state]}</span>
      {/* 메모는 한국어로만 입력되어 있어서, 영어 입력칸이 생기기 전에는 영어 화면에서 숨깁니다. */}
      {status.note && lang === 'ko' && <span className="hr-st-note">{status.note}</span>}
    </div>
  );
}

export function StatsLine({ stats, lang = 'ko' }: { stats: Stats | null; lang?: string }) {
  if (!stats) return null;
  const c = dict(lang).stats;
  return (
    <ul className="hr-wk" aria-label={c.aria}>
      <li>{c.works} <b><Scramble text={stats.works.toLocaleString(c.numLocale)} /></b>{c.worksUnit}</li>
      <li>{c.artists} <b><Scramble text={stats.artists.toLocaleString(c.numLocale)} delay={150} /></b>{c.artistsUnit}</li>
      {stats.latest && <li>{c.latest} <b><Ago date={stats.latest} delay={300} /></b></li>}
    </ul>
  );
}
