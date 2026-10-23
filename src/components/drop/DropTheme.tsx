// src/components/drop/DropTheme.tsx — 다운로드 페이지용 테마 전환 버튼(Header.tsx와 같은 동작)
'use client';
import { Icon } from '../Icons';

export function DropTheme({ label = '테마 전환' }: { label?: string }) {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('hamrane-theme', next);
  };
  return (
    <button className="theme-switch" onClick={toggle} aria-label={label}>
      <Icon name="sun" className="sun" /><Icon name="moon" className="moon" />
    </button>
  );
}
