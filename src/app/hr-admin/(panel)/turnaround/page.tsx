// src/app/hr-admin/(panel)/turnaround/page.tsx — 분야 기본값 + 세부 작업별 소요 기간·마감
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { emptyTurn, itemKey, parseTurnaround, TURN_LIMITS, type GroupTurn } from '@/lib/turnaround';
import { Section, Help, Flash } from '@/components/admin/Section';
import { saveTurnaround } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

/** 접힌 상태에서 보여줄 한 줄 요약 */
const brief = (t: GroupTurn) =>
  [t.avg || '기간 미입력', t.rush.on ? `빠른 ${t.rush.days || '가능'}` : '', t.same.on ? '당일 가능' : '']
    .filter(Boolean)
    .join(' · ');

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
  const all = g.data ?? [];
  // 단가표에 보이는 분야(단가 항목이 있는 분야)만 설정합니다.
  const used = new Set(items.map((x) => x.group_id as string));
  const groups = all.filter((x) => used.has(x.id as string));
  const hidden = all.filter((x) => !used.has(x.id as string));
  const cur = parseTurnaround(s.data?.value);

  return (
    <div className="hr-pn-body">
      <h1>소요 기간·마감</h1>
      <p className="hr-lead">분야마다 기본값을 정하고, 기본값과 다른 작업만 따로 설정합니다.</p>
      <Help>
        <p>
          분야를 펼치면 위쪽에 <b>분야 기본값</b>, 아래쪽에 세부 작업 목록이 나옵니다.
          세부 작업은 기본값과 다를 때만 펼쳐서 <b>&quot;이 작업은 따로 설정&quot;</b>을 체크하고 값을 넣으세요.
          체크하지 않은 작업은 분야 기본값을 따르고, 체크하지 않은 채 입력한 값은 저장되지 않습니다.
        </p>
        <p>
          가능하지 않은 옵션은 체크를 끄면 사이트에 &quot;불가&quot;로 표시됩니다.
          추가 요금을 비우면 &quot;추가요금 별도&quot;로 표시됩니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />
      {hidden.length > 0 && (
        <p className="hr-note">
          단가표에 항목이 없어서 여기에 표시되지 않는 분야: {hidden.map((x) => txt(x.name)).join(', ')}
        </p>
      )}

      <form action={saveTurnaround} className="hr-card hr-f">
        {groups.map((grp, gi) => {
          const gid = grp.id as string;
          const base = cur[gid] ?? emptyTurn();
          const rows = items.filter((x) => x.group_id === gid);
          const own = rows.filter((it) => cur[itemKey(it.id as string)]).length;
          return (
            <Section
              key={gid}
              open={gi === 0}
              title={`${grp.num} ${txt(grp.name)}`}
              badge={`작업 ${rows.length}개`}
              hint={`${brief(base)}${own ? ` · 따로 설정 ${own}개` : ''}`}
            >
              <p className="hr-sub">분야 기본값</p>
              <Fields k={gid} t={base} />

              {rows.length > 0 && <p className="hr-sub">세부 작업 · 기본값과 다른 작업만 펼쳐서 설정</p>}
              {rows.map((it) => {
                const key = itemKey(it.id as string);
                const o = cur[key];
                return (
                  <Section
                    key={key}
                    title={txt(it.name)}
                    badge={o ? '따로 설정' : '기본값 따름'}
                    hint={o ? brief(o) : undefined}
                  >
                    <label className="hr-chk">
                      <input type="checkbox" name={`own_${key}`} defaultChecked={!!o} /> 이 작업은 따로 설정
                    </label>
                    <Fields k={key} t={o ?? base} />
                  </Section>
                );
              })}
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
