// src/lib/turnaround.ts — 분야별 소요 기간·빠른 마감·당일 마감의 형식과 표시 규칙
export type FeeType = 'pct' | 'won';
export type Fee = { type: FeeType; value: number } | null;

export type GroupTurn = {
  avg: string; // 예: "5~7일"
  rush: { on: boolean; days: string; fee: Fee }; // 빠른 마감
  same: { on: boolean; fee: Fee }; // 당일 마감
};
export type TurnaroundSettings = Record<string, GroupTurn>; // 키: 분야 id

export const TURN_LIMITS = { avg: 20, days: 20 };

export const emptyTurn = (): GroupTurn => ({
  avg: '',
  rush: { on: false, days: '', fee: null },
  same: { on: false, fee: null },
});

export const feeLabel = (f: Fee) =>
  !f ? '추가요금 별도' : f.type === 'pct' ? `+${f.value}%` : `+${f.value.toLocaleString('ko-KR')}원`;

/** 화면에 보여줄 정보가 하나라도 있는 분야만 표시합니다. */
export const hasTurn = (t?: GroupTurn) => !!t && (!!t.avg || t.rush.on || t.same.on);

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === 'object' ? (v as Rec) : {});
const s = (v: unknown) => (typeof v === 'string' ? v : '');

function parseFee(v: unknown): Fee {
  const o = rec(v);
  const n = Number(o.value);
  if ((o.type !== 'pct' && o.type !== 'won') || !Number.isFinite(n) || n <= 0) return null;
  return { type: o.type, value: n };
}

/** DB에 저장된 값을 안전하게 읽습니다. 형식이 틀려도 화면이 깨지지 않게 기본값으로 채웁니다. */
export function parseTurnaround(raw: unknown): TurnaroundSettings {
  const out: TurnaroundSettings = {};
  for (const [gid, v] of Object.entries(rec(raw))) {
    const o = rec(v);
    const r = rec(o.rush);
    const m = rec(o.same);
    out[gid] = {
      avg: s(o.avg),
      rush: { on: r.on === true, days: s(r.days), fee: parseFee(r.fee) },
      same: { on: m.on === true, fee: parseFee(m.fee) },
    };
  }
  return out;
}
