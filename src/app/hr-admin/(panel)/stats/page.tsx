// src/app/hr-admin/(panel)/stats/page.tsx — 방문 통계 (날짜별 방문 · 단가표 분야별 관심)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { OwnerToggle } from '@/components/admin/OwnerToggle';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

type Overview = {
  daily: { day: string; views: number; visitors: number }[];
  groups: { id: string; clicks: number; visitors: number }[];
  pages: { path: string; views: number }[];
  total_views: number;
  total_visitors: number;
};

const RANGES = [7, 30, 90] as const;
const PAGE_NAME: Record<string, string> = { '/': '홈', '/portfolio': '포트폴리오', '/pricing': '외주 단가', '/guide': '의뢰 가이드' };

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; own?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const sp = await searchParams;
  const n = RANGES.find((x) => String(x) === sp.d) ?? 30;
  const own = sp.own === '1';

  const db = adminDb();
  const [ov, g, r] = await Promise.all([
    db.rpc('stat_overview', { p_days: n, p_owner: own }),
    db.from('part_groups').select('id, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('rate_items').select('group_id'),
  ]);

  const head = (
    <>
      <h1>방문 통계</h1>
      <p className="hr-lead">
        날짜별 방문과, 단가표에서 어떤 분야를 눌러 봤는지 보여 줍니다. 실제 배포 주소에서의 방문만 기록되고,
        로컬 개발과 미리보기 배포는 기록되지 않습니다. 기록은 이 표를 만든 시점부터 쌓입니다.
      </p>
    </>
  );

  if (ov.error || !ov.data) {
    return (
      <div className="hr-pn-body">
        {head}
        <p role="alert" className="hr-flash bad">
          통계를 불러오지 못했습니다{ov.error ? `: ${ov.error.message}` : ''}. Supabase에서 통계용 SQL을 실행했는지 확인하세요.
        </p>
      </div>
    );
  }

  const o = ov.data as Overview;

  // 방문이 없는 날도 0으로 채워서 날짜가 끊기지 않게 합니다. (한국 시간 기준)
  const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const base = Date.parse(`${kst}T00:00:00Z`);
  const days = Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 864e5).toISOString().slice(0, 10));
  const byDay = new Map(o.daily.map((x) => [x.day, x]));
  const series = days.map((d) => ({ d, views: byDay.get(d)?.views ?? 0, visitors: byDay.get(d)?.visitors ?? 0 }));
  const peak = Math.max(0, ...series.map((s) => s.views));
  const scale = Math.max(1, peak);

  // 단가표에 실제로 보이는 분야만, 눌린 횟수가 많은 순서로 보여 줍니다.
  const used = new Set((r.data ?? []).map((x) => x.group_id as string));
  const clicks = new Map(o.groups.map((x) => [x.id, x]));
  const groupRows = (g.data ?? [])
    .filter((x) => used.has(x.id as string))
    .map((x) => ({
      name: txt(x.name) || (x.id as string),
      clicks: clicks.get(x.id as string)?.clicks ?? 0,
      visitors: clicks.get(x.id as string)?.visitors ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
  const maxClick = Math.max(1, ...groupRows.map((x) => x.clicks));

  const q = (d: number, withOwn: boolean) => `/hr-admin/stats?d=${d}${withOwn ? '&own=1' : ''}`;

  return (
    <div className="hr-pn-body">
      {head}

      <div className="hr-sx-bar">
        {RANGES.map((x) => (
          <Link key={x} href={q(x, own)} className={x === n ? 'on' : undefined}>최근 {x}일</Link>
        ))}
        <Link href={q(n, !own)} className={own ? 'on' : undefined}>
          {own ? '내 활동 포함해서 보는 중 (누르면 제외)' : '내 활동 제외하고 보는 중 (누르면 포함)'}
        </Link>
      </div>
      <OwnerToggle />

      <div className="hr-sx-cards">
        <div className="hr-sx-card"><small>페이지 조회수</small><b>{o.total_views.toLocaleString('ko-KR')}</b></div>
        <div className="hr-sx-card"><small>방문자 (브라우저 기준)</small><b>{o.total_visitors.toLocaleString('ko-KR')}</b></div>
        <div className="hr-sx-card"><small>하루 최고 조회수</small><b>{peak.toLocaleString('ko-KR')}</b></div>
      </div>

      <h2 className="hr-h2">날짜별 조회수</h2>
      <div className="hr-sx-chart" role="img" aria-label="날짜별 페이지 조회수">
        {series.map((s) => (
          <i
            key={s.d}
            title={`${s.d.slice(5)} · 조회 ${s.views} · 방문자 ${s.visitors}`}
            style={{ height: `${(s.views / scale) * 100}%` }}
          />
        ))}
      </div>
      <div className="hr-sx-axis"><span>{days[0].slice(5)}</span><span>{days[days.length - 1].slice(5)}</span></div>

      <table className="hr-tbl">
        <thead><tr><th>날짜</th><th>조회수</th><th>방문자</th></tr></thead>
        <tbody>
          {series.slice(-7).reverse().map((s) => (
            <tr key={s.d}><td>{s.d.slice(5)}</td><td>{s.views}</td><td>{s.visitors}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="hr-h2">단가표 분야별 관심</h2>
      <p className="hr-lead">
        분야 탭을 눌러서 바꾼 횟수입니다. 첫 번째 분야는 들어오면 자동으로 보이므로, 실제로 본 횟수는 이 숫자보다 많습니다.
      </p>
      {groupRows.length === 0 && <p>표시할 분야가 없습니다.</p>}
      {groupRows.map((x) => (
        <div key={x.name} className="hr-sx-row">
          <b>{x.name}</b>
          <span className="t"><i style={{ width: `${(x.clicks / maxClick) * 100}%` }} /></span>
          <em>{x.clicks}회 · {x.visitors}명</em>
        </div>
      ))}

      <h2 className="hr-h2">페이지별 조회수</h2>
      {o.pages.length === 0 && <p>아직 기록이 없습니다.</p>}
      {o.pages.map((x) => (
        <div key={x.path} className="hr-sx-row">
          <b>{PAGE_NAME[x.path] ?? x.path}</b>
          <span className="t"><i style={{ width: `${(x.views / Math.max(1, o.pages[0].views)) * 100}%` }} /></span>
          <em>{x.views}회</em>
        </div>
      ))}
    </div>
  );
}
