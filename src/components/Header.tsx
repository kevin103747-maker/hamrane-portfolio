// src/components/Header.tsx
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icons';
import { useSite } from './SiteProvider';
import { LOCALES, DEFAULT_LOCALE, localePath, stripLocale } from '@/lib/i18n';

const MENU = [
  ['/', 'Home', '홈'],
  ['/portfolio', 'Portfolio', '포트폴리오'],
  ['/pricing', 'Pricing', '외주단가'],
  ['/guide', 'Guide', '의뢰 가이드'],
  ['#contact', 'Contact', '문의'],
] as const;

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
  const item = (h: string, n: string, k: string) => {
    const label = (
      <span className="ml" aria-hidden="true">
        <span className="ml-en">{n}</span>
        <span className="ml-ko">{k}</span>
      </span>
    );
    return h.startsWith('/')
      ? <Link key={h} href={h} aria-label={k} className={on(h) ? 'on' : ''} onClick={() => setOpen(false)}>{label}</Link>
      : <a key={h} href={h} aria-label={k} onClick={() => setOpen(false)}>{label}</a>;
  };
  return (
    <header className="gnb">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="HamRanè 홈">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lg lg-dark" src="/logo-on-dark.png" alt="" width={480} height={96} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lg lg-light" src="/logo-on-light.png" alt="" width={480} height={96} />
        </Link>
        <nav className="menu">{MENU.map(([h, n, k]) => item(h, n, k))}</nav>
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
        {MENU.map(([h, n, k]) => item(h, n, k))}
        <a className="mcrew" href={links.crewUrl} target="_blank" rel="noopener noreferrer">Team VIRTUALITY Sounds ↗</a>
      </nav>
    </header>
  );
}
