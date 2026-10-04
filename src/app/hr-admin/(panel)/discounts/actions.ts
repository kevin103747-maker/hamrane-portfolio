// src/app/hr-admin/(panel)/discounts/actions.ts — 수량 할인·묶음 할인 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { DISC_LIMITS, type BundleTier, type DiscountSettings, type GroupRule, type VolTier } from '@/lib/discounts';

const BACK = '/hr-admin/discounts';

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export async function saveDiscounts(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');

  const db = adminDb();
  const [gs, rs] = await Promise.all([
    db.from('part_groups').select('id, name'),
    db.from('rate_items').select('id'),
  ]);

  // 공백과 쉼표를 지운 입력값. 숫자 칸 전용입니다.
  const get = (k: string) => String(fd.get(k) ?? '').replace(/[\s,]/g, '');
  const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : NaN);

  const groups: Record<string, GroupRule> = {};
  for (const g of gs.data ?? []) {
    const gid = g.id as string;
    const who = txt(g.name) || gid;

    const volume: VolTier[] = [];
    for (let n = 0; n < DISC_LIMITS.volRows; n++) {
      const minS = get(`vMin_${gid}_${n}`);
      const valS = get(`vVal_${gid}_${n}`);
      if (!minS && !valS) continue; // 빈 단계는 건너뜀
      if (!minS || !valS) fail(`${who}: 수량 할인은 "몇 곡 이상"과 "할인 값"을 둘 다 입력하세요.`);

      const min = num(minS);
      const value = num(valS);
      const type = get(`vType_${gid}_${n}`) === 'won' ? 'won' : 'pct';
      if (!(min >= 2 && min <= 99)) fail(`${who}: "몇 곡 이상"은 2~99 사이의 정수로 입력하세요.`);
      if (!(value >= 1)) fail(`${who}: 할인 값은 1 이상의 정수로 입력하세요.`);
      if (type === 'pct' && value > 90) fail(`${who}: 할인율은 90% 이하로 입력하세요.`);
      if (type === 'won' && value > 10_000_000) fail(`${who}: 곡당 할인 금액이 너무 큽니다.`);
      volume.push({ min, type, value });
    }
    volume.sort((a, b) => a.min - b.min);
    for (let i = 1; i < volume.length; i++) {
      if (volume[i].min === volume[i - 1].min) fail(`${who}: 같은 곡 수(${volume[i].min}곡)가 두 번 입력되었습니다.`);
      // 같은 방식인데 곡이 많을수록 할인이 줄어드는 입력은 오타일 가능성이 높아 막습니다.
      if (volume[i].type === volume[i - 1].type && volume[i].value < volume[i - 1].value) {
        fail(`${who}: ${volume[i].min}곡 이상의 할인이 ${volume[i - 1].min}곡 이상보다 작습니다. 입력을 확인하세요.`);
      }
    }

    const bundle = fd.get(`bundle_${gid}`) === 'on';
    if (volume.length || bundle) groups[gid] = { volume, bundle };
  }

  const bundle: BundleTier[] = [];
  for (let n = 0; n < DISC_LIMITS.bundleRows; n++) {
    const minS = get(`bMin_${n}`);
    const pctS = get(`bPct_${n}`);
    if (!minS && !pctS) continue;
    if (!minS || !pctS) fail('묶음 할인은 "몇 개 분야 이상"과 "할인율"을 둘 다 입력하세요.');
    const min = num(minS);
    const pct = num(pctS);
    if (!(min >= 2 && min <= 20)) fail('묶음 할인의 분야 수는 2~20 사이의 정수로 입력하세요.');
    if (!(pct >= 1 && pct <= 90)) fail('묶음 할인율은 1~90 사이의 정수로 입력하세요.');
    bundle.push({ min, pct });
  }
  bundle.sort((a, b) => a.min - b.min);
  for (let i = 1; i < bundle.length; i++) {
    if (bundle[i].min === bundle[i - 1].min) fail(`묶음 할인에 같은 분야 수(${bundle[i].min}개)가 두 번 입력되었습니다.`);
    if (bundle[i].pct < bundle[i - 1].pct) fail('분야 수가 많을수록 할인율이 같거나 커야 합니다. 입력을 확인하세요.');
  }
  const eligible = Object.values(groups).filter((r) => r.bundle).length;
  if (bundle.length && eligible < 2) fail('묶음 할인을 쓰려면 "묶음 할인 대상 분야"를 2개 이상 체크하세요.');

  // 존재하는 단가 항목만 제외 목록에 넣습니다.
  const excluded = (rs.data ?? []).map((x) => x.id as string).filter((id) => fd.get(`ex_${id}`) === 'on');

  const value: DiscountSettings = { groups, excluded, bundle };
  const { data: old } = await db.from('site_settings').select('value').eq('key', 'discounts').maybeSingle();
  const saved = await db.from('site_settings').upsert({ key: 'discounts', value }, { onConflict: 'key' });
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'discounts', old?.value ?? null, value);
  redirect(`${BACK}?ok=1`);
}
