// src/components/admin/FeaturedPicker.tsx — 홈 대표곡: 검색해서 담고, 순서를 바꿉니다
/* eslint-disable @next/next/no-img-element */
'use client';
import { useMemo, useState } from 'react';
import { WorkPicker } from './WorkPicker';
import type { PickPart, PickWork } from '@/lib/featured';

type Row = { workId: string; labelPartId: string };

export function FeaturedPicker({ works, parts, initial, max }: {
  works: PickWork[]; parts: PickPart[]; initial: Row[]; max: number;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const byId = useMemo(() => new Map(works.map((w) => [w.id, w] as const)), [works]);
  const pickable = useMemo(() => works.filter((w) => !w.hidden), [works]);
  const chosen = new Set(rows.map((r) => r.workId));
  const partName = (id: string) => parts.find((p) => p.id === id)?.name ?? id;

  const add = (id: string) =>
    setRows((r) => (r.length >= max || r.some((x) => x.workId === id) ? r : [...r, { workId: id, labelPartId: '' }]));
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  const setLabel = (i: number, labelPartId: string) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, labelPartId } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  // 홈 화면과 같은 규칙: 라벨 파트(없으면 강조 파트→첫 파트) + 참여 파트가 2개 이상이면 "외 N개 파트"
  const labelOf = (w: PickWork, labelPartId: string) => {
    const own = w.partIds;
    const auto = w.mainPartId && own.includes(w.mainPartId) ? w.mainPartId : own[0];
    const pid = labelPartId && own.includes(labelPartId) ? labelPartId : auto;
    if (!pid) return '';
    return partName(pid) + (own.length > 1 ? ` 외 ${own.length - 1}개 파트` : '');
  };

  return (
    <>
      <p className="hr-pk-count">선택한 곡 <b>{rows.length}</b> / {max}</p>
      {rows.length === 0 && (
        <p className="hr-slot-note">지정한 곡이 없어서 홈 화면에는 최신 곡 4개가 대신 표시됩니다.</p>
      )}

      <ol className="hr-pk-sel">
        {rows.map((r, i) => {
          const w = byId.get(r.workId);
          if (!w) return null;
          const label = labelOf(w, r.labelPartId);
          return (
            <li key={r.workId} className="hr-pk-item">
              <input type="hidden" name="workId" value={r.workId} />
              <input type="hidden" name="labelPartId" value={r.labelPartId} />
              <span className="hr-pk-no">{i + 1}</span>
              {w.thumb ? <img className="hr-pk-th" src={w.thumb} alt="" width={64} height={36} /> : <span className="hr-pk-th" />}
              <span className="hr-pk-txt">
                <b>{w.title}</b>
                <small>{[w.date, w.artists].filter(Boolean).join(' · ')}</small>
                {label && <em>FEATURED · {label}</em>}
                {w.hidden && <span className="hr-pk-warn" role="alert">숨김 곡이라 저장할 수 없습니다. 빼거나 곡 관리에서 숨김을 풀어 주세요.</span>}
                {w.partIds.length > 1 && (
                  <details className="hr-pk-opt">
                    <summary>라벨 파트 바꾸기 (선택)</summary>
                    <select value={r.labelPartId} onChange={(e) => setLabel(i, e.target.value)} aria-label={`${w.title} 라벨 파트`}>
                      <option value="">(자동)</option>
                      {w.partIds.map((id) => <option key={id} value={id}>{partName(id)}</option>)}
                    </select>
                  </details>
                )}
              </span>
              <span className="hr-pk-ctl">
                <button type="button" className="hr-pk-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${i + 1}번째를 위로`}>↑</button>
                <button type="button" className="hr-pk-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`${i + 1}번째를 아래로`}>↓</button>
                <button type="button" className="hr-pk-btn" onClick={() => remove(i)} aria-label={`${i + 1}번째 빼기`}>✕</button>
              </span>
            </li>
          );
        })}
      </ol>

      <WorkPicker
        works={pickable}
        chosen={chosen}
        onPick={add}
        full={rows.length >= max ? `최대 ${max}곡까지 담을 수 있습니다` : undefined}
      />
    </>
  );
}
