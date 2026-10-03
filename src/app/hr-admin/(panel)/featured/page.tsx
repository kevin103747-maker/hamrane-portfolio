// src/app/hr-admin/(panel)/featured/page.tsx — 홈 화면 대표곡 지정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { saveIndexQueue } from '../actions';
import { FeaturedSlots } from '@/components/admin/FeaturedSlots';

const SLOTS = 6;

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export default async function FeaturedPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'works')) redirect('/hr-admin');
  const { ok, err } = await searchParams;

  const db = adminDb();
  const [w, p, q] = await Promise.all([
    db.from('works').select('id, title, work_date, hidden, part_ids, main_part_id').order('work_date', { ascending: false }),
    db.from('parts').select('id, name').order('sort', { ascending: true }),
    db.from('index_queue').select('work_id, label_part_id, part_count').order('sort', { ascending: true }),
  ]);

  const works = (w.data ?? []).map((x) => ({
    id: x.id as string,
    title: x.title as string,
    date: (x.work_date ?? '') as string,
    hidden: !!x.hidden,
    partIds: (x.part_ids ?? []) as string[],
    mainPartId: (x.main_part_id ?? null) as string | null,
  }));
  const parts = (p.data ?? []).map((x) => ({ id: x.id as string, name: txt(x.name) }));
  const initial = (q.data ?? []).map((x) => ({
    workId: x.work_id as string,
    labelPartId: (x.label_part_id ?? '') as string,
    partCount: x.part_count ? String(x.part_count) : '',
  }));

  return (
    <div className="hr-pn-body">
      <h1>대표곡 지정</h1>
      <p>
        홈 화면 &quot;대표작&quot; 패널에 나올 곡입니다. 위에서부터 순서대로 표시되고, 비워 둔 칸은 무시됩니다.
        모두 비우면 최신 곡 4개가 대신 표시됩니다. 숨김 곡은 홈에 나오지 않으므로 고를 수 없습니다.
      </p>
      <p>
        <b>라벨 파트</b>는 대표작 목록과 큰 화면 위에 &quot;FEATURED · 파트명&quot;으로 붙는 표시입니다.
        비워 두면 그 곡의 강조 파트(없으면 첫 번째 참여 파트)가 자동으로 쓰입니다.
        <b> 파트 수</b>는 라벨 파트를 골랐을 때만 쓰이며, 예를 들어 3을 넣으면 &quot;작곡 외 2개 파트&quot;로 표시됩니다.
      </p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveIndexQueue} className="hr-card hr-f">
        <FeaturedSlots works={works} parts={parts} initial={initial} slots={SLOTS} />
        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
