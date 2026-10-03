// src/components/RecentMarquee.tsx
'use client';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';

const MIN_CARDS = 14;    // 한 묶음이 화면보다 항상 길도록 하는 최소 카드 수
const SEC_PER_CARD = 4;  // 카드 1장이 지나가는 시간(초). 숫자가 클수록 느려집니다.

export function RecentMarquee() {
  const rec = useSite().works.slice(0, 8);
  if (!rec.length) return null;

  const repeat = Math.ceil(MIN_CARDS / rec.length);
  const set = Array.from({ length: repeat }, (_, r) => rec.map((w) => ({ w, k: `${r}-${w.id}` }))).flat();
  const dur = set.length * SEC_PER_CARD;

  const group = (name: string, hidden: boolean) => (
    <div className="hr-mq-group" aria-hidden={hidden || undefined}>
      {set.map((x) => <WorkCard key={`${name}-${x.k}`} work={x.w} parts={false} />)}
    </div>
  );

  return (
    <div className="hr-mq">
      <div className="hr-mq-track" style={{ animationDuration: `${dur}s` }}>
        {group('a', false)}
        {group('b', true)}
      </div>
    </div>
  );
}
