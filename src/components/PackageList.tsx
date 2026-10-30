// src/components/PackageList.tsx — 질문형 미리보기 카드 + 클릭하면 구성·항목별 금액 팝업
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Price, Until } from './Price';
import { Icon } from './Icons';
import { useLocale } from './LocaleLink';
import { dict, fill } from '@/lib/dict';
import type { Discount } from '@/lib/types';

/**
 * unit: 개당 금액(숫자, 0이면 무료). 금액이 정해지지 않은 협업 상품 등은 null
 * unitUsd: 개당 금액 USD
 * list: 단가표의 개당 정가. 무료 항목에 취소선으로 보여줄 때 씁니다. 협업 상품은 없음
 * est: 수량이 예시인 항목(곡마다 달라질 수 있음)
 * noun: 수량 뒤에 붙일 세는 말(예: 트랙). 없으면 ×N 으로 표시
 */
export type PkgLine = {
  name: string; qty: number; unit: number | null; unitUsd?: number | null; list?: number | null;
  est?: boolean; noun?: string; collab?: boolean; who?: string;
};
type PkgRow = { label: string; lines: PkgLine[] };
export type PackageView = {
  id: string; no: string; tag: string; name: string; desc: string; total: string; totalUsd?: string; discount?: Discount; rows: PkgRow[];
};

const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** 수량 표기: 세는 말이 있으면 "8트랙", 없으면 "×8" */
const qtyText = (l: PkgLine) => (l.noun ? `${l.qty}${l.noun}` : `×${l.qty}`);
/** 계산식용 표기: "20,000원 × 8트랙" */
const mulText = (l: PkgLine) => (l.noun ? `${l.qty}${l.noun}` : `${l.qty}`);

function Modal({ p, onClose }: { p: PackageView; onClose: () => void }) {
  const lang = useLocale();
  const L = dict(lang).pricing;
  const P = dict(lang).pkg;
  const won = (n: number) => n.toLocaleString(L.numLocale);
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

  // 규칙 3: 통화를 섞지 않습니다. 모든 항목에 USD가 있으면 USD로, 아니면 KRW로.
  const all = p.rows.flatMap((r) => r.lines);
  const useUsd = lang === 'en' && p.totalUsd != null && all.length > 0 && all.every((l) => l.unitUsd != null);
  const cur = useUsd ? L.curUsd : L.cur;

  // 모든 항목에 금액(0 포함)이 있을 때만 합계를 계산해 보여줍니다.
  const complete = all.length > 0 && all.every((l) => (useUsd ? l.unitUsd != null : l.unit != null));
  const sub = complete ? all.reduce((s, l) => s + ((useUsd ? l.unitUsd : l.unit) as number) * l.qty, 0) : 0;
  const total = toNum(useUsd ? (p.totalUsd ?? '') : p.total);
  const diff = complete && total != null ? total - sub : null;
  const hasEst = all.some((l) => l.est);

  return createPortal(
    <div className="hr-pm-back" onClick={onClose}>
      <div
        className="hr-pm"
        role="dialog"
        aria-modal="true"
        aria-label={p.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="hr-pm-x" aria-label={L.close} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hr-pm-scroll">
          <div className="hr-pm-top"><span>EX {p.no}</span><em>{p.tag}</em></div>
          <h3>{p.name}</h3>
          {p.desc && <p className="hr-pm-desc">{p.desc}</p>}

          <div className="hr-pm-est">
            <small>{P.est}</small>
            <strong><Price price={p.total} priceUsd={p.totalUsd} discount={p.discount} /></strong>
            <i>{L.vat}<Until discount={p.discount} /></i>
          </div>

          <div className="hr-pb">
            {p.rows.map((r) => (
              <div key={r.label}>
                <span className="hr-pb-g">{r.label}</span>
                <ul>
                  {r.lines.map((l, i) => (
                    <li key={`${l.name}-${i}`}>
                      <span className="hr-pb-n">
                        {l.name}
                        {l.est
                          ? <small className="hr-pb-e">{fill(P.exQty, { q: qtyText(l) })}</small>
                          : l.qty > 1 && <small className="hr-pb-q">×{l.qty}</small>}
                        {l.collab && <small className="hr-pb-c">{P.collab}{l.who ? ` · ${l.who}` : ''}</small>}
                      </span>
                      <span className="hr-pb-a">
                        {l.unit == null ? (
                          <em>{P.askLater}</em>
                        ) : l.unit === 0 ? (
                          <>
                            {l.list != null && l.list > 0 && (
                              <i className="was">
                                <span className="sr-only">{P.listPrice}</span>
                                <s>{won(l.list * l.qty)}{cur}</s>
                                {l.qty > 1 && ` (${won(l.list)}{cur} × ${mulText(l)})`}
                              </i>
                            )}
                            <b className="free">{P.free}</b>
                          </>
                        ) : (
                          <>
                            {l.qty > 1 && <i>{won(useUsd ? l.unitUsd as number : l.unit)}{cur} × {mulText(l)}</i>}
                            <b>{won((useUsd ? l.unitUsd as number : l.unit) * l.qty)}{cur}</b>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {complete && diff != null ? (
              <div className="hr-pb-sum">
                <div className="hr-pb-r"><span>{P.sub}</span><b>{won(sub)}{cur}</b></div>
                {diff !== 0 && (
                  <div className="hr-pb-r adj">
                    <span>{diff < 0 ? P.discount : P.adjust}</span>
                    <b>{diff < 0 ? '-' : '+'}{won(Math.abs(diff))}{cur}</b>
                  </div>
                )}
                <div className="hr-pb-r tot"><span>{P.total}</span><b>{won(total as number)}{cur}</b></div>
              </div>
            ) : (
              <p className="hr-pb-miss">{P.missing}</p>
            )}

            {hasEst && <p className="hr-pb-miss">{P.estNote}</p>}
          </div>

          <p className="hr-pm-note">{L.exCap}</p>
        </div>

        <div className="hr-pm-foot">
          <a className="hr-pm-ask" href="#contact" onClick={onClose}>
            {P.ask} <Icon name="arrow" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Preview({ p }: { p: PackageView }) {
  const P = dict(useLocale()).pkg;
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
          {P.view}
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
