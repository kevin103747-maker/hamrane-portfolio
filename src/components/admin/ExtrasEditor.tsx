// src/components/admin/ExtrasEditor.tsx — 패키지에 넣을 협업·외부 상품 입력칸
'use client';
import { useState } from 'react';

export type Extra = { name: string; group: string; who: string; price: string };

export function ExtrasEditor({ initial, max }: { initial: Extra[]; max: number }) {
  const [rows, setRows] = useState<Extra[]>(initial);
  const set = (i: number, patch: Partial<Extra>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <fieldset>
      <legend>협업·외부 상품 (내 단가표에 없는 항목)</legend>
      <small>
        다른 작업자의 몫처럼 내 단가표에 없는 상품을 직접 적습니다. 금액을 비워 두면 사이트에 &quot;별도 협의&quot;로 나옵니다.
        분야 표기를 내 분야 이름과 똑같이 적으면 그 분야 줄에 함께 표시됩니다.
      </small>
      {rows.map((r, i) => (
        <div key={i} className="hr-ex-row">
          <input name="exName" value={r.name} maxLength={30} placeholder="상품 이름 (예: 보컬 녹음)"
            aria-label={`협업 상품 ${i + 1} 이름`} onChange={(e) => set(i, { name: e.target.value })} />
          <input name="exGroup" value={r.group} maxLength={20} placeholder="분야 표기 (예: 보컬)"
            aria-label={`협업 상품 ${i + 1} 분야`} onChange={(e) => set(i, { group: e.target.value })} />
          <input name="exWho" value={r.who} maxLength={20} placeholder="담당 (선택)"
            aria-label={`협업 상품 ${i + 1} 담당`} onChange={(e) => set(i, { who: e.target.value })} />
          <input name="exPrice" value={r.price} inputMode="numeric" maxLength={12} placeholder="금액 (숫자, 선택)"
            aria-label={`협업 상품 ${i + 1} 금액`} onChange={(e) => set(i, { price: e.target.value })} />
          <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>삭제</button>
        </div>
      ))}
      {rows.length < max && (
        <button type="button" onClick={() => setRows((x) => [...x, { name: '', group: '', who: '', price: '' }])}>
          + 협업 상품 추가
        </button>
      )}
    </fieldset>
  );
}
