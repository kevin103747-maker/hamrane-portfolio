// src/components/Tracker.tsx — 공개 페이지 방문 기록 (화면에는 아무것도 그리지 않습니다)
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

  return null;
}
