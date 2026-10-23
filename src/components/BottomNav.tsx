// src/components/BottomNav.tsx
'use client';
import { usePathname } from 'next/navigation';
import Link from './LocaleLink';
import { Icon } from './Icons';
import { stripLocale } from '@/lib/i18n';

const MENU = [
  ['/', 'Home', 'home'],
  ['/portfolio', 'Portfolio', 'folder'],
  ['/pricing', 'Pricing', 'tag'],
  ['#contact', 'Contact', 'message'],
] as const;

export function BottomNav() {
  const path = stripLocale(usePathname());
  const on = (h: string) => (h === '/' ? path === '/' : h.startsWith('/') && path.startsWith(h));

  return (
    <nav className="bottom-nav">
      {MENU.map(([href, label, icon]) => (
        <Link
          key={href}
          href={href}
          className={`bn-item ${on(href) ? 'on' : ''}`}
          aria-label={label}
        >
          <Icon name={icon} className="bn-icon" />
          <span className="bn-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
