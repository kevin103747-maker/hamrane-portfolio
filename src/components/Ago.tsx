// src/components/Ago.tsx — "2026.09.14 (3주 전)"처럼 날짜 옆에 상대 시간을 붙입니다.
// 계산을 방문자의 브라우저에서 하므로, 사이트를 다시 게시하지 않아도 날마다 정확해집니다.
'use client';
import { useEffect, useState } from 'react';
import { Scramble } from './Scramble';
import { useLocale } from './LocaleLink';
import { dict } from '@/lib/dict';

type AgoText = ReturnType<typeof dict>['ago'];
const fill = (t: string, n: number) => t.replace('{n}', String(n));

function ago(date: string, a: AgoText): string | null {
  const m = date.match(/^(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = m[3] ? +m[3] : 0;
  const now = new Date();

  if (d) {
    const then = new Date(y, mo - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((today.getTime() - then.getTime()) / 86_400_000);
    if (days < 0) return null; // 미래 날짜는 붙이지 않습니다
    if (days === 0) return a.today;
    if (days === 1) return a.yesterday;
    if (days < 31) return fill(a.days, days);
  }

  const months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - mo);
  if (months < 0) return null;
  if (months === 0) return a.thisMonth;
  if (months < 12) return fill(a.months, months);
  return fill(a.years, Math.floor(months / 12));
}

export function Ago({ date, delay = 0 }: { date: string; delay?: number }) {
  const lang = useLocale();
  // 서버가 보낸 화면과 어긋나지 않도록, 처음에는 날짜만 그리고 마운트 후에 상대 시간을 붙입니다.
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(ago(date, dict(lang).ago));
  }, [date, lang]);
  return (
    <>
      <Scramble text={date} delay={delay} />
      {text && <span className="hr-ago"> ({text})</span>}
    </>
  );
}
