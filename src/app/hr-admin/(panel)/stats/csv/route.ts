// src/app/hr-admin/(panel)/stats/csv/route.ts — 통계 CSV 내려받기
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';

const RANGES = [7, 30, 90];

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

// 엑셀에서 수식으로 읽히지 않도록 앞에 ' 를 붙이고, 따옴표를 이스케이프합니다.
const cell = (v: unknown): string => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const line = (...c: unknown[]) => c.map(cell).join(',');

type Overview = {
  daily: { day: string; views: number; visitors: number }[];
  groups: { id: string; clicks: number; visitors: number }[];
  pages: { path: string; views: number }[];
};
type Extra = {
  devices: { d: string; views: number; visitors: number }[];
  refs: { ref: string; sessions: number; visitors: number }[];
  clicks: { label: string; clicks: number; visitors: number }[];
};

export async function GET(req: Request) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) return new Response('forbidden', { status: 403 });

  const url = new URL(req.url);
  const n = RANGES.find((x) => String(x) === url.searchParams.get('d')) ?? 30;
  const own = url.searchParams.get('own') === '1';
  const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

  const db = adminDb();
  const [ov, ex, g] = await Promise.all([
    db.rpc('stat_overview', { p_days: n, p_owner: own }),
    db.rpc('stat_extra', { p_days: n, p_owner: own }),
    db.from('part_groups').select('id, name'),
  ]);
  if (ov.error || !ov.data) return new Response('통계를 불러오지 못했습니다.', { status: 500 });

  const o = ov.data as Overview;
  const e = ex.error ? null : (ex.data as Extra | null);
  const names = new Map((g.data ?? []).map((x) => [x.id as string, txt(x.name) || (x.id as string)]));

  const base = Date.parse(`${kst}T00:00:00Z`);
  const days = Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 864e5).toISOString().slice(0, 10));
  const byDay = new Map(o.daily.map((x) => [x.day, x]));

  const out: string[] = [];
  out.push(line('기간', `최근 ${n}일 (${days[0]} ~ ${days[days.length - 1]})`, own ? '내 활동 포함' : '내 활동 제외'));
  out.push('');
  out.push(line('날짜', '조회수', '방문자'));
  for (const d of days) out.push(line(d, byDay.get(d)?.views ?? 0, byDay.get(d)?.visitors ?? 0));

  out.push('');
  out.push(line('페이지', '조회수'));
  for (const p of o.pages) out.push(line(p.path, p.views));

  out.push('');
  out.push(line('단가표 분야', '탭 클릭수', '방문자'));
  for (const x of o.groups) out.push(line(names.get(x.id) ?? x.id, x.clicks, x.visitors));

  if (e) {
    out.push('');
    out.push(line('기기', '조회수', '방문자'));
    for (const x of e.devices) out.push(line(x.d === 'm' ? '모바일' : x.d === 'd' ? 'PC' : '구분 전', x.views, x.visitors));

    out.push('');
    out.push(line('유입 경로', '횟수', '방문자'));
    for (const x of e.refs) out.push(line(x.ref, x.sessions, x.visitors));

    out.push('');
    out.push(line('클릭 항목', '클릭수', '방문자'));
    for (const x of e.clicks) out.push(line(x.label, x.clicks, x.visitors));
  }

  return new Response('\uFEFF' + out.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="hamrane-stats-${kst}-${n}d.csv"`,
      'cache-control': 'no-store',
    },
  });
}
