// src/components/admin/WorkPicker.tsx — 곡을 검색해서 골라 담는 선택기
/* eslint-disable @next/next/no-img-element */
'use client';
import { useMemo, useState } from 'react';
import type { PickWork } from '@/lib/featured';

const SHOW = 8;
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export function WorkPicker({ works, chosen, onPick, full }: {
  works: PickWork[];
  chosen: ReadonlySet<string>;
  onPick: (id: string) => void;
  full?: string; // 더 담을 수 없는 이유(있으면 추가 버튼이 잠깁니다)
}) {
  const [q, setQ] = useState('');
  const n = norm(q);

  const { rows, total } = useMemo(() => {
    // 검색어가 없으면 "아직 안 담은, 담을 수 있는 최신 곡"만 보여줍니다.
    const hit = n
      ? works.filter((w) => norm(`${w.title} ${w.artists}`).includes(n))
      : works.filter((w) => !w.blocked && !chosen.has(w.id));
    const sorted = [...hit].sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked));
    return { rows: sorted.slice(0, SHOW), total: sorted.length };
  }, [works, chosen, n]);

  const addable = (w: PickWork) => !w.blocked && !chosen.has(w.id) && !full;
  const first = rows.find(addable);

  return (
    <div className="hr-pk">
      <label className="hr-pk-q">
        곡 찾아서 추가
        <input
          type="search"
          value={q}
          autoComplete="off"
          placeholder="곡 제목 또는 아티스트 이름 (Enter: 첫 결과 추가)"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault(); // 폼이 저장되지 않게
            if (e.nativeEvent.isComposing) return; // 한글 입력 확정 중의 Enter는 무시
            if (first) onPick(first.id);
          }}
        />
      </label>
      <p className="hr-pk-hint" role="status">
        {n
          ? `검색 결과 ${total}곡${total > SHOW ? ` 중 ${SHOW}곡 표시` : ''}`
          : '최신 곡 순입니다. 이름을 입력하면 전체 곡에서 찾습니다.'}
        {full ? ` · ${full}` : ''}
      </p>
      <ul className="hr-pk-list">
        {rows.length === 0 && <li className="hr-pk-none">찾는 곡이 없습니다.</li>}
        {rows.map((w) => (
          <li key={w.id}>
            {w.thumb
              ? <img className="hr-pk-th" src={w.thumb} alt="" width={64} height={36} loading="lazy" />
              : <span className="hr-pk-th" />}
            <span className="hr-pk-txt">
              <b>{w.title}</b>
              <small>{[w.date, w.artists].filter(Boolean).join(' · ')}</small>
            </span>
            {w.blocked && <span className="hr-pk-why">{w.blocked}</span>}
            <button type="button" className="hr-pk-btn" disabled={!addable(w)} onClick={() => onPick(w.id)}>
              {chosen.has(w.id) ? '추가됨' : '추가'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
