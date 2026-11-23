// src/lib/admin/forms.ts — 어드민 폼 공용 도우미 (단가·폴더·패키지 폼이 같이 씁니다)
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/auth/admin-db';

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
export const list = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
export const flag = (fd: FormData, k: string) => fd.get(k) === 'on';
export const newId = (p: string) => `${p}-${Date.now().toString(36)}`;

export function fail(path: string, msg: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}err=${encodeURIComponent(msg)}`);
}

/** 기존 값(다른 언어 키)을 보존하고 ko·en을 덮어씁니다. en이 비어 있으면 en 키를 지웁니다. */
export const mergeBoth = (old: unknown, ko: string, en: string) => {
  const o: Record<string, unknown> = { ...(old && typeof old === 'object' ? (old as Record<string, unknown>) : {}), ko };
  if (en) o.en = en;
  else delete o.en;
  return o;
};

/* ---------- 가격 문자열 도우미 ---------- */
export const validMoney = (s: string) => /^\d[\d,]*$/.test(s);
export const digits = (s: string) => Number(s.replace(/,/g, ''));
export const money = (s: string) => digits(s).toLocaleString('en-US');

/** 정렬 번호: 입력이 있으면 그 값, 없으면 기존 값, 그것도 없으면 맨 끝 다음 번호 */
export async function pickSort(fd: FormData, table: string, current?: number) {
  const raw = str(fd, 'sort');
  if (raw !== '' && Number.isInteger(Number(raw))) return Number(raw);
  if (current !== undefined) return current;
  const { data } = await adminDb().from(table).select('sort').order('sort', { ascending: false }).limit(1);
  return ((data?.[0]?.sort as number | undefined) ?? 0) + 1;
}

export type DiscountResult = { ok: true; discount: Record<string, unknown> | null } | { ok: false; error: string };

/** 할인 입력 → 저장 형태. 아무것도 안 적고 꺼져 있으면 null */
export function buildDiscount(fd: FormData, base: string, baseUsd: string | undefined): DiscountResult {
  const on = flag(fd, 'discOn');
  const rateRaw = str(fd, 'discRate');
  const priceRaw = str(fd, 'discPrice');
  const priceUsdRaw = str(fd, 'discPriceUsd');
  const end = str(fd, 'discEnd');
  if (!on && !rateRaw && !priceRaw && !priceUsdRaw && !end) return { ok: true, discount: null };

  const b = validMoney(base) ? digits(base) : 0;
  const bUsd = baseUsd && validMoney(baseUsd) ? digits(baseUsd) : 0;

  let rate: number | undefined;
  if (rateRaw) {
    rate = Number(rateRaw);
    if (!Number.isInteger(rate) || rate < 1 || rate > 99) return { ok: false, error: '할인율은 1~99 사이의 정수로 입력하세요.' };
  }

  let price: string | undefined;
  if (priceRaw) {
    if (!validMoney(priceRaw)) return { ok: false, error: '할인가는 숫자로 입력하세요.' };
    price = money(priceRaw);
    if (b > 0 && digits(price) >= b) return { ok: false, error: '할인가는 정가보다 낮아야 합니다.' };
    if (rate === undefined && b > 0) rate = Math.max(1, Math.round((1 - digits(price) / b) * 100));
  } else if (rate !== undefined && b > 0) {
    // 할인율만 입력: 100원 단위로 반올림해 할인가를 계산합니다.
    price = (Math.round((b * (100 - rate)) / 100 / 100) * 100).toLocaleString('en-US');
  }

  let priceUsd: string | undefined;
  if (priceUsdRaw) {
    if (!validMoney(priceUsdRaw)) return { ok: false, error: 'USD 할인가는 숫자로 입력하세요.' };
    priceUsd = money(priceUsdRaw);
    if (bUsd > 0 && digits(priceUsd) >= bUsd) return { ok: false, error: 'USD 할인가는 USD 정가보다 낮아야 합니다.' };
  }

  if (on && !price) return { ok: false, error: '할인을 켜려면 할인가가 필요합니다. 할인율만 넣으려면 정가가 숫자여야 합니다.' };
  if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { ok: false, error: '종료일은 연-월-일 형식으로 입력하세요.' };

  const d: Record<string, unknown> = { on };
  if (rate !== undefined) d.rate = rate;
  if (price) d.price = price;
  if (priceUsd) d.priceUsd = priceUsd;
  if (end) d.endDate = end;
  return { ok: true, discount: d };
}
