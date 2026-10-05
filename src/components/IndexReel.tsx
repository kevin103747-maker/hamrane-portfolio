// src/components/IndexReel.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { QueueItem, Work } from '@/lib/types';
import { useSite } from './SiteProvider';
import { useModal } from './ModalContext';
import { Thumb } from './Thumb';
import { Icon } from './Icons';
import { orderParts } from '@/lib/work-parts';

type Entry = { work: Work; item: QueueItem };

export function IndexReel() {
  const s = useSite();
  const { openWork } = useModal();
  const [idx, setIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });

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

  /* 목록이 옆으로 넘칠 때(휴대폰) 어느 쪽에 더 있는지 계산합니다. PC는 세로 목록이라 둘 다 false입니다. */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const update = () => {
      const l = el.scrollLeft > 4;
      const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setEdge((e) => (e.l === l && e.r === r ? e : { l, r }));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [items.length]);

  if (!items.length) return null;
  const curIdx = Math.min(idx, items.length - 1);
  const cur = items[curIdx];

  const label = ({ work, item }: Entry) => {
    const own = orderParts(work);
    const pid = item.labelPartId && work.partIds.includes(item.labelPartId) ? item.labelPartId : own[0];
    if (!pid) return '';
    // 파트 수는 따로 정하지 않고, 참여 파트 수로 자동 계산합니다.
    const extra = work.partIds.length > 1 ? ` 외 ${work.partIds.length - 1}개 파트` : '';
    return s.partName(pid) + extra;
  };
  const sub = (w: Work) => [s.artistNames(w), s.usageNames(w)].filter(Boolean).join(' · ');
  const chips = orderParts(cur.work).slice(0, 4);
  const more = cur.work.partIds.length - chips.length;
  const curLabel = label(cur);
  const open = () => openWork(cur.work.id);
  const nudge = (dir: -1 | 1) =>
    listRef.current?.scrollBy({ left: dir * listRef.current.clientWidth * 0.7, behavior: 'smooth' });

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
          <div className="fx-ph">
            <small>FEATURED</small><b>대표작</b>
            {items.length > 1 && (
              <span className="fx-count" aria-label={`대표작 ${curIdx + 1}번째, 전체 ${items.length}개`}>
                <b>{curIdx + 1}</b> / {items.length}
              </span>
            )}
          </div>
          <div className={`fx-lw${edge.l ? ' l' : ''}${edge.r ? ' r' : ''}`}>
            <div className="fx-list" ref={listRef}>
              {items.map((x, i) => (
                <button key={x.work.id} type="button" className={`fx-q ${i === curIdx ? 'on' : ''}`} onClick={() => setIdx(i)}>
                  <Thumb work={x.work} />
                  <span>
                    <small>{label(x)}</small>
                    <b>{x.work.title}</b>
                    <em>{s.artistNames(x.work)}</em>
                  </span>
                </button>
              ))}
            </div>
            {edge.l && <button type="button" className="fx-nav prev" aria-label="이전 대표작 보기" onClick={() => nudge(-1)}>‹</button>}
            {edge.r && <button type="button" className="fx-nav next" aria-label="다음 대표작 보기" onClick={() => nudge(1)}>›</button>}
          </div>
          <Link className="fx-all" href="/portfolio">전체 작업물 보기 <Icon name="arrow" /></Link>
        </div>
      </aside>
    </div>
  );
}
