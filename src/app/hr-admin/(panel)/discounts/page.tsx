// src/app/hr-admin/(panel)/discounts/page.tsx — 수량 할인·묶음 할인 규칙
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { DISC_LIMITS, parseDiscounts, type VolTier } from '@/lib/discounts';
import { saveDiscounts } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

function VolRows({ gid, tiers }: { gid: string; tiers: VolTier[] }) {
  return (
    <>
      {Array.from({ length: DISC_LIMITS.volRows }, (_, n) => {
        const t = tiers[n];
        return (
          <div key={n} className="hr-row">
            <label>
              몇 곡 이상
              <input name={`vMin_${gid}_${n}`} inputMode="numeric" defaultValue={t?.min ?? ''} placeholder="예: 3" />
            </label>
            <label>
              할인 방식
              <select name={`vType_${gid}_${n}`} defaultValue={t?.type ?? 'pct'}>
                <option value="pct">% 할인</option>
                <option value="won">곡당 원 할인</option>
              </select>
            </label>
            <label>
              할인 값
              <input name={`vVal_${gid}_${n}`} inputMode="numeric" defaultValue={t?.value ?? ''} placeholder="예: 10" />
            </label>
          </div>
        );
      })}
    </>
  );
}

export default async function DiscountsPage({
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
    db.from('site_settings').select('value').eq('key', 'discounts').maybeSingle(),
  ]);
  const items = r.data ?? [];
  const used = new Set(items.map((x) => x.group_id as string));
  const groups = (g.data ?? []).filter((x) => used.has(x.id as string));
  const cur = parseDiscounts(s.data?.value);
  const excluded = new Set(cur.excluded);

  return (
    <div className="hr-pn-body">
      <h1>할인 규칙</h1>
      <p>
        단가표에 안내로 표시되는 수량 할인과 묶음 할인입니다. 금액을 자동으로 계산하지는 않고, 방문자에게 규칙을 보여 주는 용도입니다.
        비워 둔 칸은 표시되지 않습니다. 이벤트 할인이 켜진 작업은 수량·묶음 할인과 겹치지 않고 더 낮은 금액 하나만 적용된다는 안내가 함께 나옵니다.
      </p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveDiscounts} className="hr-card hr-f">
        <fieldset>
          <legend>묶음 할인 단계 (여러 분야를 함께 의뢰)</legend>
          <small>
            예: 2개 분야 이상 5%, 3개 분야 이상 8%. 아래에서 &quot;묶음 할인 대상&quot;으로 체크한 분야만 분야 수에 포함되고 할인도 그 분야 금액에만 붙습니다.
            단계를 모두 비우면 묶음 할인은 표시되지 않습니다.
          </small>
          {Array.from({ length: DISC_LIMITS.bundleRows }, (_, n) => {
            const t = cur.bundle[n];
            return (
              <div key={n} className="hr-row">
                <label>
                  몇 개 분야 이상
                  <input name={`bMin_${n}`} inputMode="numeric" defaultValue={t?.min ?? ''} placeholder="예: 2" />
                </label>
                <label>
                  할인율 (%)
                  <input name={`bPct_${n}`} inputMode="numeric" defaultValue={t?.pct ?? ''} placeholder="예: 5" />
                </label>
              </div>
            );
          })}
        </fieldset>

        {groups.map((grp) => {
          const gid = grp.id as string;
          const rule = cur.groups[gid];
          const rows = items.filter((x) => x.group_id === gid);
          return (
            <fieldset key={gid}>
              <legend>{grp.num} {txt(grp.name)}</legend>
              <label className="hr-chk">
                <input type="checkbox" name={`bundle_${gid}`} defaultChecked={!!rule?.bundle} /> 묶음 할인 대상 분야
              </label>
              <small>수량 할인 (최대 {DISC_LIMITS.volRows}단계, 이 분야로 의뢰한 곡 수 기준)</small>
              <VolRows gid={gid} tiers={rule?.volume ?? []} />

              <fieldset className="hr-tn-item">
                <legend>수량·묶음 할인에서 제외할 작업</legend>
                <div className="hr-chks">
                  {rows.map((it) => (
                    <label key={it.id as string} className="hr-chk">
                      <input type="checkbox" name={`ex_${it.id}`} defaultChecked={excluded.has(it.id as string)} />
                      {txt(it.name)}
                    </label>
                  ))}
                </div>
              </fieldset>
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
