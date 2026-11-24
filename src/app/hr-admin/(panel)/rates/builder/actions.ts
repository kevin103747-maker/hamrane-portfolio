// src/app/hr-admin/(panel)/rates/builder/actions.ts — 단가 빌더: 순서·이동·슬롯·삭제 (리다이렉트 없이 결과를 돌려줍니다)
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { str, newId, mergeBoth, pickSort } from '@/lib/admin/forms';
import { parsePackageForm, parseFolderForm } from '@/lib/admin/rate-forms';
import {
  folderDepth, folderMoveError, slotMoveError, endSort, MAX_DEPTH, MAX_CHILDREN,
  type TreeFolder, type TreeSlot,
} from '@/lib/price-tree';
import type { BuilderResult, BuilderResultData } from './types';

type FolderRow = Record<string, unknown> & { id: string; parent_id: string | null };
type SlotRow = Record<string, unknown> & { id: string; folder_id: string | null; package_id: string };

const err = (error: string): BuilderResult => ({ ok: false, error });
const ok = (): BuilderResult => ({ ok: true });

async function guard() {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  return me;
}

async function loadTree(): Promise<{ folders: FolderRow[]; slots: SlotRow[] } | { error: string }> {
  const db = adminDb();
  const [f, s] = await Promise.all([
    db.from('price_folders').select('*'),
    db.from('price_slots').select('*'),
  ]);
  const bad = f.error ?? s.error;
  if (bad) return { error: `불러오지 못했습니다: ${bad.message}` };
  return { folders: (f.data ?? []) as FolderRow[], slots: (s.data ?? []) as SlotRow[] };
}

const asTree = (folders: FolderRow[], slots: SlotRow[]) => ({
  folders: folders as unknown as TreeFolder[],
  slots: slots as unknown as TreeSlot[],
});

/* ---------------- 같은 단계 순서 저장 ---------------- */
export async function saveOrder(
  parentId: string | null,
  nodes: { kind: 'folder' | 'slot'; id: string }[],
): Promise<BuilderResult> {
  const me = await guard();
  const t = await loadTree();
  if ('error' in t) return err(t.error);
  const { folders, slots } = t;
  const pid = parentId || null;

  const expF = new Set(folders.filter((x) => (x.parent_id ?? null) === pid).map((x) => x.id));
  const expS = new Set(slots.filter((x) => (x.folder_id ?? null) === pid).map((x) => x.id));
  if (nodes.length !== expF.size + expS.size) {
    return err('화면과 저장된 목록이 다릅니다. 새로고침 후 다시 시도하세요.');
  }

  const seen = new Set<string>();
  const folderSorts: { id: string; sort: number }[] = [];
  const slotSorts: { id: string; sort: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const key = `${n.kind}:${n.id}`;
    if (seen.has(key) || (n.kind === 'folder' ? !expF.has(n.id) : !expS.has(n.id))) {
      return err('화면과 저장된 목록이 다릅니다. 새로고침 후 다시 시도하세요.');
    }
    seen.add(key);
    (n.kind === 'folder' ? folderSorts : slotSorts).push({ id: n.id, sort: i + 1 });
  }

  const db = adminDb();
  for (const r of folderSorts) {
    const { error } = await db.from('price_folders').update({ sort: r.sort }).eq('id', r.id);
    if (error) return err(`순서 저장 실패: ${error.message}`);
  }
  for (const r of slotSorts) {
    const { error } = await db.from('price_slots').update({ sort: r.sort }).eq('id', r.id);
    if (error) return err(`순서 저장 실패: ${error.message}`);
  }
  await logEdit(me, 'update', 'price_slots', pid ?? 'root', null, { order: nodes });
  return ok();
}

/* ---------------- 폴더·슬롯 이동 ---------------- */
export async function moveNode(
  kind: 'folder' | 'slot',
  id: string,
  newParentId: string | null,
): Promise<BuilderResult> {
  const me = await guard();
  const t = await loadTree();
  if ('error' in t) return err(t.error);
  const { folders, slots } = t;
  const { folders: tf, slots: ts } = asTree(folders, slots);
  const pid = newParentId || null;
  const db = adminDb();

  if (kind === 'folder') {
    const f = folders.find((x) => x.id === id);
    if (!f) return err('폴더를 찾지 못했습니다. 새로고침 후 다시 시도하세요.');
    if (pid && !folders.some((x) => x.id === pid)) return err('상위 폴더를 찾지 못했습니다.');
    const why = folderMoveError(id, pid, tf, ts);
    if (why) return err(why);
    const sort = endSort(pid, tf, ts);
    const { error } = await db.from('price_folders').update({ parent_id: pid, sort }).eq('id', id);
    if (error) return err(`이동 실패: ${error.message}`);
    await logEdit(me, 'update', 'price_folders', id, f, { parent_id: pid, sort });
    return ok();
  }

  const s = slots.find((x) => x.id === id);
  if (!s) return err('카드를 찾지 못했습니다. 새로고침 후 다시 시도하세요.');
  if (pid && !folders.some((x) => x.id === pid)) return err('상위 폴더를 찾지 못했습니다.');
  const why = slotMoveError(s.package_id, pid, tf, ts, s.id);
  if (why) return err(why);
  const sort = endSort(pid, tf, ts);
  const { error } = await db.from('price_slots').update({ folder_id: pid, sort }).eq('id', id);
  if (error) return err(`이동 실패: ${error.message}`);
  await logEdit(me, 'update', 'price_slots', id, s, { folder_id: pid, sort });
  return ok();
}

/* ---------------- 슬롯(바로가기) 추가·삭제 ---------------- */
export async function addSlot(
  packageId: string,
  folderId: string | null,
): Promise<BuilderResultData<{ id: string }>> {
  const me = await guard();
  const db = adminDb();
  const t = await loadTree();
  if ('error' in t) return { ok: false, error: t.error };
  const { folders, slots } = t;
  const { folders: tf, slots: ts } = asTree(folders, slots);
  const pid = folderId || null;

  const { data: pkg } = await db.from('packages').select('id').eq('id', packageId).maybeSingle();
  if (!pkg) return { ok: false, error: '패키지를 찾지 못했습니다. 새로고침 후 다시 시도하세요.' };
  if (pid && !folders.some((x) => x.id === pid)) return { ok: false, error: '폴더를 찾지 못했습니다.' };
  const why = slotMoveError(packageId, pid, tf, ts);
  if (why) return { ok: false, error: why };

  const nid = newId('sl');
  const row = { id: nid, folder_id: pid, package_id: packageId, sort: endSort(pid, tf, ts) };
  const { error } = await db.from('price_slots').insert(row);
  if (error) return { ok: false, error: `추가 실패: ${error.message}` };
  await logEdit(me, 'create', 'price_slots', nid, null, row);
  return { ok: true, data: { id: nid } };
}

export async function removeSlot(slotId: string): Promise<BuilderResult> {
  const me = await guard();
  const db = adminDb();
  const { data: before } = await db.from('price_slots').select('*').eq('id', slotId).maybeSingle();
  const { error } = await db.from('price_slots').delete().eq('id', slotId);
  if (error) return err(`삭제 실패: ${error.message}`);
  await logEdit(me, 'delete', 'price_slots', slotId, before, null);
  return ok();
}

/* ---------------- 폴더 만들기·이름/설명/숨김 ---------------- */
export async function createFolder(
  parentId: string | null,
): Promise<BuilderResultData<{ id: string }>> {
  const me = await guard();
  const db = adminDb();
  const t = await loadTree();
  if ('error' in t) return { ok: false, error: t.error };
  const { folders, slots } = t;
  const { folders: tf, slots: ts } = asTree(folders, slots);
  const pid = parentId || null;

  if (pid && !folders.some((x) => x.id === pid)) return { ok: false, error: '상위 폴더를 찾지 못했습니다.' };
  if (folderDepth(pid, tf) + 1 > MAX_DEPTH) {
    return { ok: false, error: `폴더는 최대 ${MAX_DEPTH}단계까지 만들 수 있습니다.` };
  }
  if (tf.filter((x) => (x.parent_id ?? null) === pid).length + ts.filter((x) => (x.folder_id ?? null) === pid).length >= MAX_CHILDREN) {
    return { ok: false, error: `한 폴더에는 폴더와 패키지를 합쳐 최대 ${MAX_CHILDREN}개까지 넣을 수 있습니다.` };
  }

  const nid = newId('fd');
  const row = {
    id: nid, parent_id: pid, name: { ko: '새 폴더' }, descr: { ko: '' },
    hidden: false, sort: endSort(pid, tf, ts),
  };
  const { error } = await db.from('price_folders').insert(row);
  if (error) return { ok: false, error: `만들기 실패: ${error.message}` };
  await logEdit(me, 'create', 'price_folders', nid, null, row);
  return { ok: true, data: { id: nid } };
}

export async function saveFolderFields(fd: FormData): Promise<BuilderResultData<Record<string, unknown>>> {
  const me = await guard();
  const p = parseFolderForm(fd);
  if (!p.ok) return { ok: false, error: p.error };
  const { id, name, nameEn, desc, descEn, hidden, question, questionEn } = p.data;
  if (!id) return { ok: false, error: '수정할 폴더가 없습니다.' };

  const db = adminDb();
  const { data: before } = await db.from('price_folders').select('*').eq('id', id).maybeSingle();
  if (!before) return { ok: false, error: '폴더를 찾지 못했습니다. 새로고침 후 다시 시도하세요.' };

  const row = {
    name: mergeBoth(before.name, name, nameEn),
    descr: mergeBoth(before.descr, desc, descEn),
    question: mergeBoth(before.question, question, questionEn),
    hidden,
  };
  const { error } = await db.from('price_folders').update(row).eq('id', id);
  if (error) return { ok: false, error: `저장 실패: ${error.message}` };
  await logEdit(me, 'update', 'price_folders', id, before, row);
  return { ok: true, data: { id, ...before, ...row } };
}

export async function toggleFolderHidden(id: string, hidden: boolean): Promise<BuilderResult> {
  const me = await guard();
  const db = adminDb();
  const { data: before } = await db.from('price_folders').select('*').eq('id', id).maybeSingle();
  if (!before) return err('폴더를 찾지 못했습니다.');
  const { error } = await db.from('price_folders').update({ hidden: !!hidden }).eq('id', id);
  if (error) return err(`변경 실패: ${error.message}`);
  await logEdit(me, 'update', 'price_folders', id, before, { hidden: !!hidden });
  return ok();
}

export async function deleteFolder(id: string): Promise<BuilderResult> {
  const me = await guard();
  const t = await loadTree();
  if ('error' in t) return err(t.error);
  const { folders, slots } = t;

  if (folders.some((x) => x.parent_id === id)) {
    return err('하위 폴더가 들어 있어요. 먼저 하위 폴더를 옮기거나 삭제해 주세요.');
  }
  const n = slots.filter((x) => x.folder_id === id).length;
  if (n > 0) return err(`패키지 ${n}개가 이 폴더에 배치되어 있어요. 먼저 다른 폴더로 옮기거나 빼 주세요.`);

  const db = adminDb();
  const { data: before } = await db.from('price_folders').select('*').eq('id', id).maybeSingle();
  if (!before) return err('폴더를 찾지 못했습니다.');
  const { error } = await db.from('price_folders').delete().eq('id', id);
  if (error) return err(`삭제 실패: ${error.message}`);
  await logEdit(me, 'delete', 'price_folders', id, before, null);
  return ok();
}

/* ---------------- 공개 단가 화면 최상위 질문 (site_settings 'price_ui') ---------------- */
export async function savePriceUi(fd: FormData): Promise<BuilderResult> {
  const me = await guard();
  const ko = str(fd, 'question');
  const en = str(fd, 'questionEn');
  if (ko.length > 40) return err('한국어 질문은 40자 이내로 입력하세요.');
  if (en.length > 80) return err('영어 질문은 80자 이내로 입력하세요.');

  const db = adminDb();
  const { data: old } = await db.from('site_settings').select('value').eq('key', 'price_ui').maybeSingle();
  const prev = old?.value && typeof old.value === 'object' && !Array.isArray(old.value)
    ? (old.value as Record<string, unknown>) : {};
  const prevQ = prev.question && typeof prev.question === 'object' && !Array.isArray(prev.question)
    ? (prev.question as Record<string, unknown>) : {};
  const value = { ...prev, question: mergeBoth(prevQ, ko, en) };

  const { error } = await db.from('site_settings').upsert({ key: 'price_ui', value }, { onConflict: 'key' });
  if (error) return err(`저장 실패: ${error.message}`);
  await logEdit(me, 'update', 'site_settings', 'price_ui', old?.value ?? null, value);
  return ok();
}

/* ---------------- 패키지 저장·삭제 (빌더 패널) ---------------- */
export async function savePackageBuilder(
  fd: FormData,
): Promise<BuilderResultData<{ pkg: Record<string, unknown>; slot: { id: string; folder_id: string | null; package_id: string; sort: number } | null }>> {
  const me = await guard();
  const p = await parsePackageForm(fd);
  if (!p.ok) return { ok: false, error: p.error };
  const d = p.data;

  const db = adminDb();
  let before: Record<string, unknown> | null = null;
  if (d.id) {
    const r = await db.from('packages').select('*').eq('id', d.id).maybeSingle();
    before = r.data;
    if (!before) return { ok: false, error: '수정할 패키지를 찾지 못했습니다.' };
  }

  const row = {
    num: d.num, tag: d.tag,
    name: mergeBoth(before?.name, d.name, d.nameEn),
    descr: mergeBoth(before?.descr, d.desc, d.descEn),
    item_ids: d.itemIds,
    qty: d.qty,
    prices: d.prices,
    prices_usd: d.pricesUsd,
    est: d.est,
    extras: d.extras,
    total: d.total,
    total_usd: d.totalUsd,
    discount: d.discount,
    optional: d.optional,
    sort: await pickSort(fd, 'packages', before?.sort as number | undefined),
  };

  let pkgId = d.id;
  if (d.id) {
    const { error } = await db.from('packages').update(row).eq('id', d.id);
    if (error) return { ok: false, error: `저장 실패: ${error.message}` };
    await logEdit(me, 'update', 'packages', d.id, before, row);
  } else {
    pkgId = newId('pk');
    const { error } = await db.from('packages').insert({ id: pkgId, ...row });
    if (error) return { ok: false, error: `저장 실패: ${error.message}` };
    await logEdit(me, 'create', 'packages', pkgId, null, row);
  }

  // 새 패키지는 slotFolderId 입력칸이 있으면(최상위도 포함) 그 폴더 끝에 바로가기를 만듭니다.
  let slot: { id: string; folder_id: string | null; package_id: string; sort: number } | null = null;
  const hasSlotTarget = fd.has('slotFolderId');
  const slotFolderId = str(fd, 'slotFolderId') || null;
  if (!d.id && hasSlotTarget) {
    const t = await loadTree();
    if (!('error' in t)) {
      const { folders, slots } = t;
      const { folders: tf, slots: ts } = asTree(folders, slots);
      const pid = slotFolderId;
      const folderOk = !pid || folders.some((x) => x.id === pid);
      const why = folderOk ? slotMoveError(pkgId, pid, tf, ts) : '폴더를 찾지 못했습니다.';
      if (!why) {
        const sid = newId('sl');
        slot = { id: sid, folder_id: pid, package_id: pkgId, sort: endSort(pid, tf, ts) };
        const { error } = await db.from('price_slots').insert(slot);
        if (!error) await logEdit(me, 'create', 'price_slots', sid, null, slot);
        else slot = null;
      }
    }
  }

  const { data: saved } = await db.from('packages').select('*').eq('id', pkgId).maybeSingle();
  return { ok: true, data: { pkg: (saved ?? { id: pkgId, ...row }) as Record<string, unknown>, slot } };
}

export async function deletePackage(id: string): Promise<BuilderResultData<{ slots: number }>> {
  const me = await guard();
  const db = adminDb();
  const { data: before } = await db.from('packages').select('*').eq('id', id).maybeSingle();
  if (!before) return { ok: false, error: '패키지를 찾지 못했습니다.' };

  const { data: slots } = await db.from('price_slots').select('id').eq('package_id', id);
  const n = slots?.length ?? 0;
  if (n) {
    const { error } = await db.from('price_slots').delete().eq('package_id', id);
    if (error) return { ok: false, error: `바로가기 삭제 실패: ${error.message}` };
  }
  const { error } = await db.from('packages').delete().eq('id', id);
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` };
  await logEdit(me, 'delete', 'packages', id, before, { slots: n });
  return { ok: true, data: { slots: n } };
}
