// src/components/RateBoard.tsx — 단가표: 분야 탭 + 카드 격자 (카드를 누르면 마감 옵션·총 금액 팝업)
'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Price, Until } from './Price';
import { Icon } from './Icons';
import type { Discount } from '@/lib/types';
import { isDiscountActive } from '@/lib/filters';
import { feeLabel, type Fee, type GroupTurn } from '@/lib/turnaround';
import { volLabel, type GroupDiscView } from '@/lib/discounts';
import { badgeClass } from '@/lib/rate-badge';
import { BonusNote } from './BonusNote';
import { track } from '@/lib/track';
import type { BonusView } from '@/lib/bonus';


type BoardItem = {
  id: string; name: string; desc: string; price: string; unit: string; tag?: string; discount?: Discount;
  turn?: GroupTurn; noDisc?: boolean; bonus?: string; noBonus?: string;
};
export type BoardGroup = { id: string; no: string; name: string; en: string; desc: string; items: BoardItem[]; disc?: GroupDiscView };

/** "50,000" 같은 글자에서 숫자만 뽑습니다. 숫자가 아니면 null (예: "문의") */
const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const won = (n: number) => n.toLocaleString('ko-KR');

/** 기본가에 추가요금을 더한 총 금액. 추가요금이 없거나 기본가가 숫자가 아니면 null */
function withFee(base: number | null, f: Fee): number | null {
  if (base == null || !f) return null;
  return f.type === 'pct' ? Math.round(base * (1 + f.value / 100)) : base + f.value;
}

function OptRow({ label, days, on, fee, base, isBase }: {
  label: string; days: string; on: boolean; fee: Fee; base: number | null; isBase?: boolean;
}) {
  const total = isBase ? base : withFee(base, fee);
  const diff = !isBase && total != null && base != null ? total - base : null;
  const rate = isBase ? '' : feeLabel(fee) + (fee?.type === 'pct' && diff != null ? ` (+${won(diff)}원)` : '');

  return (
    <li className={`hr-ro-row${on ? '' : ' no'}`}>
      <div className="hr-ro-l">
        <b>{label}</b>
        <span>{days}</span>
      </div>
      <div className="hr-ro-r">
        {on ? (
          <>
            {rate && <em>{rate}</em>}
            <strong>{total != null ? `${won(total)}원~` : '금액 문의'}</strong>
          </>
        ) : (
          <span>불가</span>
        )}
      </div>
    </li>
  );
}

function RateModal({ groupName, i, onClose }: { groupName: string; i: BoardItem; onClose: () => void }) {
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

  // 할인 중이면 할인가를 기준으로 계산합니다.
  const onSale = !!i.discount?.price && isDiscountActive(i.discount, Date.now());
  const base = toNum(onSale ? i.discount!.price! : i.price);
  const t = i.turn;

  return createPortal(
    <div className="hr-pm-back" onClick={onClose}>
      <div className="hr-pm" role="dialog" aria-modal="true" aria-label={i.name} onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="hr-pm-x" aria-label="닫기" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hr-pm-scroll">
          <div className="hr-pm-top"><span>{groupName}</span>{i.tag && <em className={badgeClass(i.tag)}>{i.tag}</em>}</div>
          <h3>{i.name}</h3>
          {i.desc && <p className="hr-pm-desc">{i.desc}</p>}

          <div className="hr-pm-est">
            <small>기본가</small>
            <strong><Price price={i.price} discount={i.discount} /></strong>
            <i>{i.unit} · VAT 포함<Until discount={i.discount} /></i>
          </div>

          {t && (
            <ul className="hr-ro" aria-label="마감 옵션별 금액">
              <OptRow label="기본" days={t.avg || '기간 문의'} on fee={null} base={base} isBase />
              <OptRow label="빠른 마감" days={t.rush.on ? t.rush.days || '기간 문의' : '-'} on={t.rush.on} fee={t.rush.fee} base={base} />
              <OptRow label="당일 마감" days="당일" on={t.same.on} fee={t.same.fee} base={base} />
            </ul>
          )}
                    {i.bonus && <p className="hr-pm-bonus"><b>포함 혜택</b>{i.bonus}</p>}
          <p className="hr-pm-note">
            {onSale ? '할인가 기준으로 계산한 금액입니다. ' : ''}
            곡의 난이도와 작업량에 따라 달라지며, 확인 후 정확한 금액을 안내드립니다.
          </p>
        </div>

        <div className="hr-pm-foot">
          <a className="hr-pm-ask" href="#contact" onClick={() => { track('click', `ask:${i.id}`); onClose(); }}>
            이 작업으로 문의 <Icon name="arrow" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RateCard({ groupName, i, showDisc }: { groupName: string; i: BoardItem; showDisc: boolean }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    btnRef.current?.focus(); // 닫으면 눌렀던 카드로 포커스 복귀
  };

  return (
    <li className={`hr-rt-card${i.turn ? ' hr-rt-click' : ''}`}>
      <div className="hr-rt-top">
        <b>{i.name}</b>
        {i.tag && <em className={badgeClass(i.tag)}>{i.tag}</em>}
      </div>
      {i.desc && <p>{i.desc}</p>}
      <div className="hr-rt-price">
        <span className="hr-rt-lab">기본가</span>
        <strong><Price price={i.price} discount={i.discount} /></strong>
        <i>{i.unit} · VAT 포함<Until discount={i.discount} /></i>
      </div>

      {i.turn && (
        <div className="hr-rt-avg">
          <span>평균 소요</span>
          <b>{i.turn.avg || '문의'}</b>
        </div>
      )}
      {showDisc && i.noDisc && <p className="hr-dc-ex">수량·묶음 할인 제외 작업</p>}
      {i.noBonus && <p className="hr-dc-ex">{i.noBonus} 제외 작업</p>}


      {i.turn && (
        <button ref={btnRef} type="button" className="hr-rt-more" aria-haspopup="dialog" onClick={() => { track('click', `rate:${i.id}`); setOpen(true); }}>
          마감 옵션·총 금액 보기 <Icon name="arrow" />
        </button>
      )}
      {open && <RateModal groupName={groupName} i={i} onClose={close} />}
    </li>
  );
}

/** 할인 안내: 박스 없이 라벨 + 내용만 */
function DiscBox({ v }: { v: GroupDiscView }) {
  return (
    <div className="hr-dn" aria-label="할인 안내">
      {v.volume.length > 0 && (
        <p>
          <b>수량 할인</b>
          <span>{v.volume.map(volLabel).join(' · ')}</span>
        </p>
      )}
      {v.bundle && (
        <p className={v.bundle === 'no' ? 'no' : ''}>
          <b>묶음 할인</b>
          <span>{v.bundle === 'yes' ? '여러 분야를 함께 의뢰하면 할인 대상' : '이 분야는 묶음 할인에서 제외'}</span>
        </p>
      )}
    </div>
  );
}
/** 옆으로 미는 탭 줄. 더 볼 내용이 있는 쪽 끝에 그림자와 ‹ › 버튼을 보여줍니다. */
function TabScroller({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });

  useEffect(() => {
    const el = ref.current;
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
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);

  const go = (dir: -1 | 1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.6, behavior: 'smooth' });

  return (
    <div className={`hr-rt-wrap${edge.l ? ' l' : ''}${edge.r ? ' r' : ''}`}>
      <div className="hr-rt-tabs" ref={ref} role="group" aria-label="분야 선택">{children}</div>
      {edge.l && <button type="button" className="hr-rt-nav prev" aria-label="왼쪽으로 더 보기" onClick={() => go(-1)}>‹</button>}
      {edge.r && <button type="button" className="hr-rt-nav next" aria-label="오른쪽으로 더 보기" onClick={() => go(1)}>›</button>}
    </div>
  );
}


export function RateBoard({ groups, bonus }: { groups: BoardGroup[]; bonus?: BonusView }) {
  const [cur, setCur] = useState(groups[0]?.id ?? '');

  // 주소의 #cat-분야ID 로 들어오면 해당 탭을 엽니다.
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#cat-/, '');
      if (!id || !groups.some((g) => g.id === id)) return;
      setCur(id);
      requestAnimationFrame(() => document.getElementById(`cat-${id}`)?.scrollIntoView({ block: 'start' }));
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [groups]);

  const pick = (id: string) => {
    if (id !== cur) track('group', id);
    setCur(id);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#cat-${id}`);
  };

  return (
    <div className="hr-rt">
       {bonus && <BonusNote b={bonus} />}
      <div className="hr-rt-tabhead">
        <b>분야 선택</b>
        <span>총 {groups.length}개 분야 · 눌러서 단가를 확인하세요</span>
      </div>
      <TabScroller>
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`hr-rt-tab${g.id === cur ? ' on' : ''}`}
            aria-pressed={g.id === cur}
            aria-controls={`cat-${g.id}`}
            onClick={() => pick(g.id)}
          >
            <small>{g.no}</small>
            {g.name}
            <em>{g.items.length}</em>
          </button>
        ))}
      </TabScroller>

      {groups.map((g) => (
        <section key={g.id} id={`cat-${g.id}`} className="hr-rt-panel" hidden={g.id !== cur} aria-label={g.name}>
          <div className="hr-rt-head">
            <h3>{g.name}<span>{g.en}</span></h3>
            {g.desc && <p>{g.desc}</p>}
          </div>

          {g.disc && <DiscBox v={g.disc} />}
          <ul className="hr-rt-grid">
            {g.items.map((i) => (
              <RateCard key={i.id} groupName={g.name} i={i} showDisc={!!g.disc} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
