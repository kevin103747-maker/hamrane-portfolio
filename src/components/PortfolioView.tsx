// src/components/PortfolioView.tsx
'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { matches, type Filter } from '@/lib/filters';
import type { Work } from '@/lib/types';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';

/** 여러 개 선택 가능한 드롭다운 */
function Multi({ label, options, value, onChange }: {
  label: string; options: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="dd" ref={ref}>
      <button className={`dd-btn${value.length ? ' on' : ''}`} onClick={() => setOpen(!open)} aria-expanded={open}>
        {label}{value.length > 0 && <b>{value.length}</b>}
      </button>
      {open && (
        <div className="dd-pop">
          {options.map((o) => (
            <label key={o.id} className="dd-opt">
              <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />{o.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function PortfolioView() {
  const s = useSite();
  const [q, setQ] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [partId, setPartId] = useState<string | null>(null);
  const [usage, setUsage] = useState<string[]>([]);
  const [aType, setAType] = useState<string[]>([]);
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [expanded, setExpanded] = useState(false);

  const filter: Filter = { q, groupId, partId, usage, aType };
  const dir = <X,>(l: X[]) => (sort === 'old' ? [...l].reverse() : l);

  /* 대표작: 선택한 범위(전체 / 그룹 / 파트)에 따라 대시보드에서 지정한 곡만 */
  let feats: { w: Work; pin: string }[];
  if (partId) {
    feats = s.works.filter((w) => w.feat?.parts?.includes(partId)).map((w) => ({ w, pin: s.partName(partId) }));
  } else if (groupId) {
    feats = s.works.filter((w) => w.feat?.groups?.includes(groupId)).map((w) => ({ w, pin: s.groupName(groupId) }));
  } else {
    feats = s.works.filter((w) => w.feat?.default).map((w) => ({ w, pin: s.partName(w.feat!.default!) }));
  }
  feats = dir(feats.filter(({ w }) => matches(w, s, filter, false)));
  const featIds = new Set(feats.map(({ w }) => w.id));

  /* 전체 작업물: 대표작은 위에 이미 있으므로 제외 */
  const matched = dir(s.works.filter((w) => matches(w, s, filter)));
  const list = matched.filter((w) => !featIds.has(w.id));
  const count = new Set([...list.map((w) => w.id), ...featIds]).size;

  const scopeKey = partId ?? groupId ?? 'all';
  const scopeName = partId ? s.partName(partId) : groupId ? s.groupName(groupId) : '';
  const active = !!(q || groupId || partId || usage.length || aType.length);
  const subParts = groupId ? s.parts.filter((p) => p.groupId === groupId) : [];

  /* 대표작 펼치기: 첫 줄 높이 + 둘째 줄 윗부분만 보이게 */
  const featRef = useRef<HTMLDivElement>(null);
  const [featH, setFeatH] = useState<number | undefined>(undefined);
  useEffect(() => { setExpanded(false); }, [scopeKey]);
  useLayoutEffect(() => {
    const el = featRef.current;
    if (!el) return;
    const measure = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (first) setFeatH(first.offsetHeight + 32 + 90);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scopeKey, feats.length]);
  const collapsible = feats.length > 4;
  const collapsed = collapsible && !expanded;

  const reset = () => { setQ(''); setGroupId(null); setPartId(null); setUsage([]); setAType([]); };

  return (
    <>
      <div className="toolbar">
        <div className="wrap tools">
          <label className="search">
            <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="곡 제목, 아티스트 검색" />
          </label>
          <div className="chips">
            <button className={`chip${!groupId ? ' on' : ''}`} onClick={() => { setGroupId(null); setPartId(null); }}>전체</button>
            {s.groups.map((g) => (
              <button key={g.id} className={`chip${groupId === g.id ? ' on' : ''}`} onClick={() => { setGroupId(g.id); setPartId(null); }}>
                {s.t(g.name)}
              </button>
            ))}
          </div>
          <span className="tsep" />
          <Multi label="사용처 유형" options={s.usageTypes.map((u) => ({ id: u.id, name: s.t(u.name) }))} value={usage} onChange={setUsage} />
          <Multi label="아티스트 유형" options={s.artistTypes.map((u) => ({ id: u.id, name: s.t(u.name) }))} value={aType} onChange={setAType} />
          <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'old')} aria-label="정렬">
            <option value="new">최신순</option>
            <option value="old">오래된순</option>
          </select>
        </div>
        {groupId && (
          <div className="wrap">
            <div className="chips sub">
              <button className={`chip${!partId ? ' on' : ''}`} onClick={() => setPartId(null)}>전체</button>
              {subParts.map((p) => (
                <button key={p.id} className={`chip${partId === p.id ? ' on' : ''}`} onClick={() => setPartId(p.id)}>{s.t(p.name)}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="wrap">
        {feats.length > 0 && (
          <div className="fblk">
            <div className="fh">
              <span className="n">{scopeName ? `FEATURED · ${scopeName}` : 'FEATURED'}</span>
              <h2>{scopeName ? `${scopeName} 대표작` : '대표작'}</h2>
            </div>
            <div
              key={scopeKey}
              ref={featRef}
              className={`feat${collapsed ? ' collapsed' : ''}`}
              style={collapsed && featH ? ({ '--feat-h': `${featH}px` } as React.CSSProperties) : undefined}
            >
              {feats.map(({ w, pin }) => <WorkCard key={w.id} work={w} pin={pin} />)}
            </div>
            {collapsible && (
              <div className="fexp">
                <button onClick={() => setExpanded(!expanded)}>
                  {expanded ? '접기' : `펼치기 (+${feats.length - 4})`}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="fh">
          <span className="n">ALL</span>
          <h2>{scopeName ? `${scopeName} 참여 작업물` : '전체 작업물'}</h2>
        </div>
        <div className="meta">
          <span><b>{count}</b> works</span>
          {active && <button onClick={reset}>필터 초기화</button>}
        </div>
        <div className="grid">
          {list.length
            ? list.map((w) => <WorkCard key={w.id} work={w} />)
            : <div className="empty">{feats.length ? '위 대표작 외 추가 작업물이 없습니다.' : '조건에 맞는 작업물이 없습니다.'}</div>}
        </div>
      </div>
    </>
  );
}
