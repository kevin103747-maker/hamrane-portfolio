// src/components/GroupWorks.tsx — 가격표 분야 아래의 "이 분야 작업물"
'use client';
import Link from './LocaleLink';
import { matches } from '@/lib/filters';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';

const MAX_AUTO = 4; // 직접 고른 곡이 없을 때 최신순으로 보여줄 개수

export function GroupWorks({ groupId, groupName, pick }: { groupId: string; groupName: string; pick?: string[] }) {
  const s = useSite();
  const chosen = new Set(pick ?? []);
  // 어드민 "단가표 예시 작업물"에서 고른 곡(공개 중인 곡만). 하나도 없으면 이 분야의 최신 곡을 보여줍니다.
  const picked = s.works.filter((w) => chosen.has(w.id));
  const list = picked.length
    ? picked
    : s.works
        .filter((w) => matches(w, s, { q: '', groupId, partId: null, usage: [], aType: [] }))
        .slice(0, MAX_AUTO);
  if (!list.length) return null;
  return (
    <div className="hr-gw">
      <div className="hr-gw-head">
        <b>{groupName} 작업물</b>
        <Link href={`/portfolio?group=${groupId}`}>포트폴리오에서 더 보기 →</Link>
      </div>
      <div className="grid">
        {list.map((w) => <WorkCard key={w.id} work={w} parts={false} />)}
      </div>
    </div>
  );
}
