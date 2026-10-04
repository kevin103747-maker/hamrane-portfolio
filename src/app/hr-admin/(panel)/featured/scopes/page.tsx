// src/app/hr-admin/(panel)/featured/scopes/page.tsx — 포트폴리오 분야별 대표곡
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { saveScopeFeatured } from '../../actions';
import { ScopeFeatured } from '@/components/admin/ScopeFeatured';
import { toPickWork, txt, type WorkRow } from '@/lib/featured';

type Row = WorkRow & { feat: { default?: string; groups?: string[]; parts?: string[] } | null };
const BASE = '/hr-admin/featured/scopes';

export default async function ScopesPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'works')) redirect('/hr-admin');
  const { s = 'all', ok, err } = await searchParams;

  const db = adminDb();
  const [w, a, g, p] = await Promise.all([
    db.from('works')
      .select('id, title, work_date, hidden, part_ids, main_part_id, artist_ids, youtube_id, thumb_url, feat')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('artists').select('id, name'),
    db.from('part_groups').select('id, name').order('sort', { ascending: true }),
    db.from('parts').select('id, group_id, name').order('sort', { ascending: true }),
  ]);

  const rows = (w.data ?? []) as Row[];
  const artistMap = new Map<string, string>((a.data ?? []).map((x) => [x.id as string, x.name as string]));
  const groups = (g.data ?? []).map((x) => ({ id: x.id as string, name: txt(x.name) }));
  const parts = (p.data ?? []).map((x) => ({ id: x.id as string, groupId: x.group_id as string, name: txt(x.name) }));

  // 현재 범위 해석: all | g:분야id | p:파트id (잘못된 값이면 전체)
  const curPart = s.startsWith('p:') ? parts.find((x) => x.id === s.slice(2)) : undefined;
  const curGroup = curPart
    ? groups.find((x) => x.id === curPart.groupId)
    : s.startsWith('g:') ? groups.find((x) => x.id === s.slice(2)) : undefined;
  const scope = curPart ? `p:${curPart.id}` : curGroup ? `g:${curGroup.id}` : 'all';
  const scopeName = curPart ? `${curGroup?.name ?? ''} · ${curPart.name}` : curGroup ? `${curGroup.name} 전체` : '전체 탭';

  const has = (x: Row, key: string) =>
    key === 'all' ? !!x.feat?.default
      : key.startsWith('g:') ? !!x.feat?.groups?.includes(key.slice(2))
      : !!x.feat?.parts?.includes(key.slice(2));
  const count = (key: string) => rows.filter((x) => has(x, key)).length;

  const groupPartIds = new Set(parts.filter((x) => x.groupId === curGroup?.id).map((x) => x.id));
  const blockedOf = (x: Row): string | undefined => {
    if (x.hidden) return '숨김 곡';
    const own = x.part_ids ?? [];
    if (scope === 'all') return own.length ? undefined : '참여 파트 없음';
    if (curPart) return own.includes(curPart.id) ? undefined : '이 파트 참여곡 아님';
    return own.some((id) => groupPartIds.has(id)) ? undefined : '이 분야 참여곡 아님';
  };

  const pick = rows.map((x) => ({ ...toPickWork(x, (id) => artistMap.get(id) ?? ''), blocked: blockedOf(x) }));
  const initial = rows.filter((x) => has(x, scope)).map((x) => x.id);

  const chip = (key: string, label: string) => (
    <Link
      key={key}
      href={`${BASE}?s=${encodeURIComponent(key)}`}
      className={`hr-sc-chip${key === scope ? ' on' : ''}`}
      aria-current={key === scope ? 'page' : undefined}
    >
      {label}<b>{count(key)}</b>
    </Link>
  );

  return (
    <div className="hr-pn-body">
      <h1>분야별 대표곡</h1>
      <p>
        포트폴리오 페이지 맨 위 &quot;대표작&quot; 영역에 나올 곡입니다. 위에서 범위를 고른 뒤, 곡을 검색해서 추가하세요.
        사이트에서는 최신순으로 표시됩니다. 곡마다 따로 열어서 지정하지 않아도 됩니다.
      </p>

      {ok && <p role="status">{ok === '0' ? '변경된 내용이 없습니다.' : `저장했습니다 (${ok}곡 변경). 공개 사이트에는 상단의 "게시" 버튼을 눌러야 반영됩니다.`}</p>}
      {err && <p role="alert">{err}</p>}

      <nav className="hr-sc-tabs" aria-label="대표곡 범위">
        {chip('all', '전체')}
        {groups.map((x) => chip(`g:${x.id}`, x.name))}
      </nav>
      {curGroup && (
        <nav className="hr-sc-tabs sub" aria-label={`${curGroup.name} 세부 범위`}>
          {chip(`g:${curGroup.id}`, '분야 전체')}
          {parts.filter((x) => x.groupId === curGroup.id).map((x) => chip(`p:${x.id}`, x.name))}
        </nav>
      )}

      <form action={saveScopeFeatured} className="hr-card hr-f">
        <h2>{scopeName} 대표곡</h2>
        <input type="hidden" name="scope" value={scope} />
        <ScopeFeatured key={scope} works={pick} initial={initial} />
      </form>
    </div>
  );
}
