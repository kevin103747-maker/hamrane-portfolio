// src/components/ScrollHint.tsx
'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from './Icons';

/** 페이지 맨 위에서만 보이는 "아래로 스크롤" 안내. 조금 내려가거나, 내릴 내용이 없으면 사라집니다. */
export function ScrollHint({ targetId }: { targetId?: string }) {
  const [show, setShow] = useState(false);
  const path = usePathname();

  useEffect(() => {
    const check = () => {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 160;
      setShow(scrollable && window.scrollY < 80);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const ro = new ResizeObserver(check); // 내용이 늦게 채워지는 페이지도 다시 계산
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      ro.disconnect();
    };
  }, [path]);

  const go = () => {
    const el = (targetId && document.getElementById(targetId)) || document.querySelector('[data-scroll-next]');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    else window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <>
      <div className={`hr-scroll-fade ${show ? '' : 'hide'}`} aria-hidden="true" />
      <button
        type="button"
        className={`hr-scroll ${show ? '' : 'hide'}`}
        aria-label="아래로 스크롤"
        tabIndex={show ? 0 : -1}
        onClick={go}
      >
        SCROLL
        <span className="hr-scroll-ic"><Icon name="down" /></span>
      </button>
    </>
  );
}
