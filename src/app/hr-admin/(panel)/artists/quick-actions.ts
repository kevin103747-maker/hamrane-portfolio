// src/app/hr-admin/(panel)/artists/quick-actions.ts — 아티스트 목록에서 바로 저장(유형·숨김·순서)
'use server';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';

type Res = { ok: true } | { ok: false; msg: string };

async function admin() {
  const me = await requireAdmin();
  return can(me, 'artists') ? me : null;
}

/** 유형 또는 "아티스트 칸에서 숨기기"를 바로 저장합니다. */
export async function quickSetArtist(
  id: string,
  patch: { typeIds?: string[]; hideInStrip?: boolean },
): Promise<Res> {
  const me = await admin();
  if (!me) return { ok: false, msg: '권한이 없습니다.' };
  if (!id) return { ok: false, msg: '잘못된 요청입니다.' };

  const db = adminDb();
  const upd: { type_ids?: string[]; hide_in_strip?: boolean } = {};

  if (patch.typeIds !== undefined) {
    if (!Array.isArray(patch.typeIds) || patch.typeIds.length > 50) return { ok: false, msg: '잘못된 요청입니다.' };
    const t = await db.from('artist_types').select('id');
    if (t.error) return { ok: false, msg: `유형을 확인하지 못했습니다: ${t.error.message}` };
    const valid = new Set((t.data ?? []).map((x) => x.id as string));
    const ids = [...new Set(patch.typeIds.map(String))];
    if (ids.some((x) => !valid.has(x))) return { ok: false, msg: '없는 유형이 포함돼 있습니다. 새로고침 후 다시 시도하세요.' };
    upd.type_ids = ids;
  }
  if (patch.hideInStrip !== undefined) upd.hide_in_strip = !!patch.hideInStrip;
  if (!Object.keys(upd).length) return { ok: true };

  const { data: before } = await db.from('artists').select('*').eq('id', id).maybeSingle();
  if (!before) return { ok: false, msg: '아티스트를 찾지 못했습니다. 새로고침 후 다시 시도하세요.' };

  const { error } = await db.from('artists').update(upd).eq('id', id);
  if (error) return { ok: false, msg: `저장 실패: ${error.message}` };

  await logEdit(me, 'update', 'artists', id, before, upd);
  return { ok: true };
}

/**
 * 드래그로 바꾼 순서를 저장합니다.
 * orderedIds = 화면에 보이던 아티스트들의 "새 순서". 이들이 원래 차지하던 자리 안에서만 서로 자리를 바꾸므로,
 * 검색 중이거나 페이지가 나뉘어 있어도 보이지 않는 아티스트의 위치는 그대로입니다.
 */
export async function reorderArtists(orderedIds: string[]): Promise<Res> {
  const me = await admin();
  if (!me) return { ok: false, msg: '권한이 없습니다.' };

  const ids = Array.isArray(orderedIds) ? orderedIds.map(String) : [];
  if (ids.length < 2 || ids.length > 500 || new Set(ids).size !== ids.length) return { ok: false, msg: '잘못된 요청입니다.' };

  const db = adminDb();
  const { data, error } = await db.from('artists').select('id, sort').order('sort', { ascending: true }).order('name', { ascending: true });
  if (error) return { ok: false, msg: `순서를 불러오지 못했습니다: ${error.message}` };

  const order = (data ?? []).map((x) => ({ id: x.id as string, old: Number(x.sort) || 0 }));
  const want = new Set(ids);
  const slots = order.map((x, i) => (want.has(x.id) ? i : -1)).filter((i) => i >= 0);
  if (slots.length !== ids.length) return { ok: false, msg: '목록이 바뀌었습니다. 새로고침 후 다시 시도하세요.' };

  const nextIds = order.map((x) => x.id);
  slots.forEach((slot, k) => { nextIds[slot] = ids[k]; });

  const oldSort = new Map(order.map((x): [string, number] => [x.id, x.old]));
  const changed = nextIds.map((id, i) => ({ id, sort: i })).filter((x) => oldSort.get(x.id) !== x.sort);
  if (!changed.length) return { ok: true };

  for (let i = 0; i < changed.length; i += 20) {
    const res = await Promise.all(
      changed.slice(i, i + 20).map((x) => db.from('artists').update({ sort: x.sort }).eq('id', x.id)),
    );
    const bad = res.find((r) => r.error);
    if (bad?.error) return { ok: false, msg: `순서 저장 실패: ${bad.error.message} (새로고침해서 실제 순서를 확인하세요)` };
  }

  await logEdit(me, 'update', 'artists', '-', { order: slots.map((i) => order[i].id) }, { order: ids });
  return { ok: true };
}
