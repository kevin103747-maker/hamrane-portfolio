// src/components/PriceExplorer.tsx — 공개 단가 폴더 탐색 + PC 장바구니
'use client';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Modal, pkgMoney, pkgCopyLines, type PackageView } from './PackageList';
import { Price } from './Price';
import type { PublicNode } from '@/lib/price-tree-data';
import { useLocale } from './LocaleLink';
import { dict, fill } from '@/lib/dict';
import { Icon } from './Icons';

type FolderNode = Extract<PublicNode, { kind: 'folder' }>;
type CartItem = { id: string; off: string[] };

const CART_KEY = 'hr-cart';

/** 패키지 카드 하단 가격. '기본 구성 기준'(끔 항목 없음)으로 pkgMoney/Price의 기존 표시를 재사용합니다. */
function CardPrice({ p }: { p: PackageView }) {
  const lang = useLocale();
  const L = dict(lang).pricing;
  const X = dict(lang).pex;
  const won = (n: number) => n.toLocaleString(L.numLocale);
  const m = pkgMoney(p, []);
  const usdOk = lang === 'en' && m.usd != null;
  const ask = !usdOk && m.krw.ask;
  let v: ReactNode;
  if (ask) {
    v = <span className="hr-px-price-ask">{X.cardAsk}</span>;
  } else if (lang === 'en' && p.totalUsd != null && m.usd == null) {
    // USD 칸은 있으나 일부 항목에 USD가 없어 KRW로 통일합니다. Price는 USD를 골라 버리므로 직접 표시합니다.
    v = <>{won(m.krw.amount)}{L.cur}~</>;
  } else {
    v = <Price price={p.total} priceUsd={p.totalUsd} discount={p.discount} />;
  }
  return (
    <span className="hr-px-price">
      <b className="hr-px-price-v">{v}</b>
      <small className="hr-px-price-note">{X.cardBase}</small>
    </span>
  );
}

function Cards({ children, pkgMap, onFolder, onPackage }: {
  children: PublicNode[];
  pkgMap: Map<string, PackageView>;
  onFolder?: (id: string) => void;
  onPackage?: (id: string) => void;
}) {
  const X = dict(useLocale()).pex;
  const gn = Math.min(children.length, 3);
  return (
    <div className={`hr-px-grid${gn ? ` hr-px-g${gn}` : ''}`}>
      {children.map((n) => {
        if (n.kind === 'folder') {
          return (
            <button key={`f-${n.id}`} type="button" className="hr-pv hr-px" onClick={() => onFolder?.(n.id)}>
              <span className="hr-px-ico"><Icon name="folder" /></span>
              <strong className="hr-pv-q">{n.name}</strong>
              {n.desc && <span className="hr-px-d">{n.desc}</span>}
              {n.pkgs > 0 && <span className="hr-px-meta">{fill(X.pkgN, { n: n.pkgs })}</span>}
              <span className="hr-pv-go hr-px-act">
                <span className="hr-px-act-t">{X.actChoose}</span>
                <span className="hr-px-act-a" aria-hidden="true">›</span>
              </span>
            </button>
          );
        }
        const p = pkgMap.get(n.id);
        if (!p) return null;
        return (
          <button key={`p-${n.id}`} type="button" className="hr-pv hr-px" aria-haspopup="dialog" onClick={() => onPackage?.(n.id)}>
            <span className="hr-px-ico"><Icon name="tag" /></span>
            <strong className="hr-pv-q">{p.name}</strong>
            {p.desc && <span className="hr-px-d">{p.desc}</span>}
            <CardPrice p={p} />
            <span className="hr-pv-go hr-px-act">
              <span className="hr-px-act-t">{X.actView}</span>
              <span className="hr-px-act-a" aria-hidden="true">›</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ExplorerInner({ roots, pkgMap, rootQuestion, discordUrl }: {
  roots: PublicNode[]; pkgMap: Map<string, PackageView>; rootQuestion: string; discordUrl?: string;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const lang = useLocale();
  const X = dict(lang).pex;

  // 폴더 맵(부모 포함)과 경로 탐색
  const folders = useMemo(() => {
    const m = new Map<string, FolderNode & { parentId: string | null }>();
    const walk = (ns: PublicNode[], parentId: string | null) => {
      for (const n of ns) {
        if (n.kind === 'folder') {
          m.set(n.id, { ...n, parentId });
          walk(n.children, n.id);
        }
      }
    };
    walk(roots, null);
    return m;
  }, [roots]);
  const treePkgIds = useMemo(() => {
    const s = new Set<string>();
    const walk = (ns: PublicNode[]) => {
      for (const n of ns) {
        if (n.kind === 'package') s.add(n.id); else walk(n.children);
      }
    };
    walk(roots);
    return s;
  }, [roots]);

  const p = sp.get('p');
  const k = sp.get('k');
  const curId = p && folders.has(p) ? p : null;
  const cur = curId ? folders.get(curId)! : null;
  const children = cur ? cur.children : roots;
  const openPkg = k && treePkgIds.has(k) ? pkgMap.get(k) : undefined;

  // 장바구니 상태 (sessionStorage)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartSeed, setCartSeed] = useState<CartItem | null>(null); // 장바구니 행에서 연 팝업의 저장된 끔 상태
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as CartItem[];
      if (Array.isArray(arr)) {
        setCart(arr.filter((x) => x && typeof x.id === 'string' && Array.isArray(x.off) && pkgMap.has(x.id)));
      }
    } catch { /* 저장값이 깨졌으면 빈 장바구니 */ }
  }, [pkgMap]);
  useEffect(() => {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* 저장 실패는 무시 */ }
  }, [cart]);

  const go = (fid: string | null, kid?: string | null, seed?: CartItem | null) => {
    const q = new URLSearchParams();
    if (fid) q.set('p', fid);
    if (kid) q.set('k', kid);
    const s = q.toString();
    router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
    setCartSeed(seed ?? null);
  };

  // 현재 폴더까지의 경로 (루트 → 현재)
  const path: FolderNode[] = [];
  if (curId) {
    const find = (ns: PublicNode[], trail: FolderNode[]): boolean => {
      for (const n of ns) {
        if (n.kind !== 'folder') continue;
        if (n.id === curId) { path.push(...trail, n); return true; }
        if (find(n.children, [...trail, n])) return true;
      }
      return false;
    };
    find(roots, []);
  }

  const entries = cart.flatMap((c) => {
    const pkg = pkgMap.get(c.id);
    return pkg ? [{ pkg, off: c.off }] : [];
  });
  const addToCart = (id: string, off: string[]) =>
    setCart((prev) => [...prev.filter((x) => x.id !== id), { id, off }]);

  const backBtn = cur ? (
    <button
      type="button"
      className="hr-px-back"
      aria-label={X.backAria}
      onClick={() => go(cur.parentId)}
    >{X.back}</button>
  ) : null;
  const question = (cur ? cur.question : rootQuestion) || X.qEmpty;

  return (
    <>
      {cur && (
        <div className="hr-px-head">
          {backBtn}
          {path.length > 0 && (
            <nav className="hr-px-crumb hr-px-path" aria-label={X.root}>
              <button type="button" onClick={() => go(null)}>{X.root}</button>
              {path.map((f) => (
                <span key={f.id} className="hr-px-crumb-i">
                  <span className="hr-px-sep" aria-hidden="true">›</span>
                  <button type="button" onClick={() => go(f.id)}>{f.name}</button>
                </span>
              ))}
            </nav>
          )}
        </div>
      )}

      <h2 className="hr-px-title">{question}</h2>

      {cur?.desc && <p className="hr-px-fdesc">{cur.desc}</p>}

      <Cards
        children={children}
        pkgMap={pkgMap}
        onFolder={(id) => go(id)}
        onPackage={(id) => go(curId, id)}
      />

      {cur && <div className="hr-px-foot">{backBtn}</div>}

      {openPkg && (
        <Modal
          key={openPkg.id}
          p={openPkg}
          onClose={() => go(curId)}
          initialOff={cartSeed?.id === openPkg.id ? cartSeed.off : undefined}
          onAddToCart={(off) => addToCart(openPkg.id, off)}
          discordUrl={discordUrl}
        />
      )}

      <CartPanel
        entries={entries}
        onOpen={(id, off) => go(curId, id, { id, off })}
        onRemove={(id) => setCart((prev) => prev.filter((x) => x.id !== id))}
        onClear={() => setCart([])}
      />
    </>
  );
}

function CartPanel({ entries, onOpen, onRemove, onClear }: {
  entries: { pkg: PackageView; off: string[] }[];
  onOpen: (id: string, off: string[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const lang = useLocale();
  const L = dict(lang).pricing;
  const X = dict(lang).pex;
  const P = dict(lang).pkg;
  const won = (n: number) => n.toLocaleString(L.numLocale);
  const [folded, setFolded] = useState(false);
  const [copied, setCopied] = useState(false);

  const money = useMemo(
    () => entries.map((e) => ({ ...e, m: pkgMoney(e.pkg, e.off) })),
    [entries],
  );
  // 규칙 3과 동일: 영어 화면에서 USD가 하나라도 비면 전체를 KRW로 표시
  const useUsd = lang === 'en' && money.length > 0 && money.every((e) => e.m.usd != null);
  const cur = useUsd ? L.curUsd : L.cur;
  const side = (e: (typeof money)[number]) => (useUsd ? e.m.usd! : e.m.krw);
  const grand = money.reduce((s, e) => s + side(e).amount, 0);
  // '별도 협의' 판정은 모달과 같은 기준(KRW unit 없음)으로 합니다.
  const hasAsk = money.some((e) => e.m.krw.ask);

  const buildCopy = () => {
    const out: string[] = [];
    for (const e of money) {
      const r = pkgCopyLines(e.pkg, e.off, { useUsd, cur, won, sub: X.sub, lineAsk: P.askLater, offTag: X.offTag });
      out.push(...r.lines);
    }
    out.push(`${X.total}: ${won(grand)}${cur}~ ${L.vat}`);
    if (hasAsk) out.push(X.askLater);
    return out.join('\n');
  };

  const copy = async () => {
    const text = buildCopy();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(X.copyFail, text);
    }
  };

  const totalText = `${entries.length} · ${won(grand)}${cur}~`;

  if (entries.length === 0) {
    return (
      <aside className="hr-cart" aria-label={X.cartAria}>
        <div className="hr-cart-panel">
          <div className="hr-cart-head"><b>{X.cart}</b></div>
          <p className="hr-cart-note">{X.cartNote}</p>
          <p className="hr-cart-empty">{X.cartEmpty}</p>
        </div>
      </aside>
    );
  }

  if (folded) {
    return (
      <aside className="hr-cart" aria-label={X.cartAria}>
        <button type="button" className="hr-cart-bar" onClick={() => setFolded(false)} aria-label={X.unfold}>
          <b>{X.cart}</b>
          <span className="hr-cart-bar-num">{totalText}</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="hr-cart" aria-label={X.cartAria}>
      <div className="hr-cart-panel">
        <div className="hr-cart-head">
          <b>{X.cart}</b>
          <button type="button" className="hr-cart-fold" onClick={() => setFolded(true)} aria-label={X.fold}>–</button>
        </div>
        <p className="hr-cart-note">{X.cartNote}</p>
        <ul className="hr-cart-list">
          {money.map((e) => {
            const m = side(e);
            return (
              <li key={e.pkg.id}>
                <button type="button" className="hr-cart-row" onClick={() => onOpen(e.pkg.id, e.off)}>
                  <b>{e.pkg.name}</b>
                  <small>
                    {e.off.length > 0 ? fill(X.offN, { n: e.off.length }) : X.sub}
                    {' · '}{won(m.amount)}{cur}
                  </small>
                </button>
                <button
                  type="button"
                  className="hr-cart-x"
                  aria-label={`${X.remove} ${e.pkg.name}`}
                  onClick={() => onRemove(e.pkg.id)}
                >×</button>
              </li>
            );
          })}
        </ul>
        <div className="hr-cart-sum">
          <span>{X.total}</span>
          <b>{won(grand)}{cur}~</b>
        </div>
        {hasAsk && <p className="hr-cart-ask">{X.askLater}</p>}
        <div className="hr-cart-btns">
          <button type="button" onClick={copy}>{copied ? X.copied : X.copy}</button>
          <button type="button" onClick={onClear}>{X.clear}</button>
        </div>
      </div>
    </aside>
  );
}

export function PriceExplorer({ roots, packages, rootQuestion = '', discordUrl }: {
  roots: PublicNode[]; packages: PackageView[]; rootQuestion?: string; discordUrl?: string;
}) {
  const pkgMap = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);
  return (
    <Suspense
      fallback={
        <Cards children={roots} pkgMap={pkgMap} />
      }
    >
      <ExplorerInner roots={roots} pkgMap={pkgMap} rootQuestion={rootQuestion} discordUrl={discordUrl} />
    </Suspense>
  );
}
