// src/lib/price-tree-data.ts — 공개 단가 폴더/슬롯 트리 조회 (Supabase, 읽기 전용)
// price-tree.ts는 순수 계산만 담당하고, DB 접근은 이 파일이 합니다.
import { cache } from 'react';
import { supabase } from './supabase';

export type PublicNode =
  | { kind: 'folder'; id: string; name: string; desc: string; children: PublicNode[] }
  | { kind: 'package'; id: string };

type FolderRow = {
  id: string; parent_id: string | null; hidden: boolean | null;
  name: { ko?: string; en?: string } | null; descr: { ko?: string; en?: string } | null;
  sort: number | null;
};
type SlotRow = { id: string; folder_id: string | null; package_id: string; sort: number | null };

const pick = (v: { ko?: string; en?: string } | null, lang: string) =>
  lang === 'ko' ? (v?.ko ?? '') : (v?.en || v?.ko || '');
const key = (id: string | null) => id ?? '';
const sortVal = (n: number | null) => n ?? Number.MAX_SAFE_INTEGER;

/**
 * 공개 화면용 단가 트리. 가지치기 규칙:
 * - hidden 폴더와 그 하위 전체 제거 (다른 보이는 폴더의 슬롯은 그대로 유지)
 * - 존재하지 않는 패키지의 슬롯 제거
 * - 보이는 패키지가 하나도 없는 폴더(빈 가지) 제거
 * 같은 부모 안에서 sort 오름차순, 동률은 id.
 * 오류 시 빈 배열 (throw 하지 않음).
 */
export const getPriceTree = cache(async (lang: string): Promise<PublicNode[]> => {
  if (!supabase) return [];
  const sb = supabase;
  const [fo, sl, pk] = await Promise.all([
    sb.from('price_folders').select('*'),
    sb.from('price_slots').select('*'),
    sb.from('packages').select('id'),
  ]);
  const failed = [fo, sl, pk].find((x) => x.error);
  if (failed?.error) {
    console.error('[price-tree] Supabase 조회 실패:', failed.error.message);
    return [];
  }

  const folders = (fo.data ?? []) as FolderRow[];
  const slots = (sl.data ?? []) as SlotRow[];
  const pkgIds = new Set(((pk.data ?? []) as { id: string }[]).map((x) => x.id));
  const fById = new Map(folders.map((f) => [f.id, f]));

  // 숨김 폴더 + 그 하위 전체를 제거 대상으로 표시
  const childFolders = new Map<string, FolderRow[]>();
  for (const f of folders) {
    const pk2 = key(f.parent_id);
    childFolders.set(pk2, [...(childFolders.get(pk2) ?? []), f]);
  }
  const removed = new Set<string>();
  const stack = folders.filter((f) => f.hidden).map((f) => f.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (removed.has(id)) continue;
    removed.add(id);
    for (const c of childFolders.get(id) ?? []) stack.push(c.id);
  }
  const kept = folders.filter((f) => !removed.has(f.id));
  const keptIds = new Set(kept.map((f) => f.id));

  // 슬롯: 숨김/삭제된 폴더 아래가 아니고, 실제 있는 패키지만. 같은 부모+같은 패키지 중복은 첫 번째만.
  const seen = new Set<string>();
  const liveSlots = slots.filter((s) => {
    if (s.folder_id != null && !keptIds.has(s.folder_id)) return false;
    if (!pkgIds.has(s.package_id)) return false;
    const dk = `${key(s.folder_id)}|${s.package_id}`;
    if (seen.has(dk)) return false;
    seen.add(dk);
    return true;
  });

  // 각 부모의 자식 목록 (폴더+슬롯이 sort 번호열 공유)
  type Item = { sort: number; id: string; folder?: FolderRow; pkg?: string };
  const byParent = new Map<string, Item[]>();
  const push = (parent: string, it: Item) => byParent.set(parent, [...(byParent.get(parent) ?? []), it]);
  for (const f of kept) {
    // parent_id가 삭제된 폴더를 가리키면 최상위로 취급
    const parent = f.parent_id != null && keptIds.has(f.parent_id) ? f.parent_id : '';
    push(parent, { sort: sortVal(f.sort), id: f.id, folder: f });
  }
  for (const s of liveSlots) push(key(s.folder_id), { sort: sortVal(s.sort), id: s.id, pkg: s.package_id });
  for (const list of byParent.values()) list.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));

  // 폴더 하위에 보이는 패키지가 있는지 (깊은 폴더부터 계산)
  const depth = new Map<string, number>();
  const dep = (id: string, seen2 = new Set<string>()): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (seen2.has(id)) return 0;
    seen2.add(id);
    const f = fById.get(id);
    const d = f?.parent_id && keptIds.has(f.parent_id) ? dep(f.parent_id, seen2) + 1 : 1;
    depth.set(id, d);
    return d;
  };
  const hasPkg = new Map<string, boolean>();
  const sortedFolders = [...kept].sort((a, b) => dep(b.id) - dep(a.id));
  for (const f of sortedFolders) {
    const direct = (byParent.get(f.id) ?? []).some((it) => it.pkg);
    const viaChild = (childFolders.get(f.id) ?? [])
      .filter((c) => keptIds.has(c.id))
      .some((c) => hasPkg.get(c.id));
    hasPkg.set(f.id, direct || viaChild);
  }

  const emit = (parent: string): PublicNode[] =>
    (byParent.get(parent) ?? []).flatMap((it): PublicNode[] => {
      if (it.pkg) return [{ kind: 'package', id: it.pkg }];
      const f = it.folder!;
      if (!hasPkg.get(f.id)) return [];
      return [{
        kind: 'folder', id: f.id,
        name: pick(f.name, lang), desc: pick(f.descr, lang),
        children: emit(f.id),
      }];
    });

  return emit('');
});
