// src/components/Tracker.tsx — 공개 페이지 방문·클릭 기록 (화면에는 아무것도 그리지 않습니다)
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track';

export function Tracker() {
  const path = usePathname();

  useEffect(() => {
    try {
      // 같은 페이지를 30분 안에 새로고침하면 다시 세지 않습니다.
      const k = 'hr-last';
      const prev = JSON.parse(sessionStorage.getItem(k) ?? 'null') as { p: string; t: number } | null;
      const now = Date.now();
      if (prev && prev.p === path && now - prev.t < 30 * 60 * 1000) return;
      sessionStorage.setItem(k, JSON.stringify({ p: path, t: now }));
    } catch {
      /* 저장소를 못 쓰면 그냥 기록합니다. */
    }
    track('view', path);
  }, [path]);

  // 문의 바로가기·채널 아이콘 클릭을 한 곳에서 셉니다.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const ch = a.dataset.ch;
      if (ch) {
        track('click', `ch:${ch}`);
        return;
      }
      const href = a.getAttribute('href') ?? '';
      if (href === '#contact' || href.endsWith('#contact')) {
        track('click', 'contact:go');
      } else if (a.closest('#contact') && /^https?:/i.test(href)) {
        track('click', 'contact:link');
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
