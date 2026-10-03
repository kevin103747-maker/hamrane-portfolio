// src/components/Thumb.tsx
'use client';
import { useState, type ReactNode } from 'react';
import type { Work } from '@/lib/types';

/** 우선순위: 커스텀 썸네일 → maxresdefault → hqdefault → 줄무늬 자리표시자 */
export function Thumb({ work, className = '', label = '16:9', children }: { work: Work; className?: string; label?: string; children?: ReactNode }) {
  const [fb, setFb] = useState(false);
  const src = work.thumbUrl || (work.youtubeId ? `https://i.ytimg.com/vi/${work.youtubeId}/${fb ? 'hqdefault' : 'maxresdefault'}.jpg` : '');
  return (
    <div className={`ph ${className}`}>
      {src ? <img src={src} alt="" loading="lazy" onError={() => setFb(true)}
        onLoad={(e) => { if (!fb && !work.thumbUrl && e.currentTarget.naturalWidth <= 120) setFb(true); }} /> : label}
      {children}
    </div>
  );
}
