// src/components/Ago.tsx — "2026.09.14 (3주 전)"처럼 날짜 옆에 상대 시간을 붙입니다.
// 계산을 방문자의 브라우저에서 하므로, 사이트를 다시 게시하지 않아도 날마다 정확해집니다.
'use client';
import { useEffect, useState } from 'react';
import { Scramble } from './Scramble';

function ago(date: string): string | null {
  const m = date.match(/^(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = m[3] ? +m[3] : 0;
  const now = new Date();

  if (d) {
    const then = new Date(y, mo - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((today.getTime() - then.getTime()) / 86_400_000);
    if (days < 0) return null; // 미래 날짜는 붙이지 않습니다
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 31) return `${days}일 전`;
  }

  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  if (months < 0) return null;
  if (months === 0) return '이번 달';
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
}

export function Ago({ date, delay = 0 }: { date: string; delay?: number }) {
  // 서버가 보낸 화면과 어긋나지 않도록, 처음에는 날짜만 그리고 마운트 후에 상대 시간을 붙입니다.
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(ago(date));
  }, [date]);
  return (
    <>
      <Scramble text={date} delay={delay} />
      {text && <span className="hr-ago"> ({text})</span>}
    </>
  );
}
