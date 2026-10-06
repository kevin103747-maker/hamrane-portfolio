// src/components/BonusNote.tsx — 단가표 맨 위 혜택 한 줄 + "예시 보기" 팝업
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BonusView } from '@/lib/bonus';

/** 썸네일만 먼저 보여 주고, 누르면 그때 영상을 불러옵니다. */
function Video({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="hr-bn-v">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} aria-label={`${title} 예시 영상 재생`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
          <span className="play"><span>▶</span></span>
        </button>
      )}
    </div>
  );
}

function BonusModal({ b, onClose }: { b: BonusView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="hr-pm-back" onClick={onClose}>
      <div className="hr-pm" role="dialog" aria-modal="true" aria-label={b.title} onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="hr-pm-x" aria-label="닫기" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hr-pm-scroll">
          <div className="hr-pm-top"><span>서비스 혜택</span></div>
          <h3>{b.title}</h3>
          {b.line && <p className="hr-pm-desc">{b.line}</p>}
          {b.detail && <p className="hr-pm-desc">{b.detail}</p>}
          {b.conditions.length > 0 && (
            <ul className="hr-bn-list">
              {b.conditions.map((c, n) => <li key={n}>{c}</li>)}
            </ul>
          )}
          {b.videos.length > 0 && (
            <div className="hr-bn-vids">
              {b.videos.map((id, n) => <Video key={id} id={id} title={`${b.title} 예시 ${n + 1}`} />)}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function BonusNote({ b }: { b: BonusView }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };
  const hasMore = !!(b.detail || b.conditions.length || b.videos.length);

  return (
    <div className="hr-bn">
      <i>혜택</i>
      <span><b>{b.title}</b>{b.line ? ` · ${b.line}` : ''}</span>
      {hasMore && (
        <button ref={btnRef} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {b.videos.length ? '예시 보기' : '자세히 보기'}
        </button>
      )}
      {open && <BonusModal b={b} onClose={close} />}
    </div>
  );
}
