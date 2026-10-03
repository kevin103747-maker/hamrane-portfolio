// src/components/admin/FeaturedSlots.tsx — 홈 대표곡 칸 편집(순서 이동 포함)
'use client';
import { useState } from 'react';

export type SlotWork = {
  id: string; title: string; date: string; hidden: boolean;
  partIds: string[]; mainPartId: string | null;
};
export type SlotPart = { id: string; name: string };
export type Slot = { workId: string; labelPartId: string; partCount: string };

const EMPTY: Slot = { workId: '', labelPartId: '', partCount: '' };

export function FeaturedSlots({ works, parts, initial, slots }: {
  works: SlotWork[]; parts: SlotPart[]; initial: Slot[]; slots: number;
}) {
  const [rows, setRows] = useState<Slot[]>(() => Array.from({ length: slots }, (_, i) => initial[i] ?? EMPTY));

  const set = (i: number, patch: Partial<Slot>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const workOf = (id: string) => works.find((x) => x.id === id);
  const partName = (id: string) => parts.find((p) => p.id === id)?.name ?? id;
  const used = rows.map((r) => r.workId).filter(Boolean);
  const filled = used.length;
  const hiddenInQueue = rows.map((r, i) => ({ i, w: workOf(r.workId) })).filter((x) => x.w?.hidden);

  return (
    <>
      {filled === 0 && (
        <p className="hr-slot-note">지정한 곡이 없어서 홈 화면에는 최신 곡 4개가 대신 표시됩니다.</p>
      )}
      {filled > 0 && hiddenInQueue.length === filled && (
        <p className="hr-slot-warn" role="alert">지정한 곡이 모두 숨김 상태라 홈 화면에는 최신 곡 4개가 대신 표시됩니다.</p>
      )}

      {rows.map((r, i) => {
        const w = workOf(r.workId);
        const own = w?.partIds ?? [];
        // 저장돼 있던 라벨이 참여 파트에 없으면 눈에 띄게 남겨 둡니다(저장 시 안내됨).
        const labelIds = r.labelPartId && !own.includes(r.labelPartId) ? [...own, r.labelPartId] : own;
        const autoId = w ? (w.mainPartId && own.includes(w.mainPartId) ? w.mainPartId : own[0]) : undefined;

        return (
          <fieldset key={i} className="hr-slot">
            <legend>{i + 1}번째</legend>
            <div className="hr-row hr-feat-row">
              <label>
                곡
                <select
                  name="workId"
                  value={r.workId}
                  onChange={(e) => set(i, { workId: e.target.value, labelPartId: '', partCount: '' })}
                >
                  <option value="">(비움)</option>
                  {works.map((x) => {
                    const dup = used.includes(x.id) && x.id !== r.workId;
                    // 현재 선택된 option을 disabled로 만들면 제출에서 빠지므로 제외합니다.
                    const blocked = (x.hidden || dup) && x.id !== r.workId;
                    return (
                      <option key={x.id} value={x.id} disabled={blocked}>
                        {x.title}{x.date ? ` · ${x.date}` : ''}{x.hidden ? ' · 숨김' : ''}{dup ? ' · 다른 칸에서 사용 중' : ''}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label>
                라벨 파트(선택)
                <select
                  name="labelPartId"
                  value={r.labelPartId}
                  onChange={(e) => set(i, { labelPartId: e.target.value, partCount: e.target.value ? r.partCount : '' })}
                >
                  <option value="">{autoId ? `(자동: ${partName(autoId)})` : '(자동)'}</option>
                  {labelIds.map((id) => (
                    <option key={id} value={id}>{partName(id)}{own.includes(id) ? '' : ' · 참여 파트 아님'}</option>
                  ))}
                </select>
              </label>

              <label>
                라벨에 붙일 파트 수(선택)
                <input
                  type="number"
                  name="partCount"
                  min={1}
                  max={Math.max(own.length, 1)}
                  value={r.partCount}
                  readOnly={!r.labelPartId}
                  placeholder={r.labelPartId ? '예: 3 → "외 2개 파트"' : '라벨 파트를 고르면 입력'}
                  onChange={(e) => set(i, { partCount: e.target.value })}
                />
              </label>

              <div className="hr-slot-btns">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${i + 1}번째 칸을 위로`}>↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`${i + 1}번째 칸을 아래로`}>↓</button>
                <button type="button" onClick={() => set(i, EMPTY)} disabled={!r.workId} aria-label={`${i + 1}번째 칸 비우기`}>✕</button>
              </div>
            </div>
            {w?.hidden && (
              <p className="hr-slot-warn" role="alert">이 곡은 숨김 상태라 홈 화면에 나오지 않습니다. 저장하려면 다른 곡으로 바꾸거나 칸을 비우세요.</p>
            )}
          </fieldset>
        );
      })}
    </>
  );
}
