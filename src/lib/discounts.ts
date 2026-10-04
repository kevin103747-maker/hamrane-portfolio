// src/lib/discounts.ts — 수량 할인·묶음 할인 규칙의 형식과 표시 규칙
export type VolTier = { min: number; type: 'pct' | 'won'; value: number }; // min곡 이상: % 할인 또는 곡당 원 할인
export type GroupRule = { volume: VolTier[]; bundle: boolean }; // bundle: 묶음 할인 대상 분야 여부
export type BundleTier = { min: number; pct: number }; // min개 분야 이상: pct% 할인
export type DiscountSettings = {
  groups: Record<string, GroupRule>; // 키: 분야 id
  excluded: string[]; // 수량·묶음 할인에서 제외할 단가 항목 id
  bundle: BundleTier[];
};

export const DISC_LIMITS = { volRows: 3, bundleRows: 3 };
export const EMPTY_DISCOUNTS: DiscountSettings = { groups: {}, excluded: [], bundle: [] };

export const volLabel = (t: VolTier) =>
  `${t.min}곡 이상 ${t.type === 'pct' ? `-${t.value}%` : `곡당 -${t.value.toLocaleString('ko-KR')}원`}`;
export const bundleLabel = (t: BundleTier) => `${t.min}개 분야 이상 -${t.pct}%`;

/** 분야 탭에 보여줄 할인 안내. 보여줄 것이 없으면 undefined */
export type GroupDiscView = { volume: VolTier[]; bundle: 'yes' | 'no' | null };
export function groupView(s: DiscountSettings, gid: string): GroupDiscView | undefined {
  const r = s.groups[gid];
  const volume = r?.volume ?? [];
  // 묶음 할인 단계가 있으면 모든 분야에 대상/제외를 분명히 표시합니다.
  const bundle = s.bundle.length ? (r?.bundle ? 'yes' : 'no') : null;
  return volume.length || bundle ? { volume, bundle } : undefined;
}

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {});
const posInt = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 0;
};

/** DB에 저장된 값을 안전하게 읽습니다. 형식이 틀린 항목은 버리고 화면이 깨지지 않게 합니다. */
export function parseDiscounts(raw: unknown): DiscountSettings {
  const o = rec(raw);

  const groups: Record<string, GroupRule> = {};
  for (const [gid, v] of Object.entries(rec(o.groups))) {
    const r = rec(v);
    const volume = (Array.isArray(r.volume) ? r.volume : [])
      .flatMap((x): VolTier[] => {
        const t = rec(x);
        const min = posInt(t.min);
        const value = posInt(t.value);
        const type = t.type;
        return min >= 2 && value > 0 && (type === 'pct' || type === 'won') ? [{ min, type, value }] : [];
      })
      .sort((a, b) => a.min - b.min);
    groups[gid] = { volume, bundle: r.bundle === true };
  }

  const bundle = (Array.isArray(o.bundle) ? o.bundle : [])
    .flatMap((x): BundleTier[] => {
      const t = rec(x);
      const min = posInt(t.min);
      const pct = posInt(t.pct);
      return min >= 2 && pct > 0 ? [{ min, pct }] : [];
    })
    .sort((a, b) => a.min - b.min);

  const excluded = (Array.isArray(o.excluded) ? o.excluded : []).filter((x): x is string => typeof x === 'string');

  return { groups, excluded, bundle };
}
