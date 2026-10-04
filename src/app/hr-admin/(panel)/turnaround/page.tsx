// src/app/hr-admin/(panel)/turnaround/page.tsx — 분야별 소요 기간·빠른 마감·당일 마감
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { emptyTurn, parseTurnaround, TURN_LIMITS } from '@/lib/turnaround';
import { saveTurnaround } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export default async function TurnaroundPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { ok, err } = await searchParams;

  const db = adminDb();
  const [g, r, s] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }),
    db.from('rate_items').select('group_id'),
    db.from('site_settings').select('value').eq('key', 'turnaround').maybeSingle(),
  ]);
  // 단가표에 보이는 분야(단가 항목이 있는 분야)만 설정합니다.
  const used = new Set((r.data ?? []).map((x) => x.group_id as string));
  const groups = (g.data ?? []).filter((x) => used.has(x.id as string));
  const cur = parseTurnaround(s.data?.value);

  return (
    <div className="hr-pn-body">
      <h1>소요 기간·마감</h1>
      <p>
        단가표의 분야 탭 안에 나오는 정보입니다. 평균 소요 기간과 빠른 마감, 당일 마감을 분야마다 따로 정합니다.
        가능하지 않은 옵션은 체크를 끄면 사이트에 &quot;불가&quot;로 표시됩니다. 추가 요금은 % 또는 원으로 입력하고, 비우면 &quot;추가요금 별도&quot;로 표시됩니다.
      </p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveTurnaround} className="hr-card hr-f">
        {groups.map((grp) => {
          const id = grp.id as string;
          const t = cur[id] ?? emptyTurn();
          return (
            <fieldset key={id}>
              <legend>{grp.num} {txt(grp.name)}</legend>
              <label>
                평균 소요 기간
                <input name={`avg_${id}`} defaultValue={t.avg} maxLength={TURN_LIMITS.avg} placeholder="예: 5~7일" />
              </label>

              <div className="hr-row">
                <label className="hr-chk">
                  <input type="checkbox" name={`rushOn_${id}`} defaultChecked={t.rush.on} /> 빠른 마감 가능
                </label>
                <label>
                  빠른 마감 기간
                  <input name={`rushDays_${id}`} defaultValue={t.rush.days} maxLength={TURN_LIMITS.days} placeholder="예: 2~3일" />
                </label>
                <label>
                  추가 요금
                  <span className="hr-fee">
                    <select name={`rushType_${id}`} defaultValue={t.rush.fee?.type ?? 'pct'}>
                      <option value="pct">%</option>
                      <option value="won">원</option>
                    </select>
                    <input name={`rushFee_${id}`} inputMode="numeric" defaultValue={t.rush.fee?.value ?? ''} placeholder="예: 30" />
                  </span>
                </label>
              </div>

              <div className="hr-row">
                <label className="hr-chk">
                  <input type="checkbox" name={`sameOn_${id}`} defaultChecked={t.same.on} /> 당일 마감 가능
                </label>
                <label>
                  추가 요금
                  <span className="hr-fee">
                    <select name={`sameType_${id}`} defaultValue={t.same.fee?.type ?? 'pct'}>
                      <option value="pct">%</option>
                      <option value="won">원</option>
                    </select>
                    <input name={`sameFee_${id}`} inputMode="numeric" defaultValue={t.same.fee?.value ?? ''} placeholder="예: 50" />
                  </span>
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
