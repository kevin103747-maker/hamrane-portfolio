// src/components/admin/AdminNav.tsx — 상단 메뉴. 지금 보고 있는 메뉴를 강조합니다.
'use client';
import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavItem = { href: string; label: string; group: number };

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const current = items
    .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="관리자 메뉴">
      {items.map((i, n) => (
        <Fragment key={i.href}>
          {n > 0 && items[n - 1].group !== i.group && <i className="hr-nav-sep" aria-hidden="true" />}
          <Link
            href={i.href}
            className={i.href === current ? 'on' : undefined}
            aria-current={i.href === current ? 'page' : undefined}
          >
            {i.label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}
