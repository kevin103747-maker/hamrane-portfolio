// src/components/BottomNav.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icons';

const MENU = [
  ['/', 'Home', 'home'],
  ['/portfolio', 'Portfolio', 'folder'],
  ['/pricing', 'Pricing', 'tag'],
  ['#contact', 'Contact', 'message'],
] as const;

export function BottomNav() {
  const path = usePathname();
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
