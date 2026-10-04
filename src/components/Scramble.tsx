// src/components/Scramble.tsx — 숫자가 무작위로 섞이다가 왼쪽부터 하나씩 고정되는 효과
'use client';
import { useEffect, useState } from 'react';

const FRAME_MS = 60; // 숫자가 바뀌는 간격(ms). 작을수록 빠르게 번쩍입니다.

export function Scramble({ text, delay = 0, duration = 1300 }: { text: string; delay?: number; duration?: number }) {
  const [view, setView] = useState(text);
  const [st, setSt] = useState<'idle' | 'run' | 'done'>('idle');

  useEffect(() => {
    // "동작 줄이기"를 켠 사용자에게는 효과 없이 바로 최종 값을 보여줍니다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setView(text);
      setSt('done');
      return;
    }

    const chars = Array.from(text);
    const digitPos = chars.map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
    if (!digitPos.length) {
      setSt('done');
      return;
    }

    // 숫자 자리마다 고정되는 시각. 왼쪽 자리부터 차례로 고정됩니다.
    const lockAt = new Map(
      digitPos.map((pos, k) => [pos, delay + duration * (0.3 + 0.7 * ((k + 1) / digitPos.length))]),
    );
    const frame = (t: number) =>
      chars.map((c, i) => {
        const lock = lockAt.get(i);
        return lock === undefined || t >= lock ? c : String(Math.floor(Math.random() * 10));
      }).join('');

    // 보이기 시작하기 전에 섞인 숫자를 먼저 넣어서, 최종 숫자가 잠깐 비치지 않게 합니다.
    setView(frame(0));
    setSt('run');

    const start = performance.now();
    let last = 0;
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      if (t >= delay + duration) {
        setView(text);
        setSt('done');
        return;
      }
      if (t - last >= FRAME_MS) {
        last = t;
        setView(frame(t));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, duration]);

  // 읽기 도구에는 실제 값만 전달하고, 섞이는 숫자는 숨깁니다.
  return (
    <span className="hr-scr" data-st={st}>
      <span className="hr-sr">{text}</span>
      <span aria-hidden="true">{view}</span>
    </span>
  );
}
