// src/components/admin/ScopeFeatured.tsx — 한 범위(전체/분야/파트)의 대표곡 편집
/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import { WorkPicker } from './WorkPicker';
import type { PickWork } from '@/lib/featured';

export function ScopeFeatured({ works, initial }: { works: PickWork[]; initial: string[] }) {
  const [ids, setIds] = useState<string[]>(initial);
  const chosen = new Set(ids);
  const selected = works.filter((w) => chosen.has(w.id)); // 사이트와 같은 최신순
  const before = new Set(initial);
  const dirty = ids.length !== initial.length || ids.some((id) => !before.has(id));

  return (
    <>
      <p className="hr-pk-count">
        이 범위의 대표곡 <b>{selected.length}</b>곡
        {dirty && <span className="hr-pk-dirty"> · 저장하지 않은 변경이 있습니다</span>}
      </p>

      {selected.length === 0 && <p className="hr-slot-note">아직 지정한 곡이 없습니다. 아래에서 검색해 추가하세요.</p>}
      <ul className="hr-pk-sel">
        {selected.map((w) => (
          <li key={w.id} className="hr-pk-item">
            <input type="hidden" name="workId" value={w.id} />
            {w.thumb ? <img className="hr-pk-th" src={w.thumb} alt="" width={64} height={36} /> : <span className="hr-pk-th" />}
            <span className="hr-pk-txt">
              <b>{w.title}</b>
              <small>{[w.date, w.artists].filter(Boolean).join(' · ')}</small>
              {w.blocked && <span className="hr-pk-warn">{w.blocked} — 사이트에서 의도와 다르게 보일 수 있으니 빼는 것을 권장합니다.</span>}
            </span>
            <span className="hr-pk-ctl">
              <button type="button" className="hr-pk-btn" onClick={() => setIds((r) => r.filter((x) => x !== w.id))} aria-label={`${w.title} 빼기`}>✕</button>
            </span>
          </li>
        ))}
      </ul>

      <WorkPicker works={works} chosen={chosen} onPick={(id) => setIds((r) => (r.includes(id) ? r : [...r, id]))} />

      <div className="hr-act">
        <button type="submit" disabled={!dirty}>저장</button>
      </div>
    </>
  );
}
