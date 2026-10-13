// src/components/drop/DropTracker.tsx — 무료 배포 페이지의 조회·받기·사이트 이동 기록 (화면에는 아무것도 그리지 않습니다)
'use client';
import { useEffect } from 'react';
import { track } from '@/lib/track';

export function DropTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      // 같은 배포를 30분 안에 새로고침하면 다시 세지 않습니다.
      const k = `hr-dl-${slug}`;
      const prev = Number(sessionStorage.getItem(k) ?? 0);
      const now = Date.now();
      if (prev && now - prev < 30 * 60 * 1000) return;
      sessionStorage.setItem(k, String(now));
    } catch {
      /* 저장소를 못 쓰면 그냥 기록합니다. */
    }
    track('click', `dl:view-${slug}`);
  }, [slug]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const act = a.dataset.dl;
      if (act === 'mp3' || act === 'wav') {
        track('click', `dl:${act}-${slug}`);
        return;
      }
      // 사이트 안 링크(로고, 홈페이지 가기, 포트폴리오 등)는 모두 "사이트 이동"으로 셉니다.
      if ((a.getAttribute('href') ?? '').startsWith('/')) track('click', `dl:home-${slug}`);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [slug]);

  return null;
}
