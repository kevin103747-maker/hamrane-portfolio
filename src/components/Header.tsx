// src/components/Header.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icons';
import { useSite } from './SiteProvider';
import { LOCALES, DEFAULT_LOCALE, localePath, stripLocale } from '@/lib/i18n';

const MENU = [['/', 'Home'], ['/portfolio', 'Portfolio'], ['/pricing', 'Pricing'], ['#contact', 'Contact']] as const;

export function Header() {
  const { links } = useSite();
  const path = stripLocale(usePathname());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const on = (h: string) => (h === '/' ? path === '/' : h.startsWith('/') && path.startsWith(h));
  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('hamrane-theme', next);
  };
  const item = (h: string, n: string) => h.startsWith('/')
    ? <Link key={h} href={h} className={on(h) ? 'on' : ''} onClick={() => setOpen(false)}>{n}</Link>
    : <a key={h} href={h} onClick={() => setOpen(false)}>{n}</a>;
  return (
    <header className="gnb">
      <div className="wrap">
        <Link className="logo" href="/"><i />HamRanè</Link>
        <nav className="menu">{MENU.map(([h, n]) => item(h, n))}</nav>
        <div className="right">
          <a className="crew" href={links.crewUrl} target="_blank" rel="noopener noreferrer">Team VIRTUALITY Sounds <Icon name="arrow" className="" /></a>
          <span className="vsep" />
          <a className="cta" href="#contact">문의하기</a>
          {LOCALES.length > 1 && (
  <select className="lang" aria-label="언어" value={DEFAULT_LOCALE} onChange={(e) => router.push(localePath(e.target.value, path))}>
    {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
  </select>
)}
          <button className="theme-switch" onClick={toggleTheme} aria-label="테마 전환"><Icon name="sun" className="sun" /><Icon name="moon" className="moon" /></button>
          <button className="burger" aria-label="메뉴" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        </div>
      </div>
      <nav className={`mpanel${open ? ' open' : ''}`}>
        {MENU.map(([h, n]) => item(h, n))}
        <a className="mcrew" href={links.crewUrl} target="_blank" rel="noopener noreferrer">Team VIRTUALITY Sounds ↗</a>
      </nav>
    </header>
  );
}
