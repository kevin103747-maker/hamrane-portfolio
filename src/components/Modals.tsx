// src/components/Modals.tsx
'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ModalCtx } from './ModalContext';
import { useSite } from './SiteProvider';
import { Avatar } from './Avatar';
import { Icon } from './Icons';
import { Thumb } from './Thumb';
import { WorkCard } from './WorkCard';
import { orderParts } from '@/lib/work-parts';
import { parseClip } from '@/lib/clip';

type Open = { kind: 'work' | 'artist'; id: string } | null;

function WorkModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useSite();
  const w = s.works.find((x) => x.id === id);
  if (!w) return null;
  const clip = parseClip(w.clipUrl);
  return (
    <div className="box vbox" onClick={(e) => e.stopPropagation()}>
      <div className="mh">
        <div>
          <small>{s.usageNames(w) || 'WORK'}</small>
          <h3>{w.title}</h3>
        </div>
        <button className="hr-x" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
      </div>
      <div className="hr-video">
        {w.youtubeId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${w.youtubeId}?autoplay=1&rel=0`}
            title={w.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : clip?.embedUrl ? (
          <iframe
            src={clip.embedUrl}
            title={w.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share"
            allowFullScreen
          />
        ) : (
          <Thumb work={w} />
        )}
      </div>
      <div className="hr-vinfo">
        <p>{s.artistNames(w)} · {w.date}</p>
        <div className="pts">
          {orderParts(w).map((pid, i) => <span key={pid} className={i === 0 ? 'k' : ''}>{s.partName(pid)}</span>)}
        </div>
        {w.youtubeId && (
          <a className="hr-yt" href={`https://www.youtube.com/watch?v=${w.youtubeId}`} target="_blank" rel="noopener noreferrer">
            YouTube에서 보기 <Icon name="external" />
          </a>
        )}
        {clip && (
          <a className="hr-yt" href={clip.watchUrl} target="_blank" rel="noopener noreferrer">
            {clip.platform === 'other' ? '원본 영상 보기' : `${clip.label}에서 보기`} <Icon name="external" />
          </a>
        )}
      </div>
    </div>
  );
}

function ArtistModal({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useSite();
  const a = s.artistById.get(id);
  if (!a) return null;
  const list = s.artistWorks(id);
  const href = a.linkUrl && /^https?:\/\//i.test(a.linkUrl) ? a.linkUrl : '';
  return (
    <div className="box" onClick={(e) => e.stopPropagation()}>
      <div className="mh">
        <Avatar artist={a} />
        <div>
          <small>ARTIST</small>
          <h3>
            {href ? (
              <a className="hr-alink" href={href} target="_blank" rel="noopener noreferrer" title="채널·방송국으로 이동">
                {a.name} <Icon name="external" />
              </a>
            ) : a.name}
            <span className="cnt">{list.length}곡</span>
          </h3>
        </div>
        <button className="hr-x" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
      </div>
      <div className="mb">
        {list.length ? (
          <div className="grid">{list.map((w) => <WorkCard key={w.id} work={w} parts={false} />)}</div>
        ) : (
          <p className="hr-empty">아직 등록된 작업물이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open>(null);
  const openWork = useCallback((id: string) => setOpen({ kind: 'work', id }), []);
  const openArtist = useCallback((id: string) => setOpen({ kind: 'artist', id }), []);
  const close = useCallback(() => setOpen(null), []);
  const value = useMemo(() => ({ openWork, openArtist }), [openWork, openArtist]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <ModalCtx.Provider value={value}>
      {children}
      {open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={close}>
          {open.kind === 'work' ? <WorkModal id={open.id} onClose={close} /> : <ArtistModal id={open.id} onClose={close} />}
        </div>
      )}
    </ModalCtx.Provider>
  );
}
