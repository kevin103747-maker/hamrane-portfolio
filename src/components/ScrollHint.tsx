// src/components/ScrollHint.tsx
'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icons';

/** 페이지 맨 위에서만 보이는 "아래로 스크롤" 안내. 조금 내려가면 사라집니다. */
export function ScrollHint({ targetId }: { targetId: string }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const check = () => setShow(window.scrollY < 80);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  return (
    <>
      <div className={`hr-scroll-fade ${show ? '' : 'hide'}`} aria-hidden="true" />
      <button
        type="button"
        className={`hr-scroll ${show ? '' : 'hide'}`}
        aria-label="아래로 스크롤"
        tabIndex={show ? 0 : -1}
        onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
      >
        SCROLL
        <span className="hr-scroll-ic"><Icon name="down" /></span>
      </button>
    </>
  );
}
