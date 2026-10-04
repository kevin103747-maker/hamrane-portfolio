// src/app/hr-admin/(panel)/turnaround/actions.ts — 분야별 소요 기간·마감 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { TURN_LIMITS, type Fee, type TurnaroundSettings } from '@/lib/turnaround';

const BACK = '/hr-admin/turnaround';

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export async function saveTurnaround(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');

  const db = adminDb();
  const { data: gs } = await db.from('part_groups').select('id, name');

  const field = (name: string, gid: string) =>
    String(fd.get(`${name}_${gid}`) ?? '').replace(/\s+/g, ' ').trim();
  const flag = (name: string, gid: string) => fd.get(`${name}_${gid}`) === 'on';

  const fee = (prefix: string, gid: string, who: string): Fee => {
    const raw = field(`${prefix}Fee`, gid).replace(/,/g, '');
    if (!raw) return null;
    const type = field(`${prefix}Type`, gid) === 'won' ? 'won' : 'pct';
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) fail(`${who}: 추가 요금은 1 이상의 정수로 입력하세요.`);
    if (type === 'pct' && n > 300) fail(`${who}: 추가 요금 %는 300 이하로 입력하세요.`);
    return { type, value: n };
  };

  const value: TurnaroundSettings = {};
  for (const g of gs ?? []) {
    const gid = g.id as string;
    const who = txt(g.name) || gid;

    const avg = field('avg', gid);
    const rushDays = field('rushDays', gid);
    if (avg.length > TURN_LIMITS.avg) fail(`${who}: 평균 소요 기간은 ${TURN_LIMITS.avg}자 이내로 입력하세요.`);
    if (rushDays.length > TURN_LIMITS.days) fail(`${who}: 빠른 마감 기간은 ${TURN_LIMITS.days}자 이내로 입력하세요.`);

    const rushOn = flag('rushOn', gid);
    const sameOn = flag('sameOn', gid);
    if (rushOn && !rushDays) fail(`${who}: 빠른 마감을 켰다면 기간을 입력하세요. (예: 2~3일)`);

    const rushFee = fee('rush', gid, who);
    const sameFee = fee('same', gid, who);

    // 아무것도 없는 분야는 저장하지 않습니다. (꺼 둔 옵션의 기간·요금은 다시 켤 때를 위해 보관)
    if (!avg && !rushOn && !sameOn && !rushDays && !rushFee && !sameFee) continue;
    value[gid] = {
      avg,
      rush: { on: rushOn, days: rushDays, fee: rushFee },
      same: { on: sameOn, fee: sameFee },
    };
  }

  const { data: old } = await db.from('site_settings').select('value').eq('key', 'turnaround').maybeSingle();
  const saved = await db.from('site_settings').upsert({ key: 'turnaround', value }, { onConflict: 'key' });
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'turnaround', old?.value ?? null, value);
  redirect(`${BACK}?ok=1`);
}
