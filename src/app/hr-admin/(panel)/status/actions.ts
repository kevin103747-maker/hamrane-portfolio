// src/app/hr-admin/(panel)/status/actions.ts — 의뢰 상태 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { STATUS_LIMITS as L, todayKst, type StatusSettings } from '@/lib/status';

const BACK = '/hr-admin/status';

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}

export async function saveStatus(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');

  const raw = String(fd.get('state') ?? '');
  const state = (['open', 'limited', 'closed'] as const).find((s) => s === raw) ?? '';
  const note = String(fd.get('note') ?? '').replace(/\s+/g, ' ').trim();
  if (note.length > L.note) fail(`한 줄 메모는 ${L.note}자 이내로 입력해 주세요. (현재 ${note.length}자)`);
  const showStats = fd.get('showStats') === 'on';

  const db = adminDb();
  const { data: old } = await db.from('site_settings').select('value').eq('key', 'status').maybeSingle();

  const value: StatusSettings = { state, note, updatedAt: todayKst(), showStats };
  const saved = await db.from('site_settings').upsert({ key: 'status', value }, { onConflict: 'key' });
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'status', old?.value ?? null, value);
  redirect(`${BACK}?ok=1`);
}
