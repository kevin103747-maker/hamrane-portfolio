// src/components/PriceExplorer.tsx — 공개 단가 폴더 탐색 + PC 장바구니
'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Modal, pkgMoney, type PackageView } from './PackageList';
import type { PublicNode } from '@/lib/price-tree-data';
import { useLocale } from './LocaleLink';
import { dict, fill } from '@/lib/dict';
import { Icon } from './Icons';

type FolderNode = Extract<PublicNode, { kind: 'folder' }>;
type CartItem = { id: string; off: string[] };

const CART_KEY = 'hr-cart';

function Cards({ children, pkgMap, onFolder, onPackage }: {
  children: PublicNode[];
  pkgMap: Map<string, PackageView>;
  onFolder?: (id: string) => void;
  onPackage?: (id: string) => void;
}) {
  const P = dict(useLocale()).pkg;
  return (
    <div className="hr-pv-grid">
      {children.map((n) => {
        if (n.kind === 'folder') {
          return (
            <button key={`f-${n.id}`} type="button" className="hr-pv hr-px" onClick={() => onFolder?.(n.id)}>
              <span className="hr-px-ico"><Icon name="folder" /></span>
              <strong className="hr-pv-q">{n.name}</strong>
              {n.desc && <span className="hr-px-d">{n.desc}</span>}
              <span className="hr-pv-go">{dict(useLocale()).pex.open}<Icon name="arrow" /></span>
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
            <span className="hr-pv-go">{P.view}<Icon name="arrow" /></span>
          </button>
        );
      })}
    </div>
  );
}

function ExplorerInner({ roots, pkgMap }: {
  roots: PublicNode[]; pkgMap: Map<string, PackageView>;
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

  return (
    <>
      <nav className="hr-px-crumb" aria-label={X.root}>
        <button type="button" onClick={() => go(null)}>{X.root}</button>
        {path.map((f) => (
          <span key={f.id} className="hr-px-crumb-i">
            <span className="hr-px-sep" aria-hidden="true">›</span>
            <button type="button" onClick={() => go(f.id)}>{f.name}</button>
          </span>
        ))}
        {cur && (
          <button type="button" className="hr-px-up" onClick={() => go(cur.parentId)}>
            {X.up}
          </button>
        )}
      </nav>

      {cur?.desc && <p className="hr-px-fdesc">{cur.desc}</p>}

      <Cards
        children={children}
        pkgMap={pkgMap}
        onFolder={(id) => go(id)}
        onPackage={(id) => go(curId, id)}
      />

      {openPkg && (
        <Modal
          key={openPkg.id}
          p={openPkg}
          onClose={() => go(curId)}
          initialOff={cartSeed?.id === openPkg.id ? cartSeed.off : undefined}
          onAddToCart={(off) => addToCart(openPkg.id, off)}
        />
      )}

      {entries.length > 0 && (
        <CartPanel
          entries={entries}
          onOpen={(id, off) => go(curId, id, { id, off })}
          onRemove={(id) => setCart((prev) => prev.filter((x) => x.id !== id))}
          onClear={() => setCart([])}
        />
      )}
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
      const m = side(e);
      out.push(`[${e.pkg.name}] ${X.sub}: ${won(m.amount)}${cur}~`);
      for (const r of e.pkg.rows) {
        for (const l of r.lines) {
          const offLine = l.optKey != null && e.off.includes(l.optKey);
          if (offLine) {
            out.push(` - (${X.offTag}) ${l.name}`);
          } else {
            const get = useUsd ? l.unitUsd : l.unit;
            const amt = get == null ? P.askLater : `${won(get * l.qty)}${cur}`;
            out.push(` - ${l.name}${l.qty > 1 ? ` ×${l.qty}` : ''}  ${amt}`);
          }
        }
      }
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

export function PriceExplorer({ roots, packages }: { roots: PublicNode[]; packages: PackageView[] }) {
  const pkgMap = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);
  return (
    <Suspense
      fallback={
        <Cards children={roots} pkgMap={pkgMap} />
      }
    >
      <ExplorerInner roots={roots} pkgMap={pkgMap} />
    </Suspense>
  );
}
