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
import { parseTracks } from '@/lib/tracks';
import { PRICING_MIXER_MAX, parsePricingMixer } from '@/lib/pricing-mixer';
import { savePricingWorks, savePricingMixer } from './actions';


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
  const [w, a, pg, p, r, s, m] = await Promise.all([
    db.from('works')
      .select('id, title, work_date, hidden, part_ids, main_part_id, artist_ids, youtube_id, thumb_url, tracks')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('artists').select('id, name'),
    db.from('part_groups').select('id, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('parts').select('id, group_id'),
    db.from('rate_items').select('group_id'),
    db.from('site_settings').select('value').eq('key', 'pricing_works').maybeSingle(),
    db.from('site_settings').select('value').eq('key', 'pricing_mixer').maybeSingle(),
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

  const rows = (w.data ?? []) as (WorkRow & { tracks?: unknown })[];
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
  const mx = parsePricingMixer(m.data?.value)[cur.id];
  const mixSet = new Set(mx?.ids ?? []);
  const mixCands = rows.filter(
    (x) => !x.hidden && (x.part_ids ?? []).some((id) => curPartIds.has(id)) && parseTracks(x.tracks).length > 1,
  );


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
      <form key={`mx-${cur.id}`} action={savePricingMixer} className="hr-card hr-f">
        <h2>{cur.name} 트랙 분리 듣기</h2>
        <p className="hr-adm-sub">
          곡 입력 화면에서 트랙(2~6개)을 넣어 둔 곡 중에서 고릅니다. 이 분야에 참여한 공개 곡만 보입니다. 한 분야에 최대 {PRICING_MIXER_MAX}곡까지 고를 수 있고, 저장한 뒤 사이트에 게시해야 반영됩니다.
        </p>
        <input type="hidden" name="group" value={cur.id} />
        <label className="hr-chk">
          <input type="checkbox" name="on" defaultChecked={mx?.on ?? false} />
          이 분야 단가표에 트랙 분리 듣기를 보여줍니다
        </label>
        <label>
          듣기 방식
          <select name="mode" defaultValue={mx?.mode ?? 'mix'}>
            <option value="mix">섞어 듣기 (트랙 켜고 끄기, 솔로)</option>
            <option value="ab">하나씩 듣기 (Before/After 비교)</option>
          </select>
        </label>
        {mixCands.length === 0 ? (
          <p className="hr-adm-sub">이 분야에서 트랙이 2개 이상 들어 있는 곡이 아직 없습니다. 곡 관리에서 트랙을 먼저 넣어 주세요.</p>
        ) : (
          mixCands.map((x) => (
            <label key={x.id} className="hr-chk">
              <input type="checkbox" name="mixWork" value={x.id} defaultChecked={mixSet.has(x.id)} />
              {x.title} <small>트랙 {parseTracks(x.tracks).length}개</small>
            </label>
          ))
        )}
        <div className="hr-row">
          <button type="submit" className="hr-adm-btn">저장</button>
        </div>
      </form>
    </div>
  );
}
