// src/app/hr-admin/(panel)/featured/page.tsx — 홈 화면 대표곡 지정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { saveIndexQueue } from '../actions';

const SLOTS = 6;

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
const txt = (v: unknown): string =>
  typeof v === "string" ? v : ((v as { ko?: string } | null)?.ko ?? "");

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
    db.from('works').select('id, title, work_date, hidden').order('sort', { ascending: true }),
    db.from('parts').select('id, name').order('sort', { ascending: true }),
    db.from('index_queue').select('work_id, label_part_id, part_count').order('sort', { ascending: true }),
  ]);
  const works = w.data ?? [];
  const parts = p.data ?? [];
  const queue = q.data ?? [];

  return (
    <div className="hr-pn-body">
      <h1>대표곡 지정</h1>
      <p>홈 화면 &quot;대표작&quot; 패널에 나올 곡입니다. 위에서부터 순서대로 표시되고, 비워 둔 칸은 무시됩니다. 모두 비우면 최신 곡이 대신 표시됩니다.</p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 대시보드의 &quot;게시&quot;를 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveIndexQueue} className="hr-card hr-f">
        {Array.from({ length: SLOTS }, (_, i) => {
          const cur = queue[i];
          return (
            <fieldset key={i}>
              <legend>{i + 1}번째</legend>
              <div className="hr-row hr-feat-row">
                <label>
                  곡
                  <select name="workId" defaultValue={cur?.work_id ?? ''}>
                    <option value="">(비움)</option>
                    {works.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                        {x.work_date ? ` · ${x.work_date}` : ''}
                        {x.hidden ? ' · 숨김' : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  라벨 파트(선택)
                  <select name="labelPartId" defaultValue={cur?.label_part_id ?? ''}>
                    <option value="">(없음)</option>
                    {parts.map((x) => (
                      <option key={x.id} value={x.id}>{txt(x.name)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  표시할 파트 수(선택)
                  <input type="number" name="partCount" min={1} defaultValue={cur?.part_count ?? ''} />
                </label>
              </div>
            </fieldset>
          );
        })}
        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
