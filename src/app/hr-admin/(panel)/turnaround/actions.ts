// src/app/hr-admin/(panel)/turnaround/actions.ts — 분야 기본값 + 세부 작업별 소요 기간·마감 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { TURN_LIMITS, itemKey, type Fee, type GroupTurn, type TurnaroundSettings } from '@/lib/turnaround';

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
  const [gs, rs] = await Promise.all([
    db.from('part_groups').select('id, name'),
    db.from('rate_items').select('id, name'),
  ]);

  const field = (name: string, key: string) =>
    String(fd.get(`${name}_${key}`) ?? '').replace(/\s+/g, ' ').trim();
  const flag = (name: string, key: string) => fd.get(`${name}_${key}`) === 'on';

  const fee = (prefix: string, key: string, who: string): Fee => {
    const raw = field(`${prefix}Fee`, key).replace(/,/g, '');
    if (!raw) return null;
    const type = field(`${prefix}Type`, key) === 'won' ? 'won' : 'pct';
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) fail(`${who}: 추가 요금은 1 이상의 정수로 입력하세요.`);
    if (type === 'pct' && n > 300) fail(`${who}: 추가 요금 %는 300 이하로 입력하세요.`);
    return { type, value: n };
  };

  /** 한 묶음(분야 또는 작업)의 입력칸을 읽고 검사합니다. */
  const read = (key: string, who: string): GroupTurn => {
    const avg = field('avg', key);
    const rushDays = field('rushDays', key);
    if (avg.length > TURN_LIMITS.avg) fail(`${who}: 평균 소요 기간은 ${TURN_LIMITS.avg}자 이내로 입력하세요.`);
    if (rushDays.length > TURN_LIMITS.days) fail(`${who}: 빠른 마감 기간은 ${TURN_LIMITS.days}자 이내로 입력하세요.`);
    const rushOn = flag('rushOn', key);
    if (rushOn && !rushDays) fail(`${who}: 빠른 마감을 켰다면 기간을 입력하세요. (예: 2~3일)`);
    return {
      avg,
      rush: { on: rushOn, days: rushDays, fee: fee('rush', key, who) },
      same: { on: flag('sameOn', key), fee: fee('same', key, who) },
    };
  };

  const value: TurnaroundSettings = {};

  // 1) 분야 기본값: 아무것도 없는 분야는 저장하지 않습니다.
  for (const g of gs.data ?? []) {
    const gid = g.id as string;
    const t = read(gid, `${txt(g.name) || gid} (분야 기본값)`);
    const empty = !t.avg && !t.rush.on && !t.same.on && !t.rush.days && !t.rush.fee && !t.same.fee;
    if (!empty) value[gid] = t;
  }

  // 2) 세부 작업: "따로 설정"을 켠 작업만 저장합니다. (끄면 분야 기본값을 따름)
  for (const it of rs.data ?? []) {
    const key = itemKey(it.id as string);
    if (!flag('own', key)) continue;
    value[key] = read(key, txt(it.name) || (it.id as string));
  }

  const { data: old } = await db.from('site_settings').select('value').eq('key', 'turnaround').maybeSingle();
  const saved = await db.from('site_settings').upsert({ key: 'turnaround', value }, { onConflict: 'key' });
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'turnaround', old?.value ?? null, value);
  redirect(`${BACK}?ok=1`);
}
