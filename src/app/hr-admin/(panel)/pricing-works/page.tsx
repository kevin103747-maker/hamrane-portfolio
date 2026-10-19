// src/app/hr-admin/(panel)/pricing-works/page.tsx — 단가표 분야별 예시 작업물 고르기
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { Flash } from '@/components/admin/Section';
import { ScopeFeatured } from '@/components/admin/ScopeFeatured';
import { toPickWork, txt, type WorkRow } from '@/lib/featured';
import { PRICING_WORKS_MAX, parsePricingWorks } from '@/lib/pricing-works';
import { savePricingWorks } from './actions';

const BASE = '/hr-admin/pricing-works';

export default async function PricingWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { g = '', ok, err } = await searchParams;

  const db = adminDb();
  const [w, a, pg, p, r, s] = await Promise.all([
    db.from('works')
      .select('id, title, work_date, hidden, part_ids, main_part_id, artist_ids, youtube_id, thumb_url')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('artists').select('id, name'),
    db.from('part_groups').select('id, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('parts').select('id, group_id'),
    db.from('rate_items').select('group_id'),
    db.from('site_settings').select('value').eq('key', 'pricing_works').maybeSingle(),
  ]);

  // 단가표에 실제로 보이는 분야(단가 항목이 있는 분야)만 고를 수 있습니다.
  const used = new Set((r.data ?? []).map((x) => x.group_id as string));
  const groups = (pg.data ?? [])
    .filter((x) => used.has(x.id as string))
    .map((x) => ({ id: x.id as string, name: txt(x.name) }));
  const cur = groups.find((x) => x.id === g) ?? groups[0];

  if (!cur) {
    return (
      <div className="hr-pn-body">
        <h1>단가표 예시 작업물</h1>
        <p>단가 항목이 있는 분야가 아직 없습니다. 먼저 단가표에 항목을 추가하세요.</p>
      </div>
    );
  }

  const rows = (w.data ?? []) as WorkRow[];
  const artistMap = new Map<string, string>((a.data ?? []).map((x) => [x.id as string, x.name as string]));
  const saved = parsePricingWorks(s.data?.value);
  const curPartIds = new Set(
    (p.data ?? []).filter((x) => x.group_id === cur.id).map((x) => x.id as string),
  );

  const pick = rows.map((x) => ({
    ...toPickWork(x, (id) => artistMap.get(id) ?? ''),
    blocked: x.hidden
      ? '숨김 곡'
      : (x.part_ids ?? []).some((id) => curPartIds.has(id)) ? undefined : '이 분야 참여곡 아님',
  }));
  const exist = new Set(rows.map((x) => x.id));
  const initial = (saved[cur.id] ?? []).filter((id) => exist.has(id));

  return (
    <div className="hr-pn-body">
      <h1>단가표 예시 작업물</h1>
      <p>
        단가표에서 분야를 눌렀을 때 가격 아래에 보여줄 작업물을 분야별로 고릅니다. 포트폴리오의 &quot;분야별 대표곡&quot;과는
        따로 저장됩니다. 한 분야에 최대 {PRICING_WORKS_MAX}곡까지 고를 수 있고, 하나도 고르지 않은 분야는 그 분야의
        최신 곡이 자동으로 나옵니다. 사이트에서는 최신순으로 표시됩니다.
      </p>

      <Flash ok={ok} err={err} />

      <nav className="hr-sc-tabs" aria-label="분야 선택">
        {groups.map((x) => (
          <Link
            key={x.id}
            href={`${BASE}?g=${encodeURIComponent(x.id)}`}
            className={`hr-sc-chip${x.id === cur.id ? ' on' : ''}`}
            aria-current={x.id === cur.id ? 'page' : undefined}
          >
            {x.name}<b>{saved[x.id]?.length ?? 0}</b>
          </Link>
        ))}
      </nav>

      <form action={savePricingWorks} className="hr-card hr-f">
        <h2>{cur.name} 예시 작업물</h2>
        <input type="hidden" name="group" value={cur.id} />
        <ScopeFeatured key={cur.id} works={pick} initial={initial} />
      </form>
    </div>
  );
}
