// src/app/hr-admin/(panel)/rates/folders/actions.ts — 단가 폴더 저장/삭제/순서 이동
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';

const FOLDERS = '/hr-admin/rates/folders';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const flag = (fd: FormData, k: string) => fd.get(k) === 'on';
const newId = (p: string) => `${p}-${Date.now().toString(36)}`;

function fail(path: string, msg: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}err=${encodeURIComponent(msg)}`);
}

async function guard() {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  return me;
}

const mergeBoth = (old: unknown, ko: string, en: string) => {
  const o: Record<string, unknown> = { ...(old && typeof old === 'object' ? (old as Record<string, unknown>) : {}), ko };
  if (en) o.en = en;
  else delete o.en;
  return o;
};

type FolderRow = Record<string, unknown>;

/** 모든 폴더를 id로 매핑하여 불러옵니다. */
async function loadFolders(): Promise<Map<string, FolderRow>> {
  const db = adminDb();
  const { data, error } = await db.from('price_folders').select('*').order('sort', { ascending: true });
  if (error) fail(FOLDERS, `폴더 불러오기 실패: ${error.message}`);
  const map = new Map<string, FolderRow>();
  for (const f of data ?? []) map.set(f.id, f);
  return map;
}

/** 폴더의 깊이를 계산합니다 (루트 = 0). */
function depth(id: string, map: Map<string, FolderRow>): number {
  let d = 0;
  let cur = map.get(id);
  while (cur?.parent_id) {
    d++;
    cur = map.get(cur.parent_id as string);
    if (d > 10) return 99; // 순환 방지
  }
  return d;
}

/** 폴더의 자손 id 집합을 모읍니다. */
function descendants(id: string, map: Map<string, FolderRow>): Set<string> {
  const set = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const f of map.values()) {
      if ((f.parent_id as string | null) === cur && !set.has(f.id as string)) {
        set.add(f.id as string);
        queue.push(f.id as string);
      }
    }
  }
  return set;
}

export async function saveFolder(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const back = id ? `${FOLDERS}?edit=${encodeURIComponent(id)}` : FOLDERS;

  const parentId = str(fd, 'parentId');
  const name = str(fd, 'name');
  const nameEn = str(fd, 'nameEn');
  const desc = str(fd, 'desc');
  const descEn = str(fd, 'descEn');
  const hidden = flag(fd, 'hidden');

  if (!name) fail(back, '한국어 이름을 입력하세요.');
  if (name.length > 20) fail(back, '한국어 이름은 20자 이내로 입력하세요.');
  if (nameEn.length > 40) fail(back, '영어 이름은 40자 이내로 입력하세요.');
  if (desc.length > 60) fail(back, '한국어 설명은 60자 이내로 입력하세요.');
  if (descEn.length > 120) fail(back, '영어 설명은 120자 이내로 입력하세요.');

  const db = adminDb();
  const map = await loadFolders();

  // parent가 존재하는지 확인
  if (parentId && !map.has(parentId)) fail(back, '상위 폴더를 찾지 못했습니다.');

  // 순환 방지: 자신의 자손의 자식이 될 수 없음
  if (id && parentId) {
    const descIds = descendants(id, map);
    if (descIds.has(parentId)) fail(back, '자신의 하위 폴더를 상위 폴더로 지정할 수 없습니다.');
  }

  // 깊이 제한: 최대 4레벨
  const targetDepth = parentId ? depth(parentId, map) + 1 : 0;
  if (targetDepth > 4) fail(back, '폴더 깊이는 최대 4레벨입니다.');

  // 자식 수 제한: 최대 12개
  if (parentId) {
    const siblingCount = Array.from(map.values()).filter((f) => f.parent_id === parentId && f.id !== id).length;
    if (siblingCount >= 12) fail(back, '한 폴더에 최대 12개의 하위 폴더를 넣을 수 있습니다.');
  }

  let before: Record<string, unknown> | null = null;
  if (id) {
    const r = await db.from('price_folders').select('*').eq('id', id).maybeSingle();
    before = r.data;
    if (!before) fail(back, '수정할 폴더를 찾지 못했습니다.');
  }

  const newParent = parentId || null;
  const row = {
    parent_id: newParent,
    name: mergeBoth(before?.name, name, nameEn),
    descr: mergeBoth(before?.descr, desc, descEn),
    hidden,
  };

  // 같은 상위 폴더 안에서 맨 뒤에 붙는 순서값 (자기 자신은 제외)
  const lastSort = () => {
    const sib = Array.from(map.values()).filter((f) => f.parent_id === newParent && f.id !== id);
    return sib.length ? Math.max(...sib.map((f) => (f.sort as number) ?? 0)) + 1 : 1;
  };

  if (id) {
    // 상위 폴더가 바뀔 때만 새 위치의 맨 뒤로 보냅니다. 이름·설명만 고치면 순서는 그대로입니다.
    const moved = ((before?.parent_id as string | null) ?? null) !== newParent;
    const patch = moved ? { ...row, sort: lastSort() } : row;
    const { error } = await db.from('price_folders').update(patch).eq('id', id);
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'price_folders', id, before, patch);
  } else {
    const nid = newId('fd');
    const created = { id: nid, ...row, sort: lastSort() };
    const { error } = await db.from('price_folders').insert(created);
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'create', 'price_folders', nid, null, created);
  }
  redirect(`${FOLDERS}?ok=1`);
}

export async function removeFolder(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  if (!id) redirect(FOLDERS);
  const db = adminDb();

  const map = await loadFolders();

  // 자식 폴더가 있는지 확인
  const hasChildren = Array.from(map.values()).some((f) => f.parent_id === id);
  if (hasChildren) fail(FOLDERS, '하위 폴더가 들어 있어요. 먼저 하위 폴더를 옮기거나 삭제해 주세요.');

  // 패키지가 있는지 확인
  const { data: pkgs } = await db.from('packages').select('id').eq('folder_id', id);
  if (pkgs && pkgs.length > 0) {
    fail(FOLDERS, `패키지 ${pkgs.length}개가 들어 있어요. 먼저 다른 폴더로 옮겨 주세요.`);
  }

  const { data: before } = await db.from('price_folders').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('price_folders').delete().eq('id', id);
  if (error) fail(FOLDERS, `삭제 실패: ${error.message}`);
  await logEdit(me, 'delete', 'price_folders', id, before, null);
  redirect(`${FOLDERS}?ok=1`);
}

export async function moveFolder(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const dir = str(fd, 'dir') === 'up' ? -1 : 1;
  const db = adminDb();

  const { data: all, error } = await db.from('price_folders').select('*').order('sort', { ascending: true });
  if (error) fail(FOLDERS, `불러오지 못했습니다: ${error.message}`);
  const folders = (all ?? []) as FolderRow[];

  const target = folders.find((x) => x.id === id);
  if (!target) fail(FOLDERS, '폴더를 찾지 못했습니다. 새로고침 후 다시 시도하세요.');
  const pid = target.parent_id as string | null;

  // 같은 상위 폴더 안의 형제만 골라 이웃과 자리를 바꾸고, 그 형제들의 순서값만 다시 매깁니다.
  const siblings = folders.filter((x) => x.parent_id === pid);
  const i = siblings.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= siblings.length) redirect(`${FOLDERS}#row-${id}`); // 맨 위/맨 아래라 옮길 곳이 없음
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  const renumbered = siblings.map((x, k) => ({ ...x, sort: k + 1 }));

  const { error: upsertError } = await db.from('price_folders').upsert(renumbered, { onConflict: 'id' });
  if (upsertError) fail(FOLDERS, `순서 저장 실패: ${upsertError.message}`);
  await logEdit(me, 'update', 'price_folders', id, null, { dir });
  redirect(`${FOLDERS}?ok=1#row-${id}`);
}
