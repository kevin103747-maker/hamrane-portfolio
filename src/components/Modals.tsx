// src/components/Modals.tsx
'use client';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ModalCtx } from './ModalContext';
import { useSite } from './SiteProvider';
import { Avatar } from './Avatar';
import { Icon } from './Icons';
import { Thumb } from './Thumb';
import { WorkCard } from './WorkCard';
import { orderParts } from '@/lib/work-parts';
import { parseClip } from '@/lib/clip';
import { COPY } from '@/lib/copy';

type Open = { kind: 'work' | 'artist'; id: string } | null;

function WorkModal({ id, onClose, onNav }: { id: string; onClose: () => void; onNav: (d: number) => void }) {
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
        <button className="hr-x" onClick={onClose} aria-label="닫기" autoFocus><Icon name="close" /></button>
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
      {s.works.length > 1 && (
        <div className="hr-nav">
          <button onClick={() => onNav(-1)} title="← 키">‹ 이전 곡</button>
          <button onClick={() => onNav(1)} title="→ 키">다음 곡 ›</button>
        </div>
      )}
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
        <button className="hr-x" onClick={onClose} aria-label="닫기" autoFocus><Icon name="close" /></button>
      </div>
      <div className="mb">
        {list.length ? (
          <div className="grid">{list.map((w) => <WorkCard key={w.id} work={w} parts={false} />)}</div>
        ) : (
          <p className="hr-empty">{COPY.emptyArtist}</p>
        )}
      </div>
    </div>
  );
}

/** 주소창의 ?work= 값을 모달 상태와 맞춥니다(페이지 이동 없이 주소만 교체). */
function syncUrl(workId: string | null) {
  const u = new URL(window.location.href);
  if (workId) u.searchParams.set('work', workId);
  else u.searchParams.delete('work');
  window.history.replaceState(null, '', u.pathname + u.search + u.hash);
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const s = useSite();
  const [open, setOpen] = useState<Open>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const openWork = useCallback((id: string) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setOpen({ kind: 'work', id });
    syncUrl(id);
  }, []);
  const openArtist = useCallback((id: string) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setOpen({ kind: 'artist', id });
    syncUrl(null);
  }, []);
  const close = useCallback(() => {
    setOpen(null);
    syncUrl(null);
    lastFocus.current?.focus?.();
  }, []);
  const value = useMemo(() => ({ openWork, openArtist }), [openWork, openArtist]);

  // 곡 모달에서 이전/다음 곡으로 이동합니다(목록 끝에서는 반대편으로 이어집니다).
  const nav = useCallback((d: number) => {
    if (!open || open.kind !== 'work' || s.works.length < 2) return;
    const i = s.works.findIndex((w) => w.id === open.id);
    if (i < 0) return;
    const next = s.works[(i + d + s.works.length) % s.works.length];
    setOpen({ kind: 'work', id: next.id });
    syncUrl(next.id);
  }, [open, s.works]);

  // 공유 링크(?work=ID)로 들어온 경우, 처음 한 번만 해당 곡 모달을 엽니다.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const id = new URLSearchParams(window.location.search).get('work');
    if (!id) return;
    if (s.works.some((w) => w.id === id)) setOpen({ kind: 'work', id });
    else syncUrl(null);
  }, [s.works]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') nav(-1);
      else if (e.key === 'ArrowRight') nav(1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, nav]);

  return (
    <ModalCtx.Provider value={value}>
      {children}
      {open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={close}>
          {open.kind === 'work'
            ? <WorkModal key={open.id} id={open.id} onClose={close} onNav={nav} />
            : <ArtistModal id={open.id} onClose={close} />}
        </div>
      )}
    </ModalCtx.Provider>
  );
}