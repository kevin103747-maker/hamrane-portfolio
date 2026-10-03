/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/hr-admin/(panel)/groups/actions.ts — 분야·파트 추가/수정/삭제/순서 변경
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';

const BACK = '/hr-admin/groups';
type Row = Record<string, any>;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const oneLine = (fd: FormData, k: string) => str(fd, k).replace(/\s+/g, ' ');
const newId = (p: string) => `${p}-${Date.now().toString(36)}`;
const pad = (n: number) => String(n).padStart(2, '0');

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}
/** 저장 성공: 해당 분야 카드 위치로 돌아와 그 카드 안에 "저장했습니다"를 보여 줍니다. */
function done(anchor: string): never {
  redirect(`${BACK}?ok=${encodeURIComponent(anchor)}#${anchor}`);
}

async function guard() {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  return me;
}

/** 기존 값(다른 언어 키)을 보존하고 ko만 덮어씁니다. */
const merge = (old: unknown, ko: string) => ({
  ...(old && typeof old === 'object' ? (old as object) : {}),
  ko,
});

async function loadGroups(): Promise<Row[]> {
  const { data, error } = await adminDb()
    .from('part_groups').select('*').order('sort', { ascending: true }).order('id', { ascending: true });
  if (error) fail(`분야를 불러오지 못했습니다: ${error.message}`);
  return (data ?? []) as Row[];
}

async function loadParts(): Promise<Row[]> {
  const { data, error } = await adminDb()
    .from('parts').select('*').order('sort', { ascending: true }).order('id', { ascending: true });
  if (error) fail(`파트를 불러오지 못했습니다: ${error.message}`);
  return (data ?? []) as Row[];
}

/** 주어진 순서대로 분야의 순서(sort)와 번호(01, 02, …)를 한 번에 저장합니다. */
async function saveGroupOrder(rows: Row[]) {
  const next = rows.map((r, i) => ({ ...r, sort: i, num: pad(i + 1) }));
  const { error } = await adminDb().from('part_groups').upsert(next, { onConflict: 'id' });
  if (error) fail(`저장 실패: ${error.message}`);
}

/* ---------------- 분야 ---------------- */
export async function saveGroup(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const name = oneLine(fd, 'name');
  const en = oneLine(fd, 'en');
  const descr = oneLine(fd, 'descr');
  if (!name) fail('분야 이름을 입력하세요.');
  if (name.length > 30) fail(`분야 이름은 30자 이내로 입력해 주세요. (현재 ${name.length}자)`);
  if (en.length > 40) fail('영문 부제는 40자 이내로 입력해 주세요.');
  if (descr.length > 120) fail('설명은 120자 이내로 입력해 주세요.');

  const db = adminDb();
  if (id) {
    const { data: before } = await db.from('part_groups').select('*').eq('id', id).maybeSingle();
    if (!before) fail('수정할 분야를 찾을 수 없습니다.');
    const row = { name: merge(before.name, name), en, descr: merge(before.descr, descr) };
    const { error } = await db.from('part_groups').update(row).eq('id', id);
    if (error) fail(`저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'part_groups', id, before, row);
    done(id);
  }

  // 새 분야: 맨 끝에 넣고 번호를 정리합니다.
  const nid = newId('g');
  const row = { id: nid, num: '99', sort: 9999, name: { ko: name }, en, descr: { ko: descr } };
  const ins = await db.from('part_groups').insert(row);
  if (ins.error) fail(`저장 실패: ${ins.error.message}`);
  await saveGroupOrder(await loadGroups());
  await logEdit(me, 'create', 'part_groups', nid, null, row);
  done(nid);
}

export async function moveGroup(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const dir = str(fd, 'dir') === 'up' ? -1 : 1;
  const groups = await loadGroups();
  const i = groups.findIndex((g) => g.id === id);
  if (i < 0) fail('분야를 찾을 수 없습니다.');
  const j = i + dir;
  if (j >= 0 && j < groups.length) {
    [groups[i], groups[j]] = [groups[j], groups[i]];
    await saveGroupOrder(groups);
    await logEdit(me, 'update', 'part_groups', id, null, { order: groups.map((g) => g.id) });
  }
  redirect(`${BACK}#${id}`);
}

export async function removeGroup(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const db = adminDb();

  const [parts, rates, works] = await Promise.all([
    db.from('parts').select('id').eq('group_id', id),
    db.from('rate_items').select('id').eq('group_id', id),
    db.from('works').select('title, feat'),
  ]);
  const bad = [parts, rates, works].find((x) => x.error);
  if (bad?.error) fail(`사용 여부를 확인하지 못해 삭제하지 않았습니다: ${bad.error.message}`);

  const pn = parts.data?.length ?? 0;
  if (pn) fail(`이 분야에 파트가 ${pn}개 있습니다. 파트를 먼저 삭제하세요.`);
  const rn = rates.data?.length ?? 0;
  if (rn) fail(`이 분야에 단가 항목이 ${rn}개 있습니다. 단가표에서 먼저 삭제하세요.`);
  const used = (works.data ?? []).filter((w: Row) => w.feat?.groups?.includes(id));
  if (used.length) {
    const more = used.length > 1 ? ` 외 ${used.length - 1}곡` : '';
    fail(`곡 '${used[0].title}'${more}의 포트폴리오 대표작 설정에서 이 분야를 쓰고 있습니다. 해당 곡에서 체크를 해제한 뒤 삭제하세요.`);
  }

  const { data: before } = await db.from('part_groups').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('part_groups').delete().eq('id', id);
  if (error) fail(`삭제 실패: ${error.message}`);
  await saveGroupOrder(await loadGroups());
  await logEdit(me, 'delete', 'part_groups', id, before, null);
  redirect(`${BACK}?ok=removed`);
}

/* ---------------- 파트 ---------------- */
export async function savePart(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const groupId = str(fd, 'groupId');
  const name = oneLine(fd, 'name');
  if (!name) fail('파트 이름을 입력하세요.');
  if (name.length > 30) fail(`파트 이름은 30자 이내로 입력해 주세요. (현재 ${name.length}자)`);

  const db = adminDb();
  if (id) {
    const { data: before } = await db.from('parts').select('*').eq('id', id).maybeSingle();
    if (!before) fail('수정할 파트를 찾을 수 없습니다.');
    const row = { name: merge(before.name, name) };
    const { error } = await db.from('parts').update(row).eq('id', id);
    if (error) fail(`저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'parts', id, before, row);
    done(groupId || before.group_id);
  }

  const { data: g } = await db.from('part_groups').select('id').eq('id', groupId).maybeSingle();
  if (!g) fail('파트를 넣을 분야를 찾을 수 없습니다.');
  const parts = await loadParts();
  const max = parts.reduce((m, p) => Math.max(m, Number(p.sort) || 0), -1);
  const row = { id: newId('p'), name: { ko: name }, sort: max + 1, group_id: groupId };
  const { error } = await db.from('parts').insert(row);
  if (error) fail(`저장 실패: ${error.message}`);
  await logEdit(me, 'create', 'parts', row.id, null, row);
  done(groupId);
}

export async function movePart(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const dir = str(fd, 'dir') === 'up' ? -1 : 1;
  const groups = await loadGroups();
  const parts = await loadParts();
  const part = parts.find((p) => p.id === id);
  if (!part) fail('파트를 찾을 수 없습니다.');

  // 분야 순서 → 분야 안 순서대로 늘어놓고, 같은 분야 안에서 이웃과 자리를 바꿉니다.
  const byGroup = new Map<string, Row[]>();
  for (const g of groups) byGroup.set(g.id, parts.filter((p) => p.group_id === g.id));
  const list = byGroup.get(part.group_id) ?? [];
  const i = list.findIndex((p) => p.id === id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];

  const flat = [
    ...groups.flatMap((g) => byGroup.get(g.id) ?? []),
    ...parts.filter((p) => !byGroup.has(p.group_id)),
  ].map((p, k) => ({ ...p, sort: k }));
  const { error } = await adminDb().from('parts').upsert(flat, { onConflict: 'id' });
  if (error) fail(`저장 실패: ${error.message}`);
  await logEdit(me, 'update', 'parts', id, null, { group: part.group_id, order: list.map((p) => p.id) });
  redirect(`${BACK}#${part.group_id}`);
}

export async function removePart(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const db = adminDb();

  const [ws, iq, cur] = await Promise.all([
    db.from('works').select('title, part_ids, main_part_id, feat'),
    db.from('index_queue').select('label_part_id'),
    db.from('parts').select('*').eq('id', id).maybeSingle(),
  ]);
  const bad = [ws, iq, cur].find((x) => x.error);
  if (bad?.error) fail(`사용 여부를 확인하지 못해 삭제하지 않았습니다: ${bad.error.message}`);
  if (!cur.data) fail('삭제할 파트를 찾을 수 없습니다.');

  const used = (ws.data ?? []).filter(
    (w: Row) =>
      w.part_ids?.includes(id) || w.main_part_id === id || w.feat?.default === id || w.feat?.parts?.includes(id),
  );
  if (used.length) {
    const more = used.length > 1 ? ` 외 ${used.length - 1}곡` : '';
    fail(`곡 '${used[0].title}'${more}에서 이 파트를 쓰고 있어 삭제할 수 없습니다. 곡 관리에서 해당 곡의 체크를 해제한 뒤 삭제하세요. 이름만 바꾸려면 삭제하지 말고 이름을 수정하세요.`);
  }
  if ((iq.data ?? []).some((r: Row) => r.label_part_id === id)) {
    fail('대표곡 지정 화면에서 이 파트를 카드 라벨로 쓰고 있어 삭제할 수 없습니다. 먼저 그 라벨을 바꿔 주세요.');
  }

  const { error } = await db.from('parts').delete().eq('id', id);
  if (error) fail(`삭제 실패: ${error.message}`);
  await logEdit(me, 'delete', 'parts', id, cur.data, null);
  done(cur.data.group_id);
}
