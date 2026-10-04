// src/components/PackageList.tsx — 질문형 미리보기 카드 + 클릭하면 구성 팝업
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Price, Until } from './Price';
import { Icon } from './Icons';
import type { Discount } from '@/lib/types';

export type PkgLine = { name: string; qty: number; collab?: boolean; who?: string };
type PkgRow = { label: string; lines: PkgLine[] };
export type PackageView = {
  id: string; no: string; tag: string; name: string; desc: string; total: string; discount?: Discount; rows: PkgRow[];
};

function Modal({ p, onClose }: { p: PackageView; onClose: () => void }) {
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
      <div
        className="hr-pm"
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="hr-pm-x" aria-label="닫기" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hr-pm-scroll">
          <div className="hr-pm-top"><span>EX {p.no}</span><em>{p.tag}</em></div>
          <h3>{p.name}</h3>
          {p.desc && <p className="hr-pm-desc">{p.desc}</p>}

          <div className="hr-pm-est">
            <small>예상 금액</small>
            <strong><Price price={p.total} discount={p.discount} /></strong>
            <i>VAT 포함<Until discount={p.discount} /></i>
          </div>

          <div className="hr-pm-rows">
            {p.rows.map((r) => (
              <div key={r.label}>
                <span className="hr-pm-g">{r.label}</span>
                <ul>
                  {r.lines.map((l, i) => (
                    <li key={`${l.name}-${i}`}>
                      <span>{l.name}</span>
                      {l.qty > 1 && <small className="q">×{l.qty}</small>}
                      {l.collab && <small className="c">협업{l.who ? ` · ${l.who}` : ''}</small>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="hr-pm-note">예시 구성이며, 실제 금액은 곡의 난이도와 작업량에 따라 달라집니다.</p>
        </div>

        <div className="hr-pm-foot">
          <a className="hr-pm-ask" href="#contact" onClick={onClose}>
            이 구성으로 문의 <Icon name="arrow" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Preview({ p }: { p: PackageView }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    btnRef.current?.focus(); // 닫으면 눌렀던 카드로 포커스 복귀
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="hr-pv"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {p.tag && <span className="hr-pv-tag">{p.tag}</span>}
        <strong className="hr-pv-q">{p.name}</strong>
        <span className="hr-pv-go">
          구성 보기
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && <Modal p={p} onClose={close} />}
    </>
  );
}

export function PackageList({ items }: { items: PackageView[] }) {
  return (
    <div className="hr-pv-grid">
      {items.map((p) => <Preview key={p.id} p={p} />)}
    </div>
  );
}
