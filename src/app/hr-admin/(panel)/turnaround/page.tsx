// src/app/hr-admin/(panel)/turnaround/page.tsx — 분야 기본값 + 세부 작업별 소요 기간·마감
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { emptyTurn, itemKey, parseTurnaround, TURN_LIMITS, type GroupTurn } from '@/lib/turnaround';
import { saveTurnaround } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

/** 입력칸 묶음. k = 분야 id 또는 "item:작업id" */
function Fields({ k, t }: { k: string; t: GroupTurn }) {
  return (
    <>
      <label>
        평균 소요 기간
        <input name={`avg_${k}`} defaultValue={t.avg} maxLength={TURN_LIMITS.avg} placeholder="예: 5~7일" />
      </label>
      <div className="hr-row">
        <label className="hr-chk">
          <input type="checkbox" name={`rushOn_${k}`} defaultChecked={t.rush.on} /> 빠른 마감 가능
        </label>
        <label>
          빠른 마감 기간
          <input name={`rushDays_${k}`} defaultValue={t.rush.days} maxLength={TURN_LIMITS.days} placeholder="예: 2~3일" />
        </label>
        <label>
          추가 요금
          <span className="hr-fee">
            <select name={`rushType_${k}`} defaultValue={t.rush.fee?.type ?? 'pct'}>
              <option value="pct">%</option>
              <option value="won">원</option>
            </select>
            <input name={`rushFee_${k}`} inputMode="numeric" defaultValue={t.rush.fee?.value ?? ''} placeholder="예: 30" />
          </span>
        </label>
      </div>
      <div className="hr-row">
        <label className="hr-chk">
          <input type="checkbox" name={`sameOn_${k}`} defaultChecked={t.same.on} /> 당일 마감 가능
        </label>
        <label>
          추가 요금
          <span className="hr-fee">
            <select name={`sameType_${k}`} defaultValue={t.same.fee?.type ?? 'pct'}>
              <option value="pct">%</option>
              <option value="won">원</option>
            </select>
            <input name={`sameFee_${k}`} inputMode="numeric" defaultValue={t.same.fee?.value ?? ''} placeholder="예: 50" />
          </span>
        </label>
      </div>
    </>
  );
}

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
    db.from('rate_items').select('id, group_id, name').order('sort', { ascending: true }),
    db.from('site_settings').select('value').eq('key', 'turnaround').maybeSingle(),
  ]);
  const items = r.data ?? [];
  // 단가표에 보이는 분야(단가 항목이 있는 분야)만 설정합니다.
  const used = new Set(items.map((x) => x.group_id as string));
  const groups = (g.data ?? []).filter((x) => used.has(x.id as string));
  const cur = parseTurnaround(s.data?.value);

  return (
    <div className="hr-pn-body">
      <h1>소요 기간·마감</h1>
      <p>
        분야마다 <b>기본값</b>을 정하고, 다른 작업만 <b>&quot;따로 설정&quot;</b>을 켜서 그 작업만의 값을 넣습니다.
        따로 설정하지 않은 작업은 분야 기본값을 따르고, 따로 설정한 작업은 기본값을 무시하고 자기 값만 씁니다.
        가능하지 않은 옵션은 체크를 끄면 사이트에 &quot;불가&quot;로 표시됩니다. 추가 요금을 비우면 &quot;추가요금 별도&quot;로 표시됩니다.
      </p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveTurnaround} className="hr-card hr-f">
        {groups.map((grp) => {
          const gid = grp.id as string;
          const base = cur[gid] ?? emptyTurn();
          const rows = items.filter((x) => x.group_id === gid);
          return (
            <fieldset key={gid}>
              <legend>{grp.num} {txt(grp.name)} · 분야 기본값</legend>
              <Fields k={gid} t={base} />

              {rows.map((it) => {
                const key = itemKey(it.id as string);
                const own = cur[key];
                return (
                  <fieldset key={key} className="hr-tn-item">
                    <legend>{txt(it.name)}</legend>
                    <label className="hr-chk">
                      <input type="checkbox" name={`own_${key}`} defaultChecked={!!own} /> 이 작업은 따로 설정
                    </label>
                    <small>체크하지 않으면 위의 분야 기본값을 따릅니다. 체크하지 않은 채 입력한 값은 저장되지 않습니다.</small>
                    <Fields k={key} t={own ?? base} />
                  </fieldset>
                );
              })}
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
