// src/components/admin/AdminNav.tsx — 좌측 메뉴. 지금 보는 메뉴를 강조하고, 모바일에서는 접힙니다.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type NavSection = { id: string; title: string; items: { href: string; label: string }[] };

const HOME = { href: '/hr-admin', label: '대시보드' };

export function AdminNav({ sections }: { sections: NavSection[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const all = [HOME, ...sections.flatMap((s) => s.items)];
  const current = all
    .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const link = (i: { href: string; label: string }) => (
    <Link
      key={i.href}
      href={i.href}
      className={i.href === current?.href ? 'hr-sb-link on' : 'hr-sb-link'}
      aria-current={i.href === current?.href ? 'page' : undefined}
      onClick={() => setOpen(false)}
    >
      {i.label}
    </Link>
  );

  return (
    <nav className="hr-sb" aria-label="관리자 메뉴" data-open={open}>
      <button
        type="button"
        className="hr-sb-toggle"
        aria-expanded={open}
        aria-controls="hr-sb-list"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.label ?? '메뉴'}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div id="hr-sb-list" className="hr-sb-list">
        {link(HOME)}
        {sections.map((s) => (
          <div key={s.id} className="hr-sb-sec">
            <p className="hr-sb-h">{s.title}</p>
            {s.items.map(link)}
          </div>
        ))}
      </div>
    </nav>
  );
}
