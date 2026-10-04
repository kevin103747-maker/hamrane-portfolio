// src/components/PointerFx.tsx — 마우스에 반응하는 효과(커서 빛, 카드 기울기, 자석 버튼)
'use client';
import { useEffect } from 'react';

const TILT = 5; // 카드 최대 기울기(도)
const MAG = 6;  // 자석 버튼 최대 이동(px)
const CARD_VARS = ['--rx', '--ry', '--gx', '--gy'];
const MAG_VARS = ['--tx', '--ty'];

const clear = (el: HTMLElement | null, vars: string[]) => {
  if (el) vars.forEach((v) => el.style.removeProperty(v));
};

export function PointerFx() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;

    const root = document.documentElement;
    let raf = 0;
    let last: PointerEvent | null = null;
    let card: HTMLElement | null = null;
    let mag: HTMLElement | null = null;

    const frame = () => {
      raf = 0;
      const e = last;
      if (!e) return;

      // 1) 배경 빛 위치
      root.style.setProperty('--cx', `${e.clientX}px`);
      root.style.setProperty('--cy', `${e.clientY}px`);

      const t = e.target instanceof Element ? e.target : null;

      // 2) 카드 기울기 + 하이라이트 위치
      const c = (t?.closest('.card') as HTMLElement | null) ?? null;
      if (c !== card) { clear(card, CARD_VARS); card = c; }
      if (c) {
        const r = c.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', `${(px - 0.5) * TILT * 2}deg`);
        c.style.setProperty('--rx', `${(0.5 - py) * TILT * 2}deg`);
        c.style.setProperty('--gx', `${px * 100}%`);
        c.style.setProperty('--gy', `${py * 100}%`);
      }

      // 3) 자석 버튼
      const m = (t?.closest('.cta, .ask') as HTMLElement | null) ?? null;
      if (m !== mag) { clear(mag, MAG_VARS); mag = m; }
      if (m) {
        const r = m.getBoundingClientRect();
        const lim = (v: number) => Math.max(-MAG, Math.min(MAG, v * 0.25));
        m.style.setProperty('--tx', `${lim(e.clientX - (r.left + r.width / 2))}px`);
        m.style.setProperty('--ty', `${lim(e.clientY - (r.top + r.height / 2))}px`);
      }
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(frame); // 프레임당 한 번만 계산
    };
    const onLeave = () => { clear(card, CARD_VARS); clear(mag, MAG_VARS); card = null; mag = null; };

    window.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      onLeave();
    };
  }, []);

  return null;
}
