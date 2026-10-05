// src/components/RecentMarquee.tsx
'use client';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';
import type { Work } from '@/lib/types';

const MIN_CARDS = 14;    // 한 묶음이 화면보다 항상 길도록 하는 최소 카드 수
const SEC_PER_CARD = 4;  // 카드 1장이 지나가는 시간(초). 숫자가 클수록 느려집니다.

function Group({ items, name, hidden }: { items: { w: Work; k: string }[]; name: string; hidden: boolean }) {
  // 복제 그룹은 보조기기(aria-hidden)와 Tab 이동(tabIndex -1)에서만 제외합니다.
  // inert는 클릭까지 막으므로 사용하지 않습니다.
  return (
    <div className="hr-mq-group" aria-hidden={hidden || undefined}>
      {items.map((x) => (
        <WorkCard key={`${name}-${x.k}`} work={x.w} parts={false} tabIndex={hidden ? -1 : undefined} />
      ))}
    </div>
  );
}

export function RecentMarquee() {
  const rec = useSite().works.slice(0, 8);
  if (!rec.length) return null;

  const repeat = Math.ceil(MIN_CARDS / rec.length);
  const set = Array.from({ length: repeat }, (_, r) => rec.map((w) => ({ w, k: `${r}-${w.id}` }))).flat();
  const dur = set.length * SEC_PER_CARD;

  return (
    <div className="hr-mq">
      <div className="hr-mq-track" style={{ animationDuration: `${dur}s` }}>
        <Group items={set} name="a" hidden={false} />
        <Group items={set} name="b" hidden />
      </div>
    </div>
  );
}
