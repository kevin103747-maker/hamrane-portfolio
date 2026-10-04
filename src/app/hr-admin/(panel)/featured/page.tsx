// src/app/hr-admin/(panel)/featured/page.tsx — 홈 화면 대표곡 지정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { saveIndexQueue } from '../actions';
import { FeaturedPicker } from '@/components/admin/FeaturedPicker';
import { HOME_FEATURED_MAX, toPickWork, txt, type WorkRow } from '@/lib/featured';

export default async function FeaturedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'works')) redirect('/hr-admin');
  const { ok, err } = await searchParams;

  const db = adminDb();
  const [w, p, a, q] = await Promise.all([
    db.from('works')
      .select('id, title, work_date, hidden, part_ids, main_part_id, artist_ids, youtube_id, thumb_url')
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false }),
    db.from('parts').select('id, name').order('sort', { ascending: true }),
    db.from('artists').select('id, name'),
    db.from('index_queue').select('work_id, label_part_id').order('sort', { ascending: true }),
  ]);

  const artistMap = new Map<string, string>((a.data ?? []).map((x) => [x.id as string, x.name as string]));
  const works = ((w.data ?? []) as WorkRow[]).map((x) => toPickWork(x, (id) => artistMap.get(id) ?? ''));
  const parts = (p.data ?? []).map((x) => ({ id: x.id as string, name: txt(x.name) }));
  const known = new Set(works.map((x) => x.id));
  const initial = (q.data ?? [])
    .filter((x) => known.has(x.work_id as string))
    .map((x) => ({ workId: x.work_id as string, labelPartId: (x.label_part_id ?? '') as string }));

  return (
    <div className="hr-pn-body">
      <h1>홈 대표곡</h1>
      <p>
        홈 화면 &quot;대표작&quot; 패널에 나올 곡입니다. 곡 제목이나 아티스트로 검색해서 추가하고, 위에서부터 순서대로 표시됩니다.
        모두 비우면 최신 곡 4개가 대신 표시됩니다. 숨김 곡은 홈에 나오지 않으므로 고를 수 없습니다.
      </p>
      <p>
        라벨(&quot;FEATURED · 작곡 외 2개 파트&quot;)은 자동으로 만들어집니다. 곡의 강조 파트(없으면 첫 번째 참여 파트)가 앞에 오고,
        참여 파트가 여럿이면 &quot;외 N개 파트&quot;가 붙습니다. 다른 파트를 앞에 내세우고 싶을 때만 곡 아래의 &quot;라벨 파트 바꾸기&quot;를 쓰세요.
      </p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveIndexQueue} className="hr-card hr-f">
        <FeaturedPicker works={works} parts={parts} initial={initial} max={HOME_FEATURED_MAX} />
        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
