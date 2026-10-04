// src/components/PackageList.tsx — 패키지 카드: 요약줄 + 접기/펼치기(전체 구성 보기)
'use client';
import { useId, useState } from 'react';
import { Price, Until } from './Price';
import { Icon } from './Icons';
import type { Discount } from '@/lib/types';

export type PkgLine = { name: string; qty: number; collab?: boolean; who?: string };
export type PkgRow = { label: string; lines: PkgLine[] };
export type PackageView = {
  id: string; no: string; tag: string; name: string; desc: string; total: string; discount?: Discount; rows: PkgRow[];
};

const PEEK = 4; // 접힌 상태에서 먼저 보여줄 상품 수

function Card({ p }: { p: PackageView }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  const count = p.rows.reduce((n, r) => n + r.lines.length, 0);
  const collab = p.rows.reduce((n, r) => n + r.lines.filter((l) => l.collab).length, 0);
  // 숨겨질 상품이 1개뿐이면 접지 않고 전부 보여줍니다.
  const collapsible = count > PEEK + 1;
  const folded = collapsible && !open;

  let seen = 0;
  const rows = p.rows.map((r) => ({
    r,
    lines: r.lines.map((l) => ({ l, extra: collapsible && seen++ >= PEEK })),
  }));

  return (
    <article className="hr-pk2">
      <div className="hr-pk2-side">
        <div className="hr-pk2-top"><span>EX {p.no}</span><em>{p.tag}</em></div>
        <h3>{p.name}</h3>
        {p.desc && <p className="hr-pk2-pd">{p.desc}</p>}
        <div className="hr-pk2-est">
          <small>EST.</small>
          <strong><Price price={p.total} discount={p.discount} /></strong>
          <i>VAT 포함<Until discount={p.discount} /></i>
        </div>
        <a className="hr-pk2-ask" href="#contact">이 구성으로 문의 <Icon name="arrow" /></a>
      </div>

      <div className="hr-pk2-detail">
        <p className="hr-pk2-sum">
          <b>총 {count}개 상품</b>
          <span>{p.rows.length}개 분야</span>
          {collab > 0 && <span className="collab">협업 {collab}개 포함</span>}
        </p>
        <p className="hr-pk2-mix" aria-label="분야별 상품 수">
          {p.rows.map((r) => (
            <span key={r.label}>{r.label}<b>{r.lines.length}</b></span>
          ))}
        </p>

        <div id={bodyId} className="hr-pk2-body" data-folded={folded}>
          {rows.map(({ r, lines }) => (
            <div
              key={r.label}
              className={['hr-pk2-row', lines.every((x) => x.extra) ? 'is-extra' : ''].filter(Boolean).join(' ')}
            >
              <span className="hr-pk2-g">{r.label}</span>
              <ul>
                {lines.map(({ l, extra }, i) => (
                  <li
                    key={`${l.name}-${i}`}
                    className={[l.collab ? 'collab' : '', extra ? 'is-extra' : ''].filter(Boolean).join(' ')}
                  >
                    {l.name}
                    {l.qty > 1 && <small className="q">×{l.qty}</small>}
                    {l.collab && <small className="c">협업{l.who ? ` · ${l.who}` : ''}</small>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {collapsible && (
          <button
            type="button"
            className="hr-pk2-more"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <span>구성 접기</span>
            ) : (
              <span>
                <span className="n">+{count - PEEK}</span> 현재 {PEEK}개 / 총 {count}개 표시 중 · 눌러서 전체 구성 보기
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

export function PackageList({ items }: { items: PackageView[] }) {
  return (
    <div className="hr-pk2-list">
      {items.map((p) => <Card key={p.id} p={p} />)}
    </div>
  );
}
