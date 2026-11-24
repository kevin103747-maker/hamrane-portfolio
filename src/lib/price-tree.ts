// src/lib/price-tree.ts — 단가 폴더/슬롯 트리의 순수 계산 (서버·클라이언트 공용, DB 접근 없음)
export type TreeFolder = {
  id: string;
  parent_id: string | null;
  sort: number | null;
};
// 슬롯은 패키지(package_id) 또는 단가 항목(item_id) 중 정확히 하나를 가리킵니다 (CHECK 제약).
export type TreeSlot = {
  id: string;
  folder_id: string | null;
  package_id: string | null;
  item_id: string | null;
  sort: number | null;
};

/** 슬롯이 가리키는 대상. 패키지 또는 단가 항목 하나입니다. */
export type SlotTarget = { packageId: string } | { itemId: string };

export const MAX_DEPTH = 4; // 폴더 깊이 최대 4단계 (최상위 폴더 = 1단계)
export const MAX_CHILDREN = 12; // 폴더당 자식(폴더+슬롯 합계) 최대 12개

const byId = <T extends { id: string }>(rows: T[]) => {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r);
  return m;
};

/** 폴더의 깊이. 최상위 폴더 = 1, parent가 없으면 0. 순환이 있으면 99. */
export function folderDepth(id: string | null, folders: TreeFolder[]): number {
  if (!id) return 0;
  const map = byId(folders);
  let d = 0;
  let cur: string | null = id;
  while (cur) {
    d++;
    const f = map.get(cur);
    if (!f) return 99;
    cur = f.parent_id;
    if (d > 10) return 99;
  }
  return d;
}

/** folderId가 ancestorId의 자손(또는 자기 자신)인지. */
export function isSelfOrDescendant(ancestorId: string, folderId: string, folders: TreeFolder[]): boolean {
  const map = byId(folders);
  let cur: string | null = folderId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = map.get(cur)?.parent_id ?? null;
  }
  return false;
}

/** parentId 아래의 자식 수(폴더 + 슬롯 합계). excludeId는 세지 않습니다. */
export function childCount(
  parentId: string | null,
  folders: TreeFolder[],
  slots: TreeSlot[],
  excludeId?: string,
): number {
  const f = folders.filter((x) => (x.parent_id ?? null) === parentId && x.id !== excludeId).length;
  const s = slots.filter((x) => (x.folder_id ?? null) === parentId).length;
  return f + s;
}

/** parentId 단계의 맨 뒤 sort 값 (자식이 없으면 1). */
export function endSort(parentId: string | null, folders: TreeFolder[], slots: TreeSlot[]): number {
  let max = 0;
  for (const x of folders) if ((x.parent_id ?? null) === parentId) max = Math.max(max, x.sort ?? 0);
  for (const x of slots) if ((x.folder_id ?? null) === parentId) max = Math.max(max, x.sort ?? 0);
  return max + 1;
}

/** 폴더를 newParent 아래로 옮길 수 있는지 사유를 돌려줍니다. 가능하면 null. */
export function folderMoveError(
  folderId: string,
  newParentId: string | null,
  folders: TreeFolder[],
  slots: TreeSlot[],
): string | null {
  if (newParentId === folderId) return '자기 자신에게는 넣을 수 없습니다.';
  if (newParentId && isSelfOrDescendant(folderId, newParentId, folders)) {
    return '자기 하위 폴더 안에는 넣을 수 없습니다.';
  }
  if (folderDepth(newParentId, folders) + 1 > MAX_DEPTH) {
    return `폴더는 최대 ${MAX_DEPTH}단계까지 만들 수 있습니다.`;
  }
  if (childCount(newParentId, folders, slots, folderId) >= MAX_CHILDREN) {
    return `한 폴더에는 폴더와 패키지를 합쳐 최대 ${MAX_CHILDREN}개까지 넣을 수 있습니다.`;
  }
  return null;
}

const slotTargetKey = (s: TreeSlot): string | null =>
  s.package_id ? `p:${s.package_id}` : s.item_id ? `i:${s.item_id}` : null;
const targetKey = (t: SlotTarget): string =>
  'packageId' in t ? `p:${t.packageId}` : `i:${t.itemId}`;

/** 슬롯(패키지·항목 카드)을 newParent로 옮기거나 추가할 수 있는지 사유를 돌려줍니다. */
export function slotMoveError(
  target: SlotTarget,
  newParentId: string | null,
  folders: TreeFolder[],
  slots: TreeSlot[],
  excludeSlotId?: string,
): string | null {
  const tk = targetKey(target);
  if (slots.some((s) => slotTargetKey(s) === tk && (s.folder_id ?? null) === newParentId && s.id !== excludeSlotId)) {
    return 'packageId' in target
      ? '같은 패키지가 이미 그 폴더에 있습니다.'
      : '같은 항목이 이미 그 폴더에 있습니다.';
  }
  const n =
    folders.filter((x) => (x.parent_id ?? null) === newParentId).length +
    slots.filter((x) => (x.folder_id ?? null) === newParentId && x.id !== excludeSlotId).length;
  if (n >= MAX_CHILDREN) {
    return `한 폴더에는 폴더와 패키지를 합쳐 최대 ${MAX_CHILDREN}개까지 넣을 수 있습니다.`;
  }
  return null;
}
