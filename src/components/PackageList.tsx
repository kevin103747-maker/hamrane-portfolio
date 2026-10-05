// src/components/PackageList.tsx — 질문형 미리보기 카드 + 클릭하면 구성·항목별 금액 팝업
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Price, Until } from './Price';
import { Icon } from './Icons';
import type { Discount } from '@/lib/types';

/**
 * unit: 개당 금액(숫자, 0이면 무료). 금액이 정해지지 않은 협업 상품 등은 null
 * list: 단가표의 개당 정가. 무료 항목에 취소선으로 보여줄 때 씁니다. 협업 상품은 없음
 * est: 수량이 예시인 항목(곡마다 달라질 수 있음)
 * noun: 수량 뒤에 붙일 세는 말(예: 트랙). 없으면 ×N 으로 표시
 */
export type PkgLine = {
  name: string; qty: number; unit: number | null; list?: number | null;
  est?: boolean; noun?: string; collab?: boolean; who?: string;
};
type PkgRow = { label: string; lines: PkgLine[] };
export type PackageView = {
  id: string; no: string; tag: string; name: string; desc: string; total: string; discount?: Discount; rows: PkgRow[];
};

const won = (n: number) => n.toLocaleString('ko-KR');
const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** 수량 표기: 세는 말이 있으면 "8트랙", 없으면 "×8" */
const qtyText = (l: PkgLine) => (l.noun ? `${l.qty}${l.noun}` : `×${l.qty}`);
/** 계산식용 표기: "20,000원 × 8트랙" */
const mulText = (l: PkgLine) => (l.noun ? `${l.qty}${l.noun}` : `${l.qty}`);

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

  // 모든 항목에 금액(0 포함)이 있을 때만 합계를 계산해 보여줍니다.
  const all = p.rows.flatMap((r) => r.lines);
  const complete = all.length > 0 && all.every((l) => l.unit != null);
  const sub = complete ? all.reduce((s, l) => s + (l.unit as number) * l.qty, 0) : 0;
  const total = toNum(p.total);
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
                          ? <small className="hr-pb-e">예시 {qtyText(l)}</small>
                          : l.qty > 1 && <small className="hr-pb-q">×{l.qty}</small>}
                        {l.collab && <small className="hr-pb-c">협업{l.who ? ` · ${l.who}` : ''}</small>}
                      </span>
                      <span className="hr-pb-a">
                        {l.unit == null ? (
                          <em>별도 협의</em>
                        ) : l.unit === 0 ? (
                          <>
                            {l.list != null && l.list > 0 && (
                              <i className="was">
                                <span className="sr-only">단가표 정가 </span>
                                <s>{won(l.list * l.qty)}원</s>
                                {l.qty > 1 && ` (${won(l.list)}원 × ${mulText(l)})`}
                              </i>
                            )}
                            <b className="free">무료</b>
                          </>
                        ) : (
                          <>
                            {l.qty > 1 && <i>{won(l.unit)}원 × {mulText(l)}</i>}
                            <b>{won(l.unit * l.qty)}원</b>
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
                <div className="hr-pb-r"><span>구성 합계</span><b>{won(sub)}원</b></div>
                {diff !== 0 && (
                  <div className="hr-pb-r adj">
                    <span>{diff < 0 ? '패키지 할인' : '추가 조정'}</span>
                    <b>{diff < 0 ? '-' : '+'}{won(Math.abs(diff))}원</b>
                  </div>
                )}
                <div className="hr-pb-r tot"><span>패키지 정가</span><b>{won(total as number)}원</b></div>
              </div>
            ) : (
              <p className="hr-pb-miss">금액이 적히지 않은 항목은 협업 작업자와 별도로 조율됩니다.</p>
            )}

            {hasEst && (
              <p className="hr-pb-miss">
                &lsquo;예시&rsquo; 표시 항목은 곡마다 수량이 달라질 수 있어요. 수량이 달라지면 금액도 함께 달라집니다.
              </p>
            )}
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
