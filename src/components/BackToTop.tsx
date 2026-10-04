// src/components/BackToTop.tsx — 아래로 내려갔을 때만 나타나는 맨 위로 버튼
'use client';
import { useEffect, useState } from 'react';

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => setShow(window.scrollY > 600);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  const up = () => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  };

  return (
    <button type="button" className={`hr-top${show ? ' show' : ''}`} onClick={up} aria-label="맨 위로" tabIndex={show ? 0 : -1}>
      ↑
    </button>
  );
}
