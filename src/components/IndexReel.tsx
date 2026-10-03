// src/components/IndexReel.tsx
'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { QueueItem, Work } from '@/lib/types';
import { useSite } from './SiteProvider';
import { useModal } from './ModalContext';
import { Thumb } from './Thumb';
import { Icon } from './Icons';

type Entry = { work: Work; item: QueueItem };

export function IndexReel() {
  const s = useSite();
  const { openWork } = useModal();
  const [idx, setIdx] = useState(0);

  const items = useMemo<Entry[]>(() => {
    const found: Entry[] = [];
    for (const item of s.indexQueue) {
      const work = s.works.find((w) => w.id === item.workId);
      if (work) found.push({ work, item });
    }
    if (found.length) return found;
    // 대표곡을 지정하지 않았으면 최신 곡 4개를 대신 보여줍니다.
    return s.works.slice(0, 4).map((work) => ({ work, item: { workId: work.id } }));
  }, [s]);

  if (!items.length) return null;
  const cur = items[Math.min(idx, items.length - 1)];

  const label = ({ work, item }: Entry) => {
    const pid = item.labelPartId ?? work.partIds[0];
    if (!pid) return '';
    const extra = item.labelPartId && item.partCount && item.partCount > 1 ? ` 외 ${item.partCount - 1}개 파트` : '';
    return s.partName(pid) + extra;
  };
  const sub = (w: Work) => [s.artistNames(w), s.usageNames(w)].filter(Boolean).join(' · ');
  const chips = cur.work.partIds.slice(0, 4);
  const more = cur.work.partIds.length - chips.length;
  const curLabel = label(cur);
  const open = () => openWork(cur.work.id);

  return (
    <div className="fx-reel">
      <div
        className="fx-player"
        role="button"
        tabIndex={0}
        aria-label={`${cur.work.title} 재생`}
        onClick={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
      >
        <Thumb work={cur.work}>
          <span className="fx-play"><span><Icon name="play" /></span></span>
          <div className="fx-cap">
            <div className="fx-cap-l">
              <small>FEATURED{curLabel ? ` · ${curLabel}` : ''}</small>
              <h2>{cur.work.title}</h2>
              <p>{sub(cur.work)}</p>
            </div>
            {chips.length > 0 && (
              <div className="fx-chips">
                {chips.map((id) => <span key={id}>{s.partName(id)}</span>)}
                {more > 0 && <span>+{more}</span>}
              </div>
            )}
          </div>
        </Thumb>
      </div>

      <aside className="fx-panel">
        <div className="fx-panel-in">
          <div className="fx-ph"><small>FEATURED</small><b>대표작</b></div>
          <div className="fx-list">
            {items.map((x, i) => (
              <button key={x.work.id} type="button" className={`fx-q ${i === idx ? 'on' : ''}`} onClick={() => setIdx(i)}>
                <Thumb work={x.work} />
                <span>
                  <small>{label(x)}</small>
                  <b>{x.work.title}</b>
                  <em>{s.artistNames(x.work)}</em>
                </span>
              </button>
            ))}
          </div>
          <Link className="fx-all" href="/portfolio">전체 작업물 보기 <Icon name="arrow" /></Link>
        </div>
      </aside>
    </div>
  );
}
