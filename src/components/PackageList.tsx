// src/components/PackageList.tsx — 질문형 미리보기 카드 + 클릭하면 구성·항목별 금액 팝업
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  optKey?: string; // 방문자가 끌 수 있는 항목의 안정적인 키 (i:<항목id> / e:<extras순번>)
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

export function Modal({ p, onClose, initialOff, onAddToCart, discordUrl, cartBadge, onViewCart }: {
  p: PackageView; onClose: () => void;
  initialOff?: string[]; // 장바구니에서 열 때 저장된 끔 상태
  onAddToCart?: (off: string[]) => void; // PC 장바구니 담기 (PC에서만 버튼 표시)
  discordUrl?: string; // 디스코드 문의 링크. 없으면 문의 버튼을 숨깁니다.
  cartBadge?: { n: number; total: string } | null; // 담은 뒤 '내 견적' 개수·합계 표시용
  onViewCart?: () => void; // '내 견적 보기' 버튼: 패널 펼치기
}) {
  const lang = useLocale();
  const C = dict(lang).common;
  const L = dict(lang).pricing;
  const P = dict(lang).pkg;
  const X = dict(lang).pex;
  const won = (n: number) => n.toLocaleString(L.numLocale);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set(initialOff ?? []));
  const [copied, setCopied] = useState(false);
  const [dcNote, setDcNote] = useState(false);
  const [added, setAdded] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [moreDown, setMoreDown] = useState(false);
  const [barH, setBarH] = useState(0);
  useEffect(() => {
    try { if (sessionStorage.getItem('hr-cart-hint-seen')) setHintSeen(true); } catch { /* 저장소 접근 실패는 무시 */ }
  }, []);

  // 스크롤이 넘치고 맨 아래 5px 안쪽이 아닐 때만 '더 아래' 신호를 보입니다.
  // 스크롤은 passive + rAF 쓰로틀, 크기 변화(모달·창·토글로 인한 내용 높이 변화)는
  // ResizeObserver와 매 렌더 후 재판정으로 잡습니다.
  const checkMore = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollHeight - el.clientHeight > 2;
    const nearEnd = el.scrollHeight - el.scrollTop - el.clientHeight <= 5;
    setMoreDown(overflow && !nearEnd);
    const bar = barRef.current;
    if (bar) setBarH(bar.offsetHeight);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; checkMore(); });
    };
    checkMore();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(checkMore);
    ro.observe(el);
    if (barRef.current) ro.observe(barRef.current);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [checkMore]);
  useEffect(() => { checkMore(); });

  const scrollDown = () => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ top: Math.round(el.clientHeight * 0.8), behavior: reduce ? 'auto' : 'smooth' });
  };
  const isOff = (l: PkgLine) => l.optKey != null && off.has(l.optKey);

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
  // 끈 항목도 통화 판정에는 포함해, 토글을 바꿔도 표시 통화가 흔들리지 않게 합니다.
  const all = p.rows.flatMap((r) => r.lines);
  const active = all.filter((l) => !isOff(l));
  const useUsd = lang === 'en' && p.totalUsd != null && all.length > 0 && all.every((l) => l.unitUsd != null);
  const cur = useUsd ? L.curUsd : L.cur;

  // 모든 '켜진' 항목에 금액(0 포함)이 있을 때만 합계를 계산해 보여줍니다.
  const complete = active.length > 0 && active.every((l) => (useUsd ? l.unitUsd != null : l.unit != null));
  const sub = complete ? active.reduce((s, l) => s + ((useUsd ? l.unitUsd : l.unit) as number) * l.qty, 0) : 0;
  // 끈 항목의 금액만큼 패키지 정가에서도 뺍니다 (할인 전 정가 기준).
  const removed = all.filter(isOff).reduce((s, l) => s + ((useUsd ? l.unitUsd ?? 0 : l.unit ?? 0) as number) * l.qty, 0);
  const baseTotal = toNum(useUsd ? (p.totalUsd ?? '') : p.total);
  const total = baseTotal != null && off.size > 0 ? Math.max(0, baseTotal - removed) : baseTotal;
  const diff = complete && total != null ? total - sub : null;
  const hasEst = active.some((l) => l.est);
  const canToggle = all.some((l) => l.optKey != null);
  const toggle = (key: string) =>
    setOff((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });

  // 끈 항목의 원래 금액 (취소선 표시용)
  const offAmt = (l: PkgLine) => {
    const g = useUsd ? l.unitUsd : l.unit;
    return g == null ? null : `${won(g * l.qty)}${cur}`;
  };

  // 장바구니 '내역 복사'와 같은 형식의 견적 텍스트
  const quoteText = () => {
    const r = pkgCopyLines(p, [...off], { useUsd, cur, won, sub: X.sub, lineAsk: P.askLater, offTag: X.offTag });
    const out = [...r.lines, `${X.total}: ${won(r.amount)}${cur}~ ${L.vat}`];
    if (r.ask) out.push(X.askLater);
    return out.join('\n');
  };
  const copyQuote = async () => {
    const text = quoteText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(X.copyFail, text);
    }
  };
  const inquireDiscord = async () => {
    if (!discordUrl) return;
    const text = quoteText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt(X.copyFail, text);
    }
    setDcNote(true);
    setTimeout(() => setDcNote(false), 4000);
    window.open(discordUrl, '_blank', 'noopener,noreferrer');
  };

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

        <div className="hr-pm-scroll" ref={scrollRef}>
          <button type="button" className="hr-pm-tolist" onClick={onClose}>{P.backList}</button>
          <div className="hr-pm-top"><span>EX {p.no}</span><em>{p.tag}</em></div>
          <h3>{p.name}</h3>
          {p.desc && <p className="hr-pm-desc">{p.desc}</p>}
          {canToggle && <p className="hr-pm-tognote">{P.exclNote}</p>}

          <div className="hr-pm-est">
            <small>{P.est}</small>
            <strong>
              {off.size > 0 && total != null ? (
                <>{won(total)}{cur}~</>
              ) : (
                <Price price={p.total} priceUsd={p.totalUsd} discount={p.discount} />
              )}
            </strong>
            <i>{L.vat}{off.size > 0 ? null : <Until discount={p.discount} />}</i>
          </div>
          <p className="hr-pm-count">{fill(P.itemsN, { n: all.length })}</p>

          <div className="hr-pb">
            {p.rows.map((r) => (
              <div key={r.label}>
                <span className="hr-pb-g">{r.label}</span>
                <ul>
                  {r.lines.map((l, i) => {
                    const offLine = isOff(l);
                    return (
                    <li key={`${l.name}-${i}`} className={offLine ? 'off' : undefined}>
                      <span className="hr-pb-n">
                        {l.name}
                        {l.est
                          ? <small className="hr-pb-e">{fill(P.exQty, { q: qtyText(l) })}</small>
                          : l.qty > 1 && <small className="hr-pb-q">×{l.qty}</small>}
                        {l.collab && <small className="hr-pb-c">{P.collab}{l.who ? ` · ${l.who}` : ''}</small>}
                        {l.optKey ? (
                          <>
                            <button
                              type="button"
                              className="hr-tg"
                              role="switch"
                              aria-checked={!offLine}
                              aria-label={fill(P.togAria, { name: l.name })}
                              onClick={() => toggle(l.optKey!)}
                            ><i /></button>
                            <small className={`hr-tg-lab${offLine ? '' : ' in'}`}>{offLine ? P.togOff : P.togOn}</small>
                          </>
                        ) : (
                          <small className="hr-pb-always">{P.always}</small>
                        )}
                      </span>
                      <span className="hr-pb-a">
                        {offLine ? (
                          offAmt(l) != null ? <i className="was"><s>{offAmt(l)}</s></i> : <em>–</em>
                        ) : l.unit == null ? (
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
                    );
                  })}
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
            {off.size > 0 && <p className="hr-pb-miss">{P.offNote}</p>}
          </div>

          <p className="hr-pm-note">{L.exCap}</p>

          <div className="hr-pm-bar hr-pm-bar-s" ref={barRef}>
            {off.size > 0 && (
              <div className="hr-pm-bar-sum">
                <span className="hr-pm-bar-pair">
                  <span className="hr-pm-bar-base">
                    <em>{X.barBase}</em>
                    <Price price={p.total} priceUsd={p.totalUsd} discount={p.discount} />
                  </span>
                  <span className="hr-pm-bar-arrow" aria-hidden="true">→</span>
                  <span className="hr-pm-bar-sel" role="status" aria-live="polite">
                    <em>{X.barSel}</em>
                    <b key={total ?? 'ask'}>{total != null ? <>{won(total)}{cur}~</> : P.askLater}</b>
                  </span>
                </span>
              </div>
            )}
            <div className="hr-pm-bar-btns">
              {onAddToCart && (
                <button
                  type="button"
                  className="hr-cart-add hr-pm-cartbtn"
                  onClick={() => {
                    onAddToCart([...off]);
                    setAdded(true);
                    setHintSeen(true);
                    try { sessionStorage.setItem('hr-cart-hint-seen', '1'); } catch { /* 저장 실패는 무시 */ }
                  }}
                >
                  {P.cartAdd}
                </button>
              )}
              <button type="button" className="hr-pm-qcopy hr-pm-copybtn" onClick={copyQuote}>
                {copied ? X.copied : P.quoteCopy}
              </button>
              {discordUrl && (
                <button type="button" className="hr-pm-dc" onClick={inquireDiscord}>
                  {P.dcAsk}
                </button>
              )}
            </div>
            <div className="hr-pm-bar-links">
              {added && onViewCart && (
                <button type="button" className="hr-pm-viewlnk" onClick={onViewCart}>
                  {X.viewCart}
                </button>
              )}
              <button type="button" className="hr-pm-copylnk" onClick={copyQuote}>
                {copied ? X.copied : X.copyItems}
              </button>
              <a className="hr-pm-asklnk" href="#contact" onClick={onClose}>
                {P.ask} <Icon name="arrow" />
              </a>
            </div>
            {added && cartBadge && (
              <p className="hr-pm-added" role="status">
                {fill(X.addedFmt, { n: cartBadge.n, amt: cartBadge.total })}
              </p>
            )}
            {onAddToCart && !cartBadge && !hintSeen && <p className="hr-pm-carthint">{X.cartHint}</p>}
            {dcNote && <p className="hr-pm-dcnote">{P.dcNote}</p>}
          </div>
        </div>

        {moreDown && (
          <div className="hr-pm-more" style={{ bottom: barH }}>
            <div className="hr-pm-fade" aria-hidden="true" />
            <button type="button" className="hr-pm-chip" onClick={scrollDown} aria-label={C.scrollDown}>
              {P.moreBelow}
            </button>
          </div>
        )}
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

/**
 * 장바구니·내역 복사용 금액 계산. 끈(optKey가 off에 있는) 항목은 합계에서 빼고,
 * 가격이 없는('별도 협의') 항목은 0으로 계산하며 ask=true로 표시합니다.
 * usd는 totalUsd가 있고 켜진 모든 항목에 unitUsd가 있을 때만 값을 가집니다.
 */
/**
 * 장바구니·내역 복사·디스코드 문의가 함께 쓰는 패키지 한 줄 분량의 복사 텍스트.
 * pkgMoney와 같은 계산(끈 항목 제외, 금액 없으면 0 처리 + ask 표시)으로 만든 뒤
 * 통화 표기만 호출부의 현재 통화를 따릅니다.
 */
export function pkgCopyLines(p: PackageView, off: readonly string[], c: {
  useUsd: boolean; cur: string; won: (n: number) => string;
  sub: string; lineAsk: string; offTag: string;
}): { lines: string[]; amount: number; ask: boolean } {
  const m = pkgMoney(p, off);
  const mm = c.useUsd && m.usd ? m.usd : m.krw;
  const lines = [`[${p.name}] ${c.sub}: ${c.won(mm.amount)}${c.cur}~`];
  for (const r of p.rows) {
    for (const l of r.lines) {
      if (l.optKey != null && off.includes(l.optKey)) {
        lines.push(` - (${c.offTag}) ${l.name}`);
      } else {
        const get = c.useUsd ? l.unitUsd : l.unit;
        const amt = get == null ? c.lineAsk : `${c.won(get * l.qty)}${c.cur}`;
        lines.push(` - ${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}  ${amt}`);
      }
    }
  }
  return { lines, amount: mm.amount, ask: mm.ask };
}

export function pkgMoney(p: PackageView, off: readonly string[]) {
  const os = new Set(off);
  const all = p.rows.flatMap((r) => r.lines);
  const active = all.filter((l) => !(l.optKey && os.has(l.optKey)));
  const side = (get: (l: PkgLine) => number | null | undefined, total: string | undefined, strict: boolean) => {
    const t = toNum(total ?? '');
    const removed = all.reduce((s, l) => s + (l.optKey && os.has(l.optKey) ? ((get(l) ?? 0) * l.qty) : 0), 0);
    const adj = t != null ? Math.max(0, t - removed) : null;
    const sub = active.reduce((s, l) => s + ((get(l) ?? 0) * l.qty), 0);
    return { amount: adj ?? sub, ask: active.some((l) => get(l) == null), ok: !strict || active.every((l) => get(l) != null) };
  };
  const krw = side((l) => l.unit, p.total, false);
  const usd = p.totalUsd != null ? side((l) => l.unitUsd, p.totalUsd, true) : null;
  return { krw, usd: usd?.ok ? usd : null };
}
