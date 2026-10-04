// src/app/hr-admin/(panel)/discounts/page.tsx — 수량 할인·묶음 할인 규칙
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { DISC_LIMITS, parseDiscounts, type VolTier } from '@/lib/discounts';
import { Section, Help, Flash } from '@/components/admin/Section';
import { saveDiscounts } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

function VolRow({ gid, n, t }: { gid: string; n: number; t?: VolTier }) {
  return (
    <div className="hr-row">
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
}

/** 채운 단계 + 빈 칸 1개만 보이고, 나머지는 접어 둡니다. (접어도 저장 때 같이 제출됩니다.) */
function VolRows({ gid, tiers }: { gid: string; tiers: VolTier[] }) {
  const total = DISC_LIMITS.volRows;
  const shown = Math.min(total, tiers.length + 1);
  const idx = Array.from({ length: total }, (_, n) => n);
  return (
    <>
      {idx.slice(0, shown).map((n) => <VolRow key={n} gid={gid} n={n} t={tiers[n]} />)}
      {shown < total && (
        <details className="hr-more">
          <summary>단계 더 추가 ({total - shown}칸)</summary>
          {idx.slice(shown).map((n) => <VolRow key={n} gid={gid} n={n} t={tiers[n]} />)}
        </details>
      )}
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
  const all = g.data ?? [];
  const used = new Set(items.map((x) => x.group_id as string));
  const groups = all.filter((x) => used.has(x.id as string));
  const hidden = all.filter((x) => !used.has(x.id as string));
  const cur = parseDiscounts(s.data?.value);
  const excluded = new Set(cur.excluded);

  const bTotal = DISC_LIMITS.bundleRows;
  const bShown = Math.min(bTotal, cur.bundle.length + 1);
  const bRow = (n: number) => {
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
  };
  const bIdx = Array.from({ length: bTotal }, (_, n) => n);

  return (
    <div className="hr-pn-body">
      <h1>할인 규칙</h1>
      <p className="hr-lead">단가표에 안내로 보이는 수량 할인과 묶음 할인을 정합니다.</p>
      <Help>
        <p>
          금액을 자동으로 계산하지는 않고, 방문자에게 규칙을 보여 주는 용도입니다. 비워 둔 칸은 표시되지 않습니다.
        </p>
        <p>
          이벤트 할인이 켜진 작업은 수량·묶음 할인과 겹치지 않고, 더 낮은 금액 하나만 적용된다는 안내가 함께 나옵니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />
      {hidden.length > 0 && (
        <p className="hr-note">
          단가표에 항목이 없어서 여기에 표시되지 않는 분야: {hidden.map((x) => txt(x.name)).join(', ')}
        </p>
      )}

      <form action={saveDiscounts} className="hr-card hr-f">
        <Section
          open
          title="묶음 할인"
          badge={`${cur.bundle.length}단계`}
          hint="여러 분야를 함께 의뢰할 때"
        >
          <p className="hr-sub">
            예: 2개 분야 이상 5%, 3개 분야 이상 8%. 아래 분야에서 &quot;묶음 할인 대상&quot;으로 체크한 분야만 분야 수에 포함되고,
            할인도 그 분야 금액에만 붙습니다. 모두 비우면 표시되지 않습니다.
          </p>
          {bIdx.slice(0, bShown).map(bRow)}
          {bShown < bTotal && (
            <details className="hr-more">
              <summary>단계 더 추가 ({bTotal - bShown}칸)</summary>
              {bIdx.slice(bShown).map(bRow)}
            </details>
          )}
        </Section>

        {groups.map((grp) => {
          const gid = grp.id as string;
          const rule = cur.groups[gid];
          const rows = items.filter((x) => x.group_id === gid);
          const exCount = rows.filter((it) => excluded.has(it.id as string)).length;
          const vol = rule?.volume ?? [];
          return (
            <Section
              key={gid}
              title={`${grp.num} ${txt(grp.name)}`}
              badge={vol.length ? `수량 ${vol.length}단계` : '수량 할인 없음'}
              hint={[rule?.bundle ? '묶음 대상' : '', exCount ? `제외 ${exCount}개` : ''].filter(Boolean).join(' · ')}
            >
              <label className="hr-chk">
                <input type="checkbox" name={`bundle_${gid}`} defaultChecked={!!rule?.bundle} /> 묶음 할인 대상 분야
              </label>

              <p className="hr-sub">수량 할인 · 이 분야로 의뢰한 곡 수 기준 (최대 {DISC_LIMITS.volRows}단계)</p>
              <VolRows gid={gid} tiers={vol} />

              <details className="hr-more" open={exCount > 0}>
                <summary>수량·묶음 할인에서 제외할 작업 ({exCount}개 선택)</summary>
                <div className="hr-chks">
                  {rows.map((it) => (
                    <label key={it.id as string} className="hr-chk">
                      <input type="checkbox" name={`ex_${it.id}`} defaultChecked={excluded.has(it.id as string)} />
                      {txt(it.name)}
                    </label>
                  ))}
                </div>
              </details>
            </Section>
          );
        })}

        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
