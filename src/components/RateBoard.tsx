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
import { badgeClass, badgeText } from '@/lib/rate-badge';
import { BonusNote } from './BonusNote';
import { track } from '@/lib/track';
import type { BonusView } from '@/lib/bonus';
import { GroupWorks } from './GroupWorks';
import { GroupMixer } from './GroupMixer';
import { useLocale } from './LocaleLink';
import { dict, fill } from '@/lib/dict';
import type { MixItem } from '@/lib/pricing-mixer';

type BoardItem = {
  id: string; name: string; desc: string; price: string; unit: string; tag?: string; discount?: Discount;
  turn?: GroupTurn; noDisc?: boolean; bonus?: string; noBonus?: string;
};
export type BoardGroup = { id: string; no: string; name: string; en: string; desc: string; items: BoardItem[]; disc?: GroupDiscView; pick?: string[]; mixer?: { mode: 'mix' | 'ab'; items: MixItem[] } };

/** "50,000" 같은 글자에서 숫자만 뽑습니다. 숫자가 아니면 null (예: "문의") */
const toNum = (s: string) => {
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** 현재 언어의 문구 묶음과 숫자 표기 함수 */
function useL() {
  const lang = useLocale();
  const L = dict(lang).pricing;
  return { lang, L, won: (n: number) => n.toLocaleString(L.numLocale) };
}

/** 기본가에 추가요금을 더한 총 금액. 추가요금이 없거나 기본가가 숫자가 아니면 null */
function withFee(base: number | null, f: Fee): number | null {
  if (base == null || !f) return null;
  return f.type === 'pct' ? Math.round(base * (1 + f.value / 100)) : base + f.value;
}

function OptRow({ label, days, on, fee, base, isBase }: {
  label: string; days: string; on: boolean; fee: Fee; base: number | null; isBase?: boolean;
}) {
  const { lang, L, won } = useL();
  const total = isBase ? base : withFee(base, fee);
  const diff = !isBase && total != null && base != null ? total - base : null;
  const rate = isBase ? '' : feeLabel(fee, lang) + (fee?.type === 'pct' && diff != null ? ` (${fill(L.feeWon, { v: won(diff) })})` : '');

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
            <strong>{total != null ? `${won(total)}${L.cur}~` : L.askPrice}</strong>
          </>
        ) : (
          <span>{L.na}</span>
        )}
      </div>
    </li>
  );
}

function RateModal({ groupName, i, onClose }: { groupName: string; i: BoardItem; onClose: () => void }) {
  const { L, lang } = useL();
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
        <button ref={closeRef} type="button" className="hr-pm-x" aria-label={L.close} onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="hr-pm-scroll">
          <div className="hr-pm-top"><span>{groupName}</span>{i.tag && <em className={badgeClass(i.tag)}>{badgeText(i.tag, lang)}</em>}</div>
          <h3>{i.name}</h3>
          {i.desc && <p className="hr-pm-desc">{i.desc}</p>}

          <div className="hr-pm-est">
            <small>{L.baseLab}</small>
            <strong><Price price={i.price} discount={i.discount} /></strong>
            <i>{i.unit} · {L.vat}<Until discount={i.discount} /></i>
          </div>

          {t && (
            <ul className="hr-ro" aria-label={L.optAria}>
              <OptRow label={L.optBase} days={t.avg || L.askTiming} on fee={null} base={base} isBase />
              <OptRow label={L.optRush} days={t.rush.on ? t.rush.days || L.askTiming : '-'} on={t.rush.on} fee={t.rush.fee} base={base} />
              <OptRow label={L.optSame} days={L.sameDay} on={t.same.on} fee={t.same.fee} base={base} />
            </ul>
          )}
          {i.bonus && <p className="hr-pm-bonus"><b>{L.bonusInc}</b>{i.bonus}</p>}
          <p className="hr-pm-note">
            {onSale ? L.saleNote : ''}
            {L.rateNote}
          </p>
        </div>

        <div className="hr-pm-foot">
          <a className="hr-pm-ask" href="#contact" onClick={() => { track('click', `ask:${i.id}`); onClose(); }}>
            {L.askThis} <Icon name="arrow" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RateCard({ groupName, i, showDisc }: { groupName: string; i: BoardItem; showDisc: boolean }) {
  const { L, lang } = useL();
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
        {i.tag && <em className={badgeClass(i.tag)}>{badgeText(i.tag, lang)}</em>}
      </div>
      {i.desc && <p>{i.desc}</p>}
      <div className="hr-rt-price">
        <span className="hr-rt-lab">{L.baseLab}</span>
        <strong><Price price={i.price} discount={i.discount} /></strong>
        <i>{i.unit} · {L.vat}<Until discount={i.discount} /></i>
      </div>

      {i.turn && (
        <div className="hr-rt-avg">
          <span>{L.avg}</span>
          <b>{i.turn.avg || L.ask}</b>
        </div>
      )}
      {showDisc && i.noDisc && <p className="hr-dc-ex">{L.noDisc}</p>}
      {i.noBonus && <p className="hr-dc-ex">{fill(L.noBonus, { name: i.noBonus })}</p>}

      {i.turn && (
        <button ref={btnRef} type="button" className="hr-rt-more" aria-haspopup="dialog" onClick={() => { track('click', `rate:${i.id}`); setOpen(true); }}>
          {L.more} <Icon name="arrow" />
        </button>
      )}
      {open && <RateModal groupName={groupName} i={i} onClose={close} />}
    </li>
  );
}

/** 할인 안내: 박스 없이 라벨 + 내용만 */
function DiscBox({ v }: { v: GroupDiscView }) {
  const { lang, L } = useL();
  return (
    <div className="hr-dn" aria-label={L.discAria}>
      {v.volume.length > 0 && (
        <p>
          <b>{L.volDisc}</b>
          <span>{v.volume.map((t) => volLabel(t, lang)).join(' · ')}</span>
        </p>
      )}
      {v.bundle && (
        <p className={v.bundle === 'no' ? 'no' : ''}>
          <b>{L.bundleDisc}</b>
          <span>{v.bundle === 'yes' ? L.bundleYes : L.bundleNo}</span>
        </p>
      )}
    </div>
  );
}

/** 옆으로 미는 탭 줄. 더 볼 내용이 있는 쪽 끝에 그림자와 ‹ › 버튼을 보여줍니다. */
function TabScroller({ children }: { children: React.ReactNode }) {
  const { L } = useL();
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
      <div className="hr-rt-tabs" ref={ref} role="group" aria-label={L.tabsAria}>{children}</div>
      {edge.l && <button type="button" className="hr-rt-nav prev" aria-label={L.scrollL} onClick={() => go(-1)}>‹</button>}
      {edge.r && <button type="button" className="hr-rt-nav next" aria-label={L.scrollR} onClick={() => go(1)}>›</button>}
    </div>
  );
}

export function RateBoard({ groups, bonus }: { groups: BoardGroup[]; bonus?: BonusView }) {
  const { L } = useL();
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
        <b>{L.tabHead}</b>
        <span>{fill(L.tabSub, { n: groups.length })}</span>
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
            <h3>{g.name}{g.en && <span>{g.en}</span>}</h3>
            {g.desc && <p>{g.desc}</p>}
          </div>

          {g.disc && <DiscBox v={g.disc} />}
          <ul className="hr-rt-grid">
            {g.items.map((i) => (
              <RateCard key={i.id} groupName={g.name} i={i} showDisc={!!g.disc} />
            ))}
          </ul>
          {g.id === cur && g.mixer && <GroupMixer groupName={g.name} mode={g.mixer.mode} items={g.mixer.items} />}
          {g.id === cur && <GroupWorks groupId={g.id} groupName={g.name} pick={g.pick} />}
        </section>
      ))}
    </div>
  );
}
