// src/components/admin/builder/BuilderBoard.tsx — 단가 빌더 본체: 경로·트리·카드 그리드·보관함·편집 패널 + dnd-kit
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, DragOverlay, pointerWithin, closestCorners,
  PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDroppable,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext, rectSortingStrategy, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  saveOrder, moveNode, addSlot, addItemSlot, removeSlot, createFolder,
  toggleFolderHidden, deleteFolder, deletePackage,
} from '@/app/hr-admin/(panel)/rates/builder/actions';
import {
  folderMoveError, slotMoveError, endSort, childCount, folderDepth,
  MAX_CHILDREN, MAX_DEPTH,
} from '@/lib/price-tree';
import type {
  BuilderFolder, BuilderSlot, BuilderPkg, BuilderGroup, BuilderItem,
} from '@/app/hr-admin/(panel)/rates/builder/types';
import type { PackageFormWork } from '@/components/admin/PackageFormFields';
import { LevelCard, AddCard, VaultCard, VaultItemCard, txt, type CardNode, type MenuAction } from './cards';
import { BuilderTree } from './BuilderTree';
import { EditPanel, PackageEditForm, FolderEditForm, FolderPicker, PriceUiForm, ItemEditForm } from './BuilderPanel';

type LNode = { kind: 'folder' | 'slot'; id: string; sort: number };
type EditSel =
  | { type: 'package'; id: string }
  | { type: 'new-package' }
  | { type: 'folder'; id: string }
  | { type: 'item'; id: string; slotId?: string };
type PickerSel =
  | { mode: 'slot-move'; slotId: string }
  | { mode: 'slot-add'; pkgId: string }
  | { mode: 'item-add'; itemId: string }
  | { mode: 'folder-move'; folderId: string };

const sid = (n: LNode) => (n.kind === 'folder' ? `f:${n.id}` : `s:${n.id}`);
/** 슬롯 행이 가리키는 대상. 패키지 슬롯이면 packageId, 항목 슬롯이면 itemId. */
const slotTgt = (s: BuilderSlot) =>
  s.package_id ? { packageId: s.package_id } : s.item_id ? { itemId: s.item_id } : null;
const intoId = (target: string | null, zone: string) => `into:${target ?? 'root'}:${zone}`;
const parseInto = (oid: string): string | null => {
  const rest = oid.slice(5);
  const i = rest.lastIndexOf(':');
  const t = rest.slice(0, i);
  return t === 'root' ? null : t;
};

/** 경로 칸: 클릭 이동 + 놓기 대상 */
function Crumb({ target, label, current, onClick }: { target: string | null; label: string; current: boolean; onClick: () => void }) {
  const d = useDroppable({ id: intoId(target, 'crumb') });
  return (
    <span ref={d.setNodeRef} className={d.isOver ? 'over' : undefined}>
      <button type="button" className={`hr-bld-chip${current ? ' current' : ''}`} onClick={onClick}>
        {label}
      </button>
    </span>
  );
}

export function BuilderBoard({
  folders: folders0, slots: slots0, packages: pkgs0, groups, items, works, folderId, priceUi,
}: {
  folders: BuilderFolder[];
  slots: BuilderSlot[];
  packages: BuilderPkg[];
  groups: BuilderGroup[];
  items: BuilderItem[];
  works: PackageFormWork[];
  folderId: string | null;
  priceUi: { ko: string; en: string };
}) {
  const router = useRouter();
  const [folders, setFolders] = useState(folders0);
  const [slots, setSlots] = useState(slots0);
  const [pkgs, setPkgs] = useState(pkgs0);
  useEffect(() => { setFolders(folders0); setSlots(slots0); setPkgs(pkgs0); }, [folders0, slots0, pkgs0]);

  const [edit, setEdit] = useState<EditSel | null>(null);
  const [picker, setPicker] = useState<PickerSel | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  const altRef = useRef(false);
  const suppressClick = useRef(false);
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === 'Alt') altRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') altRef.current = false; };
    const blur = () => { altRef.current = false; };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  /* ---------- 파생 데이터 ---------- */
  const curFolder = folderId ? folders.find((f) => f.id === folderId) ?? null : null;
  const pid = curFolder?.id ?? null;

  const nodes: LNode[] = useMemo(() => {
    const arr: LNode[] = [
      ...folders.filter((f) => (f.parent_id ?? null) === pid).map((f) => ({ kind: 'folder' as const, id: f.id, sort: f.sort ?? 0 })),
      ...slots.filter((s) => (s.folder_id ?? null) === pid).map((s) => ({ kind: 'slot' as const, id: s.id, sort: s.sort ?? 0 })),
    ];
    return arr.sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
  }, [folders, slots, pid]);

  const pkgById = useMemo(() => new Map(pkgs.map((p) => [p.id, p])), [pkgs]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const groupName = (gid: string) => {
    const g = groups.find((x) => x.id === gid);
    return g ? txt(g.name) : '';
  };
  const slotCountByPkg = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of slots) if (s.package_id) m.set(s.package_id, (m.get(s.package_id) ?? 0) + 1);
    return m;
  }, [slots]);
  const vaultPkgs = useMemo(() => pkgs.filter((p) => !slotCountByPkg.has(p.id)), [pkgs, slotCountByPkg]);
  const slotCountByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of slots) if (s.item_id) m.set(s.item_id, (m.get(s.item_id) ?? 0) + 1);
    return m;
  }, [slots]);
  const vaultItems = useMemo(() => items.filter((i) => !slotCountByItem.has(i.id)), [items, slotCountByItem]);
  // 보관함의 항목은 분야(part_groups) 순서대로 묶어 접이식으로 보여줍니다.
  const vaultGroups = useMemo(() => {
    const byGroup = new Map<string, BuilderItem[]>();
    for (const it of vaultItems) byGroup.set(it.group_id, [...(byGroup.get(it.group_id) ?? []), it]);
    const out = groups
      .map((g) => ({ group: g, list: byGroup.get(g.id) ?? [] }))
      .filter((x) => x.list.length > 0);
    const known = new Set(groups.map((g) => g.id));
    const rest = vaultItems.filter((i) => !known.has(i.group_id));
    if (rest.length) out.push({ group: { id: '__other', num: null, name: { ko: '기타' } }, list: rest });
    return out;
  }, [vaultItems, groups]);

  const crumbPath = useMemo(() => {
    const path: BuilderFolder[] = [];
    let cur = curFolder;
    while (cur) {
      path.unshift(cur);
      cur = folders.find((f) => f.id === cur!.parent_id) ?? null;
    }
    return path;
  }, [curFolder, folders]);

  const levelFull = childCount(pid, folders, slots) >= MAX_CHILDREN;
  const tooDeep = folderDepth(pid, folders) + 1 > MAX_DEPTH;

  /* ---------- 최신 상태를 콜백에서 읽기 위한 ref ---------- */
  const st = useRef({ folders, slots, pkgs, nodes, pid });
  st.current = { folders, slots, pkgs, nodes, pid };

  /* ---------- 서랍 열기/닫기 + 포커스 복귀 ---------- */
  const returnFocus = useRef<HTMLElement | null>(null);
  const openEdit = (sel: EditSel, el?: HTMLElement | null) => {
    if (!edit) {
      const a = el ?? (document.activeElement as HTMLElement | null);
      returnFocus.current = (a?.closest?.('.hr-bld-card, .hr-bld-vaultcard') as HTMLElement | null) ?? a;
    }
    setEdit(sel);
  };
  const closeEdit = () => {
    const el = returnFocus.current;
    returnFocus.current = null;
    setEdit(null);
    requestAnimationFrame(() => {
      if (el?.isConnected) el.focus({ preventScroll: true });
    });
  };

  const snapshot = () => ({ f: folders, s: slots, p: pkgs });
  const restore = (snap: { f: BuilderFolder[]; s: BuilderSlot[]; p: BuilderPkg[] }) => {
    setFolders(snap.f); setSlots(snap.s); setPkgs(snap.p);
  };

  /* ---------- 뮤테이션 ---------- */
  const applyOrder = (next: LNode[]) => {
    const snap = snapshot();
    setFolders((prev) => prev.map((f) => {
      const i = next.findIndex((n) => n.kind === 'folder' && n.id === f.id);
      return i >= 0 ? { ...f, sort: i + 1 } : f;
    }));
    setSlots((prev) => prev.map((s) => {
      const i = next.findIndex((n) => n.kind === 'slot' && n.id === s.id);
      return i >= 0 ? { ...s, sort: i + 1 } : s;
    }));
    const orderedNodes = next.map((n) => ({ kind: n.kind, id: n.id }));
    void (async () => {
      const r = await saveOrder(st.current.pid, orderedNodes);
      if (!r.ok) { restore(snap); showToast(r.error); }
      else router.refresh();
    })();
  };

  const doMoveFolder = async (fid: string, target: string | null) => {
    const S = st.current;
    const why = folderMoveError(fid, target, S.folders, S.slots);
    if (why) { showToast(why); return; }
    const snap = snapshot();
    const sort = endSort(target, S.folders, S.slots);
    setFolders((prev) => prev.map((f) => (f.id === fid ? { ...f, parent_id: target, sort } : f)));
    const r = await moveNode('folder', fid, target);
    if (!r.ok) { restore(snap); showToast(r.error); }
    else router.refresh();
  };

  const doMoveSlot = async (slotId: string, target: string | null) => {
    const S = st.current;
    const slot = S.slots.find((s) => s.id === slotId);
    if (!slot) { showToast('카드를 찾지 못했습니다. 새로고침 후 다시 시도하세요.'); return; }
    const tgt = slotTgt(slot);
    if (!tgt) { showToast('카드를 찾지 못했습니다. 새로고침 후 다시 시도하세요.'); return; }
    const why = slotMoveError(tgt, target, S.folders, S.slots, slot.id);
    if (why) { showToast(why); return; }
    const snap = snapshot();
    const sort = endSort(target, S.folders, S.slots);
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, folder_id: target, sort } : s)));
    const r = await moveNode('slot', slotId, target);
    if (!r.ok) { restore(snap); showToast(r.error); }
    else router.refresh();
  };

  const doAddSlot = async (pkgId: string, target: string | null) => {
    const S = st.current;
    const why = slotMoveError({ packageId: pkgId }, target, S.folders, S.slots);
    if (why) { showToast(why); return; }
    const snap = snapshot();
    const tmpId = `tmp-${Date.now().toString(36)}`;
    const sort = endSort(target, S.folders, S.slots);
    setSlots((prev) => [...prev, { id: tmpId, folder_id: target, package_id: pkgId, item_id: null, sort }]);
    const r = await addSlot(pkgId, target);
    if (!r.ok) { restore(snap); showToast(r.error); }
    else {
      setSlots((prev) => prev.map((s) => (s.id === tmpId ? { ...s, id: r.data.id } : s)));
      router.refresh();
    }
  };

  const doAddItemSlot = async (itemId: string, target: string | null) => {
    const S = st.current;
    const why = slotMoveError({ itemId }, target, S.folders, S.slots);
    if (why) { showToast(why); return; }
    const snap = snapshot();
    const tmpId = `tmp-${Date.now().toString(36)}`;
    const sort = endSort(target, S.folders, S.slots);
    setSlots((prev) => [...prev, { id: tmpId, folder_id: target, package_id: null, item_id: itemId, sort }]);
    const r = await addItemSlot(itemId, target);
    if (!r.ok) { restore(snap); showToast(r.error); }
    else {
      setSlots((prev) => prev.map((s) => (s.id === tmpId ? { ...s, id: r.data.id } : s)));
      router.refresh();
    }
  };

  const doRemoveSlot = async (slotId: string) => {
    const snap = snapshot();
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    const r = await removeSlot(slotId);
    if (!r.ok) { restore(snap); showToast(r.error); }
    else router.refresh();
  };

  const doNudge = (nodeSid: string, dir: -1 | 1) => {
    const cur = st.current.nodes;
    const i = cur.findIndex((n) => sid(n) === nodeSid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= cur.length) return;
    applyOrder(arrayMove(cur, i, j));
  };

  const doAddFolder = async () => {
    const el = document.activeElement as HTMLElement | null;
    const r = await createFolder(st.current.pid);
    if (!r.ok) { showToast(r.error); return; }
    const p = st.current.pid;
    const nf: BuilderFolder = {
      id: r.data.id, parent_id: p, name: { ko: '새 폴더' }, descr: { ko: '' },
      sort: endSort(p, st.current.folders, st.current.slots), hidden: false,
    };
    setFolders((prev) => [...prev, nf]);
    openEdit({ type: 'folder', id: nf.id }, el);
    router.refresh();
  };

  const doToggleHidden = async (folder: BuilderFolder) => {
    const snap = snapshot();
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, hidden: !folder.hidden } : f)));
    const r = await toggleFolderHidden(folder.id, !folder.hidden);
    if (!r.ok) { restore(snap); showToast(r.error); }
    else router.refresh();
  };

  const doDeleteFolder = async (folder: BuilderFolder) => {
    if (!window.confirm(`'${txt(folder.name)}' 폴더를 삭제할까요?`)) return;
    const r = await deleteFolder(folder.id);
    if (!r.ok) { showToast(r.error); return; }
    setFolders((prev) => prev.filter((f) => f.id !== folder.id));
    if (edit?.type === 'folder' && edit.id === folder.id) closeEdit();
    if (folderId === folder.id) router.push('/hr-admin/rates/builder');
    router.refresh();
  };

  const doDeletePackage = async (pkg: BuilderPkg) => {
    const n = slotCountByPkg.get(pkg.id) ?? 0;
    const msg = n > 0
      ? `이 패키지는 ${n}곳에 배치되어 있습니다.\n패키지 본체와 모든 바로가기가 삭제됩니다. 삭제할까요?`
      : '이 패키지를 삭제할까요?';
    if (!window.confirm(msg)) return;
    const snap = snapshot();
    const r = await deletePackage(pkg.id);
    if (!r.ok) { restore(snap); showToast(r.error); return; }
    setPkgs((prev) => prev.filter((p) => p.id !== pkg.id));
    setSlots((prev) => prev.filter((s) => s.package_id !== pkg.id));
    if (edit?.type === 'package' && edit.id === pkg.id) closeEdit();
    router.refresh();
  };

  /* ---------- 피커 ---------- */
  const pickFolder = (target: string | null) => {
    const p = picker;
    setPicker(null);
    if (!p) return;
    if (p.mode === 'folder-move') void doMoveFolder(p.folderId, target);
    else if (p.mode === 'slot-move') void doMoveSlot(p.slotId, target);
    else if (p.mode === 'item-add') void doAddItemSlot(p.itemId, target);
    else void doAddSlot(p.pkgId, target);
  };
  const pickerProps = (() => {
    if (!picker) return null;
    if (picker.mode === 'folder-move') {
      const fid = picker.folderId;
      return {
        title: '폴더 이동',
        validate: (t: string | null) => folderMoveError(fid, t, folders, slots),
      };
    }
    if (picker.mode === 'slot-move') {
      const slot = slots.find((s) => s.id === picker.slotId);
      const tgt = slot ? slotTgt(slot) : null;
      return {
        title: '슬롯 이동',
        validate: (t: string | null) => (slot && tgt ? slotMoveError(tgt, t, folders, slots, slot.id) : '카드를 찾지 못했습니다.'),
      };
    }
    if (picker.mode === 'item-add') {
      return {
        title: '다른 폴더에도 추가',
        hint: '같은 항목의 바로가기를 만듭니다. 원래 카드와 내용이 함께 바뀝니다.',
        validate: (t: string | null) => slotMoveError({ itemId: picker.itemId }, t, folders, slots),
      };
    }
    return {
      title: '다른 폴더에도 추가',
      hint: '같은 패키지의 바로가기를 만듭니다. 원래 카드와 내용이 함께 바뀝니다.',
      validate: (t: string | null) => slotMoveError({ packageId: picker.pkgId }, t, folders, slots),
    };
  })();

  /* ---------- dnd ---------- */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collision: CollisionDetection = (args) => {
    // 폴더 들어가기 영역(경로·트리·폴더 카드 헤더)은 포인터가 올라간 것을 우선합니다.
    const within = pointerWithin(args);
    const intoHits = within.filter((c) => String(c.id).startsWith('into:'));
    if (intoHits.length) return intoHits;
    // 나머지는 sortable 충돌에 맡깁니다. 카드가 하나도 없으면 'grid'를 떨어뜨리기 자리로 씁니다.
    const rest = args.droppableContainers.filter((c) => {
      const id = String(c.id);
      return !id.startsWith('into:') && !id.startsWith('none:') && id !== 'grid';
    });
    const hits = closestCorners({ ...args, droppableContainers: rest });
    if (hits.length || rest.length) return hits;
    return within.filter((c) => c.id === 'grid');
  };

  const onDragStart = (e: DragStartEvent) => {
    suppressClick.current = true;
    setActiveId(String(e.active.id));
  };
  const releaseSuppress = () => {
    setTimeout(() => { suppressClick.current = false; }, 120);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    releaseSuppress();
    const { active, over } = e;
    if (!over) return;
    const aid = String(active.id);
    const oid = String(over.id);
    const aData = active.data.current as { kind?: string; refId?: string } | undefined;
    const S = st.current;

    // 보관함 카드: 항상 "추가"
    if (aid.startsWith('vaulti:')) {
      const itemId = aid.slice(7);
      const target = oid.startsWith('into:') ? parseInto(oid) : S.pid;
      void doAddItemSlot(itemId, target);
      return;
    }
    if (aid.startsWith('vault:')) {
      const pkgId = aid.slice(6);
      const target = oid.startsWith('into:') ? parseInto(oid) : S.pid;
      void doAddSlot(pkgId, target);
      return;
    }
    if (aData?.kind !== 'folder' && aData?.kind !== 'slot') return;

    // 폴더·경로·트리 위에 놓기 = 그 폴더로 이동 (패키지는 Alt면 바로가기 추가)
    if (oid.startsWith('into:')) {
      const target = parseInto(oid);
      if (aData.kind === 'folder') void doMoveFolder(aData.refId!, target);
      else {
        const slot = S.slots.find((s) => s.id === aData.refId);
        if (!slot) return;
        if (altRef.current) {
          if (slot.package_id) void doAddSlot(slot.package_id, target);
          else if (slot.item_id) void doAddItemSlot(slot.item_id, target);
        } else {
          void doMoveSlot(slot.id, target);
        }
      }
      return;
    }

    const cur = S.nodes;
    const activeNode = cur.find((n) => sid(n) === aid);
    if (!activeNode) return;
    if (oid === 'grid') {
      const next = [...cur.filter((n) => sid(n) !== aid), activeNode];
      applyOrder(next);
      return;
    }
    const from = cur.findIndex((n) => sid(n) === aid);
    const to = cur.findIndex((n) => sid(n) === oid);
    if (from < 0 || to < 0 || from === to) return;
    applyOrder(arrayMove(cur, from, to));
  };

  const onDragCancel = () => { setActiveId(null); releaseSuppress(); };

  /* ---------- 카드/메뉴 렌더 ---------- */
  const gridDrop = useDroppable({ id: 'grid' });

  const cardFor = (n: LNode): CardNode | null => {
    if (n.kind === 'folder') {
      const f = folders.find((x) => x.id === n.id);
      return f ? { kind: 'folder', folder: f } : null;
    }
    const s = slots.find((x) => x.id === n.id);
    if (!s) return null;
    if (s.package_id) {
      const p = pkgById.get(s.package_id);
      return p ? { kind: 'slot', slot: s, pkg: p } : null;
    }
    if (s.item_id) {
      const it = itemById.get(s.item_id);
      return it ? { kind: 'itemslot', slot: s, item: it, group: groupName(it.group_id) } : null;
    }
    return null;
  };

  // 카드로 그릴 수 있는 노드만 정렬·표시합니다.
  const visible = nodes
    .map((n, i) => ({ n, i, c: cardFor(n) }))
    .filter((x): x is { n: LNode; i: number; c: CardNode } => x.c !== null);
  const sortableIds = visible.map((x) => sid(x.n));

  const menuFor = (n: LNode): MenuAction[] => {
    if (n.kind === 'folder') {
      const f = folders.find((x) => x.id === n.id);
      if (!f) return [];
      return [
        { label: '수정', onClick: (el) => openEdit({ type: 'folder', id: f.id }, el) },
        { label: '이동…', onClick: () => setPicker({ mode: 'folder-move', folderId: f.id }) },
        { label: f.hidden ? '숨김 해제' : '숨김', onClick: () => void doToggleHidden(f) },
        'sep',
        { label: '삭제', danger: true, onClick: () => void doDeleteFolder(f) },
      ];
    }
    const s = slots.find((x) => x.id === n.id);
    if (!s) return [];
    if (s.item_id) {
      const it = itemById.get(s.item_id);
      if (!it) return [];
      return [
        { label: '이동…', onClick: () => setPicker({ mode: 'slot-move', slotId: s.id }) },
        { label: '다른 폴더에도 추가', onClick: () => setPicker({ mode: 'item-add', itemId: it.id }) },
        'sep',
        { label: '여기서 빼기', onClick: () => void doRemoveSlot(s.id) },
      ];
    }
    const p = s.package_id ? pkgById.get(s.package_id) : undefined;
    if (!p) return [];
    return [
      { label: '수정', onClick: (el) => openEdit({ type: 'package', id: p.id }, el) },
      { label: '이동…', onClick: () => setPicker({ mode: 'slot-move', slotId: s.id }) },
      { label: '다른 폴더에도 추가', onClick: () => setPicker({ mode: 'slot-add', pkgId: p.id }) },
      'sep',
      { label: '여기서 빼기', onClick: () => void doRemoveSlot(s.id) },
      'sep',
      { label: '패키지 삭제', danger: true, onClick: () => void doDeletePackage(p) },
    ];
  };

  const vaultMenu = (p: BuilderPkg): MenuAction[] => [
    { label: '수정', onClick: (el) => openEdit({ type: 'package', id: p.id }, el) },
    { label: '이동…', onClick: () => setPicker({ mode: 'slot-add', pkgId: p.id }) },
    'sep',
    { label: '패키지 삭제', danger: true, onClick: () => void doDeletePackage(p) },
  ];

  const vaultItemMenu = (it: BuilderItem): MenuAction[] => [
    { label: '이동…', onClick: () => setPicker({ mode: 'item-add', itemId: it.id }) },
  ];

  const editPkg = edit?.type === 'package' ? pkgs.find((p) => p.id === edit.id) ?? null : null;
  const editFolder = edit?.type === 'folder' ? folders.find((f) => f.id === edit.id) ?? null : null;
  const editItem = edit?.type === 'item' ? items.find((i) => i.id === edit.id) ?? null : null;

  const drawerTitle = !edit ? ''
    : edit.type === 'new-package' ? '새 패키지'
    : edit.type === 'folder' ? (editFolder ? `폴더 수정 · ${txt(editFolder.name)}` : '폴더 수정')
    : edit.type === 'item' ? (editItem ? `단가 항목 · ${txt(editItem.name)}` : '단가 항목')
    : (editPkg ? `패키지 수정 · ${txt(editPkg.name)}` : '패키지 수정');
  const drawerKey = edit ? `${edit.type}:${edit.type === 'new-package' ? 'new' : edit.id}` : '';

  const overlayNode = (() => {
    if (!activeId) return null;
    if (activeId.startsWith('vaulti:')) {
      const it = itemById.get(activeId.slice(7));
      return it ? <div className="hr-bld-card itemslot ghost">{txt(it.name)}</div> : null;
    }
    if (activeId.startsWith('vault:')) {
      const p = pkgById.get(activeId.slice(6));
      return p ? <div className="hr-bld-card pkg ghost">{txt(p.name)}</div> : null;
    }
    const n = nodes.find((x) => sid(x) === activeId);
    if (!n) return null;
    const c = cardFor(n);
    if (!c) return null;
    return (
      <div className={`hr-bld-card ${c.kind === 'itemslot' ? 'itemslot' : c.kind} ghost`}>
        {c.kind === 'folder' ? txt(c.folder.name) : c.kind === 'itemslot' ? txt(c.item.name) : txt(c.pkg.name)}
      </div>
    );
  })();

  const navigate = (id: string | null) => {
    router.push(id ? `/hr-admin/rates/builder?f=${encodeURIComponent(id)}` : '/hr-admin/rates/builder');
  };

  return (
    <div className="hr-pn-body hr-bld-body">
      <h1>단가 빌더</h1>
      <p className="hr-lead">
        폴더와 패키지를 카드로 놓고 끌어 배치합니다. 카드 위쪽(폴더는 아이콘·이름 영역)을 다른 폴더에 놓으면 이동하고,
        패키지는 Alt(Option)를 누른 채 놓으면 이동 대신 바로가기를 만듭니다.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div className="hr-bld2">
          <BuilderTree folders={folders} currentId={pid} onNavigate={navigate} />

          <div className="hr-bld-main">
            {pid === null && (
              <PriceUiForm key={`${priceUi.ko}${priceUi.en}`} cur={priceUi} onToast={showToast} />
            )}
            <nav className="hr-bld-crumb" aria-label="경로">
              <Crumb target={null} label="단가" current={pid === null} onClick={() => navigate(null)} />
              {crumbPath.map((f, i) => (
                <span key={f.id} className="hr-bld-crumb-sep">
                  ›
                  <Crumb
                    target={f.id}
                    label={txt(f.name)}
                    current={i === crumbPath.length - 1}
                    onClick={() => navigate(f.id)}
                  />
                </span>
              ))}
            </nav>

            <div ref={gridDrop.setNodeRef} className={`hr-bld-grid hr-bld-grid2${gridDrop.isOver ? ' over' : ''}`}>
              <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                {visible.map(({ n, i, c }) => (
                  <LevelCard
                    key={sid(n)}
                    node={c}
                    index={i}
                    count={nodes.length}
                    shortcut={c.kind === 'slot'
                      ? (slotCountByPkg.get(c.slot.package_id ?? '') ?? 0) > 1
                      : c.kind === 'itemslot' ? (slotCountByItem.get(c.item.id) ?? 0) > 1 : false}
                    menuActions={menuFor(n)}
                    onOpen={(el) => {
                      if (c.kind === 'folder') navigate(c.folder.id);
                      else if (c.kind === 'itemslot') openEdit({ type: 'item', id: c.item.id, slotId: c.slot.id }, el);
                      else openEdit({ type: 'package', id: c.pkg.id }, el);
                    }}
                    onNudge={(dir) => doNudge(sid(n), dir)}
                    suppressed={() => suppressClick.current}
                  />
                ))}
              </SortableContext>
              <AddCard label="폴더" onClick={() => void doAddFolder()} disabled={levelFull || tooDeep} />
              <AddCard label="패키지" onClick={(e) => openEdit({ type: 'new-package' }, e.currentTarget)} />
            </div>

            {vaultGroups.length > 0 && (
              <section className="hr-card hr-bld-vault">
                <h2>어디에도 배치되지 않은 단가 항목 ({vaultItems.length})</h2>
                <p>카드를 폴더·경로·트리 위에 놓거나 &quot;이동…&quot;으로 배치합니다.</p>
                {vaultGroups.map(({ group, list }) => (
                  <details key={group.id} className="hr-bld-vgroup">
                    <summary>{txt(group.name)} ({list.length})</summary>
                    <div className="hr-bld-vaultlist">
                      {list.map((it) => (
                        <VaultItemCard
                          key={it.id}
                          item={it}
                          group=""
                          menuActions={vaultItemMenu(it)}
                          onOpen={(el) => openEdit({ type: 'item', id: it.id }, el)}
                          suppressed={() => suppressClick.current}
                        />
                      ))}
                    </div>
                  </details>
                ))}
              </section>
            )}

            {vaultPkgs.length > 0 && (
              <section className="hr-card hr-bld-vault">
                <h2>어디에도 배치되지 않은 패키지 ({vaultPkgs.length})</h2>
                <p>카드를 폴더·경로·트리 위에 놓거나 &quot;이동…&quot;으로 배치합니다.</p>
                <div className="hr-bld-vaultlist">
                  {vaultPkgs.map((p) => (
                    <VaultCard
                      key={p.id}
                      pkg={p}
                      menuActions={vaultMenu(p)}
                      onOpen={(el) => openEdit({ type: 'package', id: p.id }, el)}
                      suppressed={() => suppressClick.current}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {edit && (
          <EditPanel title={drawerTitle} focusKey={drawerKey} onClose={closeEdit}>
            {edit.type === 'new-package' && (
              <PackageEditForm
                key="new"
                pkg={null}
                isNew
                slotFolderId={pid}
                groups={groups}
                items={items}
                works={works}
                pkgCount={pkgs.length}
                onClose={closeEdit}
                onToast={showToast}
                onSaved={(pkg, slot) => {
                  setPkgs((prev) => {
                    const i = prev.findIndex((x) => x.id === pkg.id);
                    return i >= 0 ? prev.map((x, j) => (j === i ? { ...x, ...pkg } : x)) : [...prev, pkg as BuilderPkg];
                  });
                  if (slot) {
                    setSlots((prev) => [...prev.filter((s) => s.id !== slot.id), slot as BuilderSlot]);
                  }
                  setEdit({ type: 'package', id: String(pkg.id) });
                  router.refresh();
                }}
              />
            )}
            {edit.type === 'package' && (
              editPkg ? (
                <PackageEditForm
                  key={editPkg.id}
                  pkg={editPkg}
                  isNew={false}
                  slotFolderId={null}
                  groups={groups}
                  items={items}
                  works={works}
                  pkgCount={pkgs.length}
                  onClose={closeEdit}
                  onToast={showToast}
                  onSaved={(pkg) => {
                    setPkgs((prev) => prev.map((x) => (x.id === pkg.id ? { ...x, ...pkg } : x)));
                    router.refresh();
                  }}
                />
              ) : (
                <div className="hr-card"><p>패키지를 찾을 수 없습니다. 삭제되었을 수 있습니다.</p><button type="button" onClick={closeEdit}>닫기</button></div>
              )
            )}
            {edit.type === 'item' && (
              editItem ? (
                <ItemEditForm
                  key={editItem.id}
                  item={editItem}
                  group={groupName(editItem.group_id)}
                  slotId={edit.slotId}
                  onClose={closeEdit}
                  onRemove={edit.slotId ? () => {
                    const sid2 = edit.slotId!;
                    if (!window.confirm(`이 카드를 이 폴더에서 뺄까요?`)) return;
                    void doRemoveSlot(sid2);
                    closeEdit();
                  } : undefined}
                />
              ) : (
                <div className="hr-card"><p>단가 항목을 찾을 수 없습니다.</p><button type="button" onClick={closeEdit}>닫기</button></div>
              )
            )}
            {edit.type === 'folder' && (
              editFolder ? (
                <FolderEditForm
                  key={editFolder.id}
                  folder={editFolder}
                  onClose={closeEdit}
                  onToast={showToast}
                  onSaved={(f) => {
                    setFolders((prev) => prev.map((x) => (x.id === f.id ? { ...x, ...f } : x)));
                    router.refresh();
                  }}
                />
              ) : (
                <div className="hr-card"><p>폴더를 찾을 수 없습니다.</p><button type="button" onClick={closeEdit}>닫기</button></div>
              )
            )}
          </EditPanel>
        )}

        {picker && pickerProps && (
          <FolderPicker
            folders={folders}
            title={pickerProps.title}
            hint={pickerProps.hint}
            validate={pickerProps.validate}
            onPick={pickFolder}
            onCancel={() => setPicker(null)}
          />
        )}

        <DragOverlay dropAnimation={null}>
          {overlayNode}
        </DragOverlay>
      </DndContext>

      {toast && <p role="alert" className="hr-flash bad hr-bld-toast">{toast}</p>}
    </div>
  );
}
