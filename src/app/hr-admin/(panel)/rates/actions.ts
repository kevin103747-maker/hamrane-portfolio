// src/app/hr-admin/(panel)/rates/actions.ts — 단가 항목·패키지 저장/삭제
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { pickTag } from '@/lib/rate-badge';
import {
  str, newId, fail, mergeBoth, validMoney, digits, money, pickSort, buildDiscount,
} from '@/lib/admin/forms';
import { parsePackageForm } from '@/lib/admin/rate-forms';

const RATES = '/hr-admin/rates';
const PKGS = '/hr-admin/rates/packages';

async function guard() {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  return me;
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
  const nameEn = str(fd, 'nameEn');
  const descEn = str(fd, 'descEn');
  const unitEn = str(fd, 'unitEn');
  const priceIn = str(fd, 'price');
  const priceUsdIn = str(fd, 'priceUsd');

  if (!name) fail(back, '이름을 입력하세요.');
  if (!unit) fail(back, '단위를 입력하세요. (예: 곡당)');
  if (nameEn.length > 80 || unitEn.length > 30 || descEn.length > 300) fail(back, '영어 문구가 너무 깁니다. (이름 80자, 단위 30자, 설명 300자 이내)');
  if (!validMoney(priceIn) || digits(priceIn) <= 0) fail(back, '가격은 0보다 큰 숫자로 입력하세요. (예: 150000)');
  if (priceUsdIn && !validMoney(priceUsdIn)) fail(back, 'USD 가격은 숫자로 입력하세요.');
  const price = money(priceIn);
  const priceUsd = priceUsdIn ? money(priceUsdIn) : undefined;
  const disc = buildDiscount(fd, price, priceUsd);
  if (!disc.ok) fail(back, disc.error);
  const discount = disc.discount;

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
    name: mergeBoth(before?.name, name, nameEn),
    descr: mergeBoth(before?.descr, desc, descEn),
    price,
    price_usd: priceUsd,
    unit: mergeBoth(before?.unit, unit, unitEn),
    tag: pickTag(str(fd, 'badge'), tag),
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
  const back = str(fd, 'id') ? `${PKGS}?edit=${encodeURIComponent(str(fd, 'id'))}` : PKGS;

  const p = await parsePackageForm(fd);
  if (!p.ok) fail(back, p.error);
  const d = p.data;
  const { id, num, tag, name, nameEn, desc, descEn, total, totalUsd, itemIds, folderId } = d;

  const db = adminDb();
  if (folderId) {
    const { data: f } = await db.from('price_folders').select('id').eq('id', folderId).maybeSingle();
    if (!f) fail(back, '폴더를 찾지 못했습니다. 새로고침 후 다시 선택하세요.');
  }

  let before: Record<string, unknown> | null = null;
  if (id) {
    const r = await db.from('packages').select('*').eq('id', id).maybeSingle();
    before = r.data;
    if (!before) fail(back, '수정할 패키지를 찾지 못했습니다.');
  }

  const row = {
    num, tag,
    name: mergeBoth(before?.name, name, nameEn),
    descr: mergeBoth(before?.descr, desc, descEn),
    item_ids: itemIds,
    qty: d.qty,
    prices: d.prices,
    prices_usd: d.pricesUsd,
    est: d.est,
    extras: d.extras,
    total,
    total_usd: totalUsd,
    discount: d.discount,
    folder_id: folderId || null,
    optional: d.optional,
    work_ids: d.workIds,
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
/* ---------------- 단가 항목 순서 ---------------- */
type RateRow = Record<string, unknown>;

export async function moveRate(fd: FormData) {
  const me = await guard();
  const id = str(fd, 'id');
  const dir = str(fd, 'dir') === 'up' ? -1 : 1;
  const db = adminDb();

  const [g, r] = await Promise.all([
    db.from('part_groups').select('id').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('rate_items').select('*').order('sort', { ascending: true }).order('id', { ascending: true }),
  ]);
  if (g.error || r.error) fail(RATES, `불러오지 못했습니다: ${(g.error ?? r.error)?.message}`);
  const groups = (g.data ?? []) as RateRow[];
  const items = (r.data ?? []) as RateRow[];

  const item = items.find((x) => x.id === id);
  if (!item) fail(RATES, '항목을 찾지 못했습니다. 새로고침 후 다시 시도하세요.');
  const gid = item.group_id as string;

  // 분야별로 나눠 놓고, 같은 분야 안에서 이웃과 자리를 바꿉니다.
  const byGroup = new Map<string, RateRow[]>();
  for (const x of groups) byGroup.set(x.id as string, items.filter((i) => i.group_id === x.id));
  const list = byGroup.get(gid) ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i >= 0 && j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
  }

  // 분야 순서 → 분야 안 순서대로 늘어놓고 0부터 다시 번호를 매깁니다.
  const flat = [
    ...groups.flatMap((x) => byGroup.get(x.id as string) ?? []),
    ...items.filter((x) => !byGroup.has(x.group_id as string)),
  ].map((x, k) => ({ ...x, sort: k }));

  const { error } = await db.from('rate_items').upsert(flat, { onConflict: 'id' });
  if (error) fail(RATES, `순서 저장 실패: ${error.message}`);
  await logEdit(me, 'update', 'rate_items', id, null, { group: gid, order: list.map((x) => x.id) });
  redirect(`${RATES}?ok=1&g=${encodeURIComponent(gid)}#row-${id}`);
}
