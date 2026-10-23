// src/components/Header.tsx
'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link, { useLocale } from './LocaleLink';
import { Icon } from './Icons';
import { useSite } from './SiteProvider';
import { LOCALES, DEFAULT_LOCALE, EN_LIVE, localePath, stripLocale } from '@/lib/i18n';
import { dict } from '@/lib/dict';

const MENU = [
  ['/', 'Home', '홈'],
  ['/portfolio', 'Portfolio', '포트폴리오'],
  ['/pricing', 'Pricing', '외주단가'],
  ['/guide', 'Guide', '의뢰 가이드'],
  ['#contact', 'Contact', '문의'],
] as const;

export function Header() {
  const { links } = useSite();
  const lang = useLocale();
  const c = dict(lang).common;
  const path = stripLocale(usePathname());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // 영어 사이트가 공개되기 전에는 한국어 쪽에서 언어 선택을 숨깁니다. (영어 쪽에서는 돌아갈 수 있게 항상 보입니다.)
  const showLang = LOCALES.length > 1 && (EN_LIVE || lang !== DEFAULT_LOCALE);
  const on = (h: string) => (h === '/' ? path === '/' : h.startsWith('/') && path.startsWith(h));
  const toggleTheme = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('hamrane-theme', next);
  };
  const item = (h: string, n: string, k0: string) => {
    const k = lang === DEFAULT_LOCALE ? k0 : n; // 영어에서는 한국어 이름을 보이지 않게 영어를 두 번 씁니다.
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
        <Link className="logo" href="/" aria-label={c.homeLabel}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lg lg-dark" src="/logo-on-dark.png" alt="" width={480} height={96} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lg lg-light" src="/logo-on-light.png" alt="" width={480} height={96} />
        </Link>
        <nav className="menu">{MENU.map(([h, n, k]) => item(h, n, k))}</nav>
        <div className="right">
          <a className="crew" href={links.crewUrl} target="_blank" rel="noopener noreferrer">Team VIRTUALITY Sounds <Icon name="arrow" className="" /></a>
          <span className="vsep" />
          <a className="cta" href="#contact">{c.askMe}</a>
          {/* 휴대폰(560px 이하) 전용 문의 버튼. 위의 .cta는 이 폭에서 숨겨지므로 따로 둡니다. */}
          <a className="cta-m" href="#contact">{c.askMe}</a>
          {showLang && (
            <label className="lang-wrap" title="Language / 언어">
              <svg className="lang-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z" />
              </svg>
              <select className="lang" aria-label={c.language} value={lang} onChange={(e) => router.push(localePath(e.target.value, path))}>
                {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
          )}
          <button className="theme-switch" onClick={toggleTheme} aria-label={c.theme}><Icon name="sun" className="sun" /><Icon name="moon" className="moon" /></button>
          <button className="burger" aria-label={c.menu} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="menu" /></button>
        </div>
      </div>
      <nav className={`mpanel${open ? ' open' : ''}`}>
        {MENU.map(([h, n, k]) => item(h, n, k))}
        <a className="mcrew" href={links.crewUrl} target="_blank" rel="noopener noreferrer">Team VIRTUALITY Sounds ↗</a>
      </nav>
    </header>
  );
}
