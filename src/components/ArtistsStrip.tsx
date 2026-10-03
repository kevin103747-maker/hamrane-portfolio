// src/components/ArtistsStrip.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './SiteProvider';
import { useModal } from './ModalContext';
import { Avatar } from './Avatar';

const PER_PAGE = 6;
const INTERVAL = 5000;

export function ArtistsStrip() {
  const s = useSite();
  const { openArtist } = useModal();
  const list = s.stripArtists;
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const cur = Math.min(page, pages - 1);

  const go = (d: number) => setPage((p) => (p + d + pages) % pages);

  useEffect(() => {
    if (pages < 2 || paused) return;
    const t = setInterval(() => setPage((p) => (p + 1) % pages), INTERVAL);
    return () => clearInterval(t);
  }, [pages, paused, cur]);

  return (
    <div className="artists" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="lab">
        <b>Artists</b>
        <small>{list.length} ARTISTS</small>
      </div>
      <div
        className="hr-strip"
        onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="hr-strip-page" key={cur}>
          {list.slice(cur * PER_PAGE, cur * PER_PAGE + PER_PAGE).map((a) => (
            <button key={a.id} className="hr-artist" onClick={() => openArtist(a.id)}>
              <Avatar artist={a} />
              <span>{a.name}</span>
              <small>{s.artistWorks(a.id).length}</small>
            </button>
          ))}
        </div>
        {pages > 1 && (
          <div className="hr-dots">
            {Array.from({ length: pages }, (_, i) => (
              <button key={i} className={i === cur ? 'on' : ''} onClick={() => setPage(i)} aria-label={`${i + 1}번째 묶음`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
