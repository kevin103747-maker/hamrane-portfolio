// src/components/admin/ExtrasEditor.tsx — 패키지에 넣을 협업·외부 상품 입력칸
'use client';
import { useState } from 'react';
import type { CSSProperties } from 'react';

export type Extra = {
  name: string; group: string; who: string; price: string; priceUsd: string;
  nameEn: string; groupEn: string; whoEn: string;
};

const BLANK: Extra = { name: '', group: '', who: '', price: '', priceUsd: '', nameEn: '', groupEn: '', whoEn: '' };

// 폭이 모자라면 줄바꿈하고, 칸이 부모 밖으로 나가지 않게 합니다.
const rowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0, width: '100%' };
const cell: CSSProperties = { flex: '1 1 150px', minWidth: 0, width: 'auto', boxSizing: 'border-box' };
const wide: CSSProperties = { ...cell, flex: '2 1 220px' };
const btn: CSSProperties = { flex: 'none' };

export function ExtrasEditor({ initial, max }: { initial: Extra[]; max: number }) {
  const [rows, setRows] = useState<Extra[]>(initial);
  const set = (i: number, patch: Partial<Extra>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <fieldset style={{ minWidth: 0 }}>
      <legend>협업·외부 상품 (내 단가표에 없는 항목)</legend>
      <small style={{ whiteSpace: 'normal', display: 'block' }}>
        다른 작업자의 몫처럼 내 단가표에 없는 상품을 직접 적습니다. 금액을 비워 두면 사이트에 &quot;별도 협의&quot;로 나옵니다.
        분야 표기를 내 분야 이름과 똑같이 적으면 그 분야 줄에 함께 표시됩니다.
        아래 줄의 영어 칸은 선택입니다. 비우면 그 칸만 영어 화면에도 한국어로 나옵니다.
        영어 분야 표기는 영어 화면의 분야 이름과 똑같이 적어야 같은 줄에 묶입니다.
      </small>
      {rows.map((r, i) => (
        <div key={i} className="hr-ex-item" style={{ minWidth: 0, marginTop: 12 }}>
          <div className="hr-ex-row" style={rowStyle}>
            <input style={wide} name="exName" value={r.name} maxLength={30} placeholder="상품 이름 (예: 보컬 녹음)"
              aria-label={`협업 상품 ${i + 1} 이름`} onChange={(e) => set(i, { name: e.target.value })} />
            <input style={cell} name="exGroup" value={r.group} maxLength={20} placeholder="분야 표기 (예: 보컬)"
              aria-label={`협업 상품 ${i + 1} 분야`} onChange={(e) => set(i, { group: e.target.value })} />
            <input style={cell} name="exWho" value={r.who} maxLength={20} placeholder="담당 (선택)"
              aria-label={`협업 상품 ${i + 1} 담당`} onChange={(e) => set(i, { who: e.target.value })} />
            <input style={cell} name="exPrice" value={r.price} inputMode="numeric" maxLength={12} placeholder="금액 (숫자, 선택)"
              aria-label={`협업 상품 ${i + 1} 금액`} onChange={(e) => set(i, { price: e.target.value })} />
            <input style={cell} name="exPriceUsd" value={r.priceUsd} inputMode="numeric" maxLength={12} placeholder="USD (선택)"
              aria-label={`협업 상품 ${i + 1} USD 금액`} onChange={(e) => set(i, { priceUsd: e.target.value })} />
            <button style={btn} type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>삭제</button>
          </div>
          <div className="hr-ex-row" style={{ ...rowStyle, marginTop: 8 }}>
            <input style={wide} name="exNameEn" value={r.nameEn} maxLength={60} placeholder="영어 상품 이름 (선택)"
              aria-label={`협업 상품 ${i + 1} 영어 이름`} onChange={(e) => set(i, { nameEn: e.target.value })} />
            <input style={cell} name="exGroupEn" value={r.groupEn} maxLength={40} placeholder="영어 분야 표기 (선택)"
              aria-label={`협업 상품 ${i + 1} 영어 분야`} onChange={(e) => set(i, { groupEn: e.target.value })} />
            <input style={cell} name="exWhoEn" value={r.whoEn} maxLength={40} placeholder="영어 담당 (선택)"
              aria-label={`협업 상품 ${i + 1} 영어 담당`} onChange={(e) => set(i, { whoEn: e.target.value })} />
          </div>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" style={{ marginTop: 12 }} onClick={() => setRows((x) => [...x, { ...BLANK }])}>
          + 협업 상품 추가
        </button>
      )}
    </fieldset>
  );
}
