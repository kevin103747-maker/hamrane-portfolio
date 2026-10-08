// src/components/PortfolioView.tsx
'use client';
import { matches, type Filter } from '@/lib/filters';
import type { Work } from '@/lib/types';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';
import { Icon } from './Icons';
import { COPY } from '@/lib/copy';
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

const PAGE_SIZE = 12;        // PC: 한 페이지에 보여줄 작업물 수 (4열 × 3줄)
const MOBILE_PAGE_SIZE = 8;  // 휴대폰(560px 이하): 리스트형 카드라 더 적게 보여줍니다

/** 화면이 휴대폰 폭인지 알려줍니다. 서버 렌더링 때는 PC로 보고, 접속 직후 실제 폭으로 바뀝니다. */
const MOBILE_QUERY = '(max-width: 560px)';
function subscribeMobile(cb: () => void) {
  const m = window.matchMedia(MOBILE_QUERY);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
}
const useIsMobile = () =>
  useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);

/** 옆으로 미는 줄. 더 볼 내용이 있는 쪽 끝에 그림자와 › 버튼을 보여 "밀 수 있다"는 걸 알려줍니다. */
function ScrollRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const update = () => {
    const el = ref.current;
    if (!el) return;
    const l = el.scrollLeft > 4;
    const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdge((e) => (e.l === l && e.r === r ? e : { l, r }));
  };
  useLayoutEffect(update); // 칩 내용이 바뀔 때마다 다시 계산
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`hr-scrl${edge.l ? ' l' : ''}${edge.r ? ' r' : ''}`}>
      <div ref={ref} className={`hr-sr-row ${className}`} onScroll={update}>{children}</div>
            {edge.l && (
        <button
          type="button"
          className="hr-sr-prev"
          aria-label="왼쪽으로 더 보기"
          onClick={() => ref.current?.scrollBy({ left: -ref.current.clientWidth * 0.6, behavior: 'smooth' })}
        >‹</button>
      )}

      {edge.r && (
        <button
          type="button"
          className="hr-sr-next"
          aria-label="오른쪽으로 더 보기"
          onClick={() => ref.current?.scrollBy({ left: ref.current.clientWidth * 0.6, behavior: 'smooth' })}
        >›</button>
      )}
    </div>
  );
}

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

/** 1 … 4 5 6 … 20 형태의 페이지 번호 목록 */
function pageNums(cur: number, total: number): (number | '…')[] {
  const keep = new Set([1, total, cur - 1, cur, cur + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

function Pager({ page, pages, onGo }: { page: number; pages: number; onGo: (n: number) => void }) {
  if (pages < 2) return null;
  return (
    <nav className="hr-pgn" aria-label="페이지 이동">
      <button onClick={() => onGo(page - 1)} disabled={page === 1} aria-label="이전 페이지">‹</button>
      {pageNums(page, pages).map((n, i) =>
        n === '…'
          ? <span key={`gap-${i}`} className="gap">…</span>
          : (
            <button key={n} className={n === page ? 'on' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => onGo(n)}>
              {n}
            </button>
          ),
      )}
      <button onClick={() => onGo(page + 1)} disabled={page === pages} aria-label="다음 페이지">›</button>
    </nav>
  );
}

export function PortfolioView() {
  const s = useSite();
  const isMobile = useIsMobile();
  const pageSize = isMobile ? MOBILE_PAGE_SIZE : PAGE_SIZE;
  const [q, setQ] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [partId, setPartId] = useState<string | null>(null);
  const [usage, setUsage] = useState<string[]>([]);
  const [aType, setAType] = useState<string[]>([]);
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false); // 휴대폰: 세부 필터(사용처·아티스트 유형·정렬) 펼침 여부
  const [pg, setPg] = useState<{ key: string; n: number }>({ key: '', n: 1 });
  const [hydrated, setHydrated] = useState(false); // 주소에서 필터를 읽어오기 전에는 주소를 건드리지 않습니다
  const allRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* 접속 시 주소(?q=&group=&part=&usage=&type=&sort=&page=)에서 필터를 복원합니다.
     서버 렌더링과 어긋나지 않도록 마운트 직후 한 번만 읽습니다. */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const list = (k: string, valid: { id: string }[]) =>
      (p.get(k) ?? '').split(',').filter((id) => valid.some((v) => v.id === id));
    const part = s.parts.find((x) => x.id === p.get('part'));
    const g = part ? part.groupId : (s.groups.find((x) => x.id === p.get('group'))?.id ?? null);
    const pt = part?.id ?? null;
    const qq = (p.get('q') ?? '').slice(0, 100);
    const u = list('usage', s.usageTypes);
    const a = list('type', s.artistTypes);
    const so: 'new' | 'old' = p.get('sort') === 'old' ? 'old' : 'new';
    const n = Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1);
    setQ(qq); setGroupId(g); setPartId(pt); setUsage(u); setAType(a); setSort(so);
    if (u.length || a.length || so === 'old') setMoreOpen(true); // 주소로 들어온 세부 필터는 접어 두지 않고 보여줍니다
    if (n > 1) setPg({ key: JSON.stringify([qq, g, pt, u, a, so]), n });
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* "/" 키로 검색창에 바로 이동합니다(입력 중이거나 팝업이 열려 있으면 무시). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('.modal')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  /* 페이지 나누기: 검색·필터·정렬이 바뀌면 자동으로 1페이지로 돌아갑니다 */
  const filterKey = JSON.stringify([q, groupId, partId, usage, aType, sort]);
  const pages = Math.max(1, Math.ceil(list.length / pageSize));
  const page = Math.min(pg.key === filterKey ? pg.n : 1, pages);
  const shown = list.slice((page - 1) * pageSize, page * pageSize);
  const goPage = (n: number) => {
    setPg({ key: filterKey, n: Math.max(1, Math.min(pages, n)) });
    allRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* 필터가 바뀔 때마다 주소를 갱신합니다(히스토리를 쌓지 않고 교체). 곡 팝업의 ?work= 는 그대로 보존됩니다. */
  useEffect(() => {
    if (!hydrated) return;
    const u = new URL(window.location.href);
    const put = (k: string, v: string) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
    put('q', q.trim());
    put('group', groupId ?? '');
    put('part', partId ?? '');
    put('usage', usage.join(','));
    put('type', aType.join(','));
    put('sort', sort === 'old' ? 'old' : '');
    put('page', page > 1 ? String(page) : '');
    window.history.replaceState(null, '', u.pathname + u.search + u.hash);
  }, [hydrated, q, groupId, partId, usage, aType, sort, page]);

  const scopeKey = partId ?? groupId ?? 'all';
  const scopeName = partId ? s.partName(partId) : groupId ? s.groupName(groupId) : '';
  const active = !!(q || groupId || partId || usage.length || aType.length);
  const subParts = groupId ? s.parts.filter((p) => p.groupId === groupId) : [];
  const moreCount = usage.length + aType.length + (sort === 'old' ? 1 : 0); // "필터" 버튼에 표시할 적용 개수

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

  /* ── 필터 도구 조각들: PC와 휴대폰이 같은 조각을 서로 다른 배치로 씁니다 ── */
  const searchBox = (
    <label className="search">
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={searchRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Escape') return;
          if (q) setQ('');
          else e.currentTarget.blur();
        }}
        aria-keyshortcuts="/"
        placeholder="곡 제목, 아티스트 검색"
      />
    </label>
  );

  const groupChips = (
    <>
      <button className={`chip${!groupId ? ' on' : ''}`} onClick={() => { setGroupId(null); setPartId(null); }}>전체</button>
      {s.groups.map((g) => (
        <button key={g.id} className={`chip${groupId === g.id ? ' on' : ''}`} onClick={() => { setGroupId(g.id); setPartId(null); }}>
          {s.t(g.name)}
        </button>
      ))}
    </>
  );

  const partChips = (
    <>
      <button className={`chip${!partId ? ' on' : ''}`} onClick={() => setPartId(null)}>전체</button>
      {subParts.map((p) => (
        <button key={p.id} className={`chip${partId === p.id ? ' on' : ''}`} onClick={() => setPartId(p.id)}>{s.t(p.name)}</button>
      ))}
    </>
  );

  const multiFilters = (
    <>
      <Multi label="사용처 유형" options={s.usageTypes.map((u) => ({ id: u.id, name: s.t(u.name) }))} value={usage} onChange={setUsage} />
      <Multi label="아티스트 유형" options={s.artistTypes.map((u) => ({ id: u.id, name: s.t(u.name) }))} value={aType} onChange={setAType} />
    </>
  );

  /* PC: 기존 드롭다운 */
  const sortSelect = (
    <select className="sel" value={sort} onChange={(e) => setSort(e.target.value as 'new' | 'old')} aria-label="정렬">
      <option value="new">최신순</option>
      <option value="old">오래된순</option>
    </select>
  );

  /* 휴대폰: 목록이 따로 뜨지 않는 두 칸 토글 */
  const sortSeg = (
    <div className="hr-seg" role="group" aria-label="정렬">
      <button type="button" className={sort === 'new' ? 'on' : ''} aria-pressed={sort === 'new'} onClick={() => setSort('new')}>최신순</button>
      <button type="button" className={sort === 'old' ? 'on' : ''} aria-pressed={sort === 'old'} onClick={() => setSort('old')}>오래된순</button>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        {isMobile ? (
          <div className="wrap tools-m">
            {/* 윗줄: 검색창 + 필터 버튼 */}
            <div className="tools-m-top">
              {searchBox}
              <button
                type="button"
                className={`hr-ftog${moreCount ? ' on' : ''}`}
                aria-expanded={moreOpen}
                aria-controls="tools-more"
                onClick={() => setMoreOpen(!moreOpen)}
              >
                <Icon name="filter" className="" />
                <span>필터</span>
                {moreCount > 0 && <b>{moreCount}</b>}
              </button>
            </div>
            {/* 필터를 눌렀을 때만 그려지는 패널 */}
           {moreOpen && (
  <div id="tools-more" className="tools-m-more">
    <div className="tools-m-dd">{multiFilters}</div>
    {sortSeg}
  </div>
)}
            {/* 분야 칩: 옆으로 미는 줄 */}
            <ScrollRow>{groupChips}</ScrollRow>
            {groupId && <ScrollRow className="sub">{partChips}</ScrollRow>}
          </div>
        ) : (
          <>
            <div className="wrap tools">
              {searchBox}
              <div className="chips">{groupChips}</div>
              <span className="tsep" />
              {multiFilters}
              {sortSelect}
            </div>
            {groupId && (
              <div className="wrap">
                <div className="chips sub">{partChips}</div>
              </div>
            )}
          </>
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

        <div className="fh all-anchor" ref={allRef}>
          <span className="n">ALL</span>
          <h2>{scopeName ? `${scopeName} 참여 작업물` : '전체 작업물'}</h2>
        </div>
        <div className="meta">
          <span><b>{count}</b> works{pages > 1 && <> · {page} / {pages} 페이지</>}</span>
          {active && <button onClick={reset}>필터 초기화</button>}
        </div>
        <div className="grid">
          {shown.length
            ? shown.map((w) => <WorkCard key={w.id} work={w} />)
            : (
              <div className="empty">
                {feats.length ? COPY.emptyExtra : active ? COPY.emptySearch : COPY.emptyAll}
                {active && (
                  <>
                    <br />
                    <button className="hr-empty-btn" onClick={reset}>{COPY.resetFilters}</button>
                  </>
                )}
              </div>
            )}
        </div>
        {shown.length === 0 && !feats.length && (
          <div className="grid-skeleton">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card-skeleton">
                <div className="ph-skeleton" />
                <div className="text-skeleton" />
                <div className="text-skeleton short" />
              </div>
            ))}
          </div>
        )}
        <Pager page={page} pages={pages} onGo={goPage} />
      </div>
    </>
  );
}
