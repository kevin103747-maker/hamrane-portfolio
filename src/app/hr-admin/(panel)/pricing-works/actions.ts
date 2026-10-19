// src/app/hr-admin/(panel)/pricing-works/actions.ts — 단가표 분야별 예시 작업물 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { PRICING_WORKS_MAX, parsePricingWorks, type PricingWorks } from '@/lib/pricing-works';

const BACK = '/hr-admin/pricing-works';

function fail(gid: string, msg: string): never {
  redirect(`${BACK}?g=${encodeURIComponent(gid)}&err=${encodeURIComponent(msg)}`);
}

export async function savePricingWorks(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const db = adminDb();

  const gid = String(fd.get('group') ?? '');
  const ids = Array.from(new Set(fd.getAll('workId').map(String).filter(Boolean)));

  const g = await db.from('part_groups').select('id').eq('id', gid).maybeSingle();
  if (!g.data) redirect(BACK);
  if (ids.length > PRICING_WORKS_MAX) {
    fail(gid, `한 분야에 최대 ${PRICING_WORKS_MAX}곡까지 고를 수 있습니다. (현재 ${ids.length}곡)`);
  }

  // 실제로 있는 곡만 저장합니다.
  let valid: string[] = [];
  if (ids.length) {
    const ws = await db.from('works').select('id').in('id', ids);
    const have = new Set((ws.data ?? []).map((x) => x.id as string));
    valid = ids.filter((id) => have.has(id));
  }

  const { data: old } = await db.from('site_settings').select('value').eq('key', 'pricing_works').maybeSingle();
  const value: PricingWorks = { ...parsePricingWorks(old?.value) };
  if (valid.length) value[gid] = valid;
  else delete value[gid];

  const saved = await db.from('site_settings').upsert({ key: 'pricing_works', value }, { onConflict: 'key' });
  if (saved.error) fail(gid, `저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'pricing_works', old?.value ?? null, value);
  redirect(`${BACK}?g=${encodeURIComponent(gid)}&ok=1`);
}
