// src/app/hr-admin/(panel)/rates/actions.ts — 단가 항목·패키지 저장/삭제
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';

const RATES = '/hr-admin/rates';
const PKGS = '/hr-admin/rates/packages';

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const list = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
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

/* ---------- 가격 문자열 도우미 ---------- */
const validMoney = (s: string) => /^\d[\d,]*$/.test(s);
const digits = (s: string) => Number(s.replace(/,/g, ''));
const money = (s: string) => digits(s).toLocaleString('en-US');

/** 기존 값(다른 언어 키)을 보존하고 ko만 덮어씁니다. */
const merge = (old: unknown, ko: string) => ({
  ...(old && typeof old === 'object' ? (old as object) : {}),
  ko,
});

/** 정렬 번호: 입력이 있으면 그 값, 없으면 기존 값, 그것도 없으면 맨 끝 다음 번호 */
async function pickSort(fd: FormData, table: string, current?: number) {
  const raw = str(fd, 'sort');
  if (raw !== '' && Number.isInteger(Number(raw))) return Number(raw);
  if (current !== undefined) return current;
  const { data } = await adminDb().from(table).select('sort').order('sort', { ascending: false }).limit(1);
  return ((data?.[0]?.sort as number | undefined) ?? 0) + 1;
}

/** 할인 입력 → 저장 형태. 아무것도 안 적고 꺼져 있으면 null */
function buildDiscount(fd: FormData, base: string, back: string) {
  const on = flag(fd, 'discOn');
  const rateRaw = str(fd, 'discRate');
  const priceRaw = str(fd, 'discPrice');
  const end = str(fd, 'discEnd');
  if (!on && !rateRaw && !priceRaw && !end) return null;

  const b = validMoney(base) ? digits(base) : 0;

  let rate: number | undefined;
  if (rateRaw) {
    rate = Number(rateRaw);
    if (!Number.isInteger(rate) || rate < 1 || rate > 99) fail(back, '할인율은 1~99 사이의 정수로 입력하세요.');
  }

  let price: string | undefined;
  if (priceRaw) {
    if (!validMoney(priceRaw)) fail(back, '할인가는 숫자로 입력하세요.');
    price = money(priceRaw);
    if (b > 0 && digits(price) >= b) fail(back, '할인가는 정가보다 낮아야 합니다.');
    if (rate === undefined && b > 0) rate = Math.max(1, Math.round((1 - digits(price) / b) * 100));
  } else if (rate !== undefined && b > 0) {
    // 할인율만 입력: 100원 단위로 반올림해 할인가를 계산합니다.
    price = (Math.round((b * (100 - rate)) / 100 / 100) * 100).toLocaleString('en-US');
  }

  if (on && !price) fail(back, '할인을 켜려면 할인가가 필요합니다. 할인율만 넣으려면 정가가 숫자여야 합니다.');
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) fail(back, '종료일은 연-월-일 형식으로 입력하세요.');

  const d: Record<string, unknown> = { on };
  if (rate !== undefined) d.rate = rate;
  if (price) d.price = price;
  if (end) d.endDate = end;
  return d;
}

/* ---------------- 단가 항목 ---------------- */
export async function saveRate(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const back = id ? `${RATES}?edit=${encodeURIComponent(id)}` : RATES;

  const groupId = str(fd, 'groupId');
  const name = str(fd, 'name');
  const desc = str(fd, 'desc');
  const unit = str(fd, 'unit');
  const tag = str(fd, 'tag');
  const priceIn = str(fd, 'price');

  if (!name) fail(back, '이름을 입력하세요.');
  if (!unit) fail(back, '단위를 입력하세요. (예: 곡당)');
  if (!validMoney(priceIn) || digits(priceIn) <= 0) fail(back, '가격은 0보다 큰 숫자로 입력하세요. (예: 150000)');
  const price = money(priceIn);
  const discount = buildDiscount(fd, price, back);

  const db = adminDb();
  const { data: g } = await db.from('part_groups').select('id').eq('id', groupId).maybeSingle();
  if (!g) fail(back, '분류를 선택하세요.');

  let before: Record<string, unknown> | null = null;
  if (id) {
    const r = await db.from('rate_items').select('*').eq('id', id).maybeSingle();
    before = r.data;
    if (!before) fail(back, '수정할 항목을 찾지 못했습니다.');
  }

  const row = {
    group_id: groupId,
    name: merge(before?.name, name),
    descr: merge(before?.descr, desc),
    price,
    unit: merge(before?.unit, unit),
    tag: tag || null,
    discount,
    sort: await pickSort(fd, 'rate_items', before?.sort as number | undefined),
  };

  if (id) {
    const { error } = await db.from('rate_items').update(row).eq('id', id);
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'rate_items', id, before, row);
  } else {
    const nid = newId('r');
    const { error } = await db.from('rate_items').insert({ id: nid, ...row });
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'create', 'rate_items', nid, null, row);
  }
  redirect(`${RATES}?ok=1`);
}

export async function removeRate(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  if (!id) redirect(RATES);
  const db = adminDb();
  const { data: before } = await db.from('rate_items').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('rate_items').delete().eq('id', id);
  if (error) fail(RATES, `삭제 실패: ${error.message}`);
  // 이 항목이 들어 있던 패키지에서도 제거
  const { data: pks } = await db.from('packages').select('id, item_ids').contains('item_ids', [id]);
  for (const p of pks ?? []) {
    await db.from('packages').update({ item_ids: p.item_ids.filter((x: string) => x !== id) }).eq('id', p.id);
  }
  await logEdit(me, 'delete', 'rate_items', id, before, null);
  redirect(`${RATES}?ok=1`);
}

/* ---------------- 패키지 ---------------- */
export async function savePackage(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const back = id ? `${PKGS}?edit=${encodeURIComponent(id)}` : PKGS;

  const num = str(fd, 'num');
  const tag = str(fd, 'tag');
  const name = str(fd, 'name');
  const desc = str(fd, 'desc');
  const totalIn = str(fd, 'total');
  const itemIds = list(fd, 'itemIds');

  if (!num) fail(back, '번호를 입력하세요. (예: 01)');
  if (!tag) fail(back, '태그를 입력하세요. (예: ORIGINAL)');
  if (!name) fail(back, '이름을 입력하세요.');
  if (!validMoney(totalIn) || digits(totalIn) <= 0) fail(back, '합계는 0보다 큰 숫자로 입력하세요.');
  if (!itemIds.length) fail(back, '포함할 항목을 하나 이상 선택하세요.');
  const total = money(totalIn);
  const discount = buildDiscount(fd, total, back);

  const db = adminDb();
  const { data: found } = await db.from('rate_items').select('id').in('id', itemIds);
  if ((found ?? []).length !== new Set(itemIds).size) fail(back, '존재하지 않는 항목이 포함되어 있습니다. 새로고침 후 다시 선택하세요.');

  let before: Record<string, unknown> | null = null;
  if (id) {
    const r = await db.from('packages').select('*').eq('id', id).maybeSingle();
    before = r.data;
    if (!before) fail(back, '수정할 패키지를 찾지 못했습니다.');
  }

  const row = {
    num, tag,
    name: merge(before?.name, name),
    descr: merge(before?.descr, desc),
    item_ids: itemIds,
    total,
    discount,
    sort: await pickSort(fd, 'packages', before?.sort as number | undefined),
  };

  if (id) {
    const { error } = await db.from('packages').update(row).eq('id', id);
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'packages', id, before, row);
  } else {
    const nid = newId('pk');
    const { error } = await db.from('packages').insert({ id: nid, ...row });
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'create', 'packages', nid, null, row);
  }
  redirect(`${PKGS}?ok=1`);
}

export async function removePackage(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  if (!id) redirect(PKGS);
  const db = adminDb();
  const { data: before } = await db.from('packages').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('packages').delete().eq('id', id);
  if (error) fail(PKGS, `삭제 실패: ${error.message}`);
  await logEdit(me, 'delete', 'packages', id, before, null);
  redirect(`${PKGS}?ok=1`);
}
