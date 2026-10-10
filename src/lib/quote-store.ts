// src/lib/quote-store.ts — 견적서·명세서 도구의 번호·유효기간·보관함 (브라우저 저장소만 사용)
// 문서 모양(Doc)을 몰라도 되도록, 보관함에는 JSON 글자 그대로 넣습니다.

export type QuoteKind = 'quote' | 'statement';

const SLOTS = 'hr-quote-slots-v1';
const PRESET = 'hr-quote-preset-v1';
const SEQ = 'hr-quote-seq-';
const MAX_SLOTS = 30;
const DAY_OK = /^\d{4}-\d{2}-\d{2}$/;

const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/* ───────── 문서 번호 ───────── */

/** 견적서는 Q-20261010-01, 명세서는 S-20261010-01. 순번은 이 브라우저에서 같은 날 발급한 횟수입니다. */
export function nextNo(kind: QuoteKind, issued: string): string {
  const day = (DAY_OK.test(issued) ? issued : kstToday()).replace(/-/g, '');
  const p = kind === 'statement' ? 'S' : 'Q';
  const k = `${SEQ}${p}-${day}`;
  let n = 1;
  try {
    n = (Number(localStorage.getItem(k)) || 0) + 1;
    localStorage.setItem(k, String(n));
  } catch {
    /* 저장소를 못 쓰면 01로 둡니다. */
  }
  return `${p}-${day}-${String(n).padStart(2, '0')}`;
}

/** 견적서 → 명세서로 바꿀 때 번호 앞글자만 바꿉니다. (Q-… ↔ S-…) 직접 적은 번호는 그대로 둡니다. */
export const renumber = (no: string, kind: QuoteKind): string =>
  no.replace(/^[QS]-/, kind === 'statement' ? 'S-' : 'Q-');

/* ───────── 유효기간 ───────── */

/** "발행일로부터 14일 (2026.10.24까지)". 발행일이 비어 있으면 괄호 없이 돌려줍니다. */
export function validLabel(days: number, issued: string): string {
  const head = `발행일로부터 ${days}일`;
  if (!DAY_OK.test(issued)) return head;
  const t = Date.parse(`${issued}T00:00:00Z`);
  if (Number.isNaN(t)) return head;
  const end = new Date(t + days * 864e5).toISOString().slice(0, 10).replace(/-/g, '.');
  return `${head} (${end}까지)`;
}

/* ───────── 여러 건 보관함 ───────── */

export type QuoteSlot = { id: string; name: string; at: number; json: string };

const readSlots = (): QuoteSlot[] => {
  try {
    const a: unknown = JSON.parse(localStorage.getItem(SLOTS) ?? '[]');
    if (!Array.isArray(a)) return [];
    return a.filter(
      (x): x is QuoteSlot =>
        !!x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.json === 'string' && typeof x.at === 'number',
    );
  } catch {
    return [];
  }
};

/** 최근에 저장한 순서 */
export const listSlots = (): QuoteSlot[] => readSlots().sort((a, b) => b.at - a.at);

/** id가 있으면 덮어쓰고, 없으면 새로 만듭니다. 저장소가 가득 차면 null. */
export function saveSlot(name: string, json: string, id?: string): QuoteSlot[] | null {
  const all = readSlots();
  const i = id ? all.findIndex((s) => s.id === id) : -1;
  const slot: QuoteSlot = {
    id: i >= 0 ? all[i].id : Math.random().toString(36).slice(2, 10),
    name: name.trim().slice(0, 40) || '이름 없음',
    at: Date.now(),
    json,
  };
  if (i >= 0) all[i] = slot;
  else all.push(slot);
  const next = all.sort((a, b) => b.at - a.at).slice(0, MAX_SLOTS);
  try {
    localStorage.setItem(SLOTS, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function removeSlot(id: string): QuoteSlot[] {
  const next = readSlots().filter((s) => s.id !== id);
  try { localStorage.setItem(SLOTS, JSON.stringify(next)); } catch { /* 무시 */ }
  return next.sort((a, b) => b.at - a.at);
}

/* ───────── 자주 쓰는 입금 계좌·안내 문구 ───────── */

export type QuotePreset = { bank: string; notesQuote: string; notesStatement: string };
const EMPTY_PRESET: QuotePreset = { bank: '', notesQuote: '', notesStatement: '' };

export function readPreset(): QuotePreset {
  try {
    const o = JSON.parse(localStorage.getItem(PRESET) ?? '{}') as Partial<QuotePreset>;
    const s = (v: unknown) => (typeof v === 'string' ? v : '');
    return { bank: s(o.bank), notesQuote: s(o.notesQuote), notesStatement: s(o.notesStatement) };
  } catch {
    return EMPTY_PRESET;
  }
}

/** 넘긴 값만 바꾸고 나머지는 기존 값을 유지합니다. 저장소를 못 쓰면 false. */
export function writePreset(patch: Partial<QuotePreset>): boolean {
  try {
    localStorage.setItem(PRESET, JSON.stringify({ ...readPreset(), ...patch }));
    return true;
  } catch {
    return false;
  }
}
