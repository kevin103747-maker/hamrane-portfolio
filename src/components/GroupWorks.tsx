// src/components/GroupWorks.tsx — 가격표 분야 아래의 "이 분야 작업물" 줄
'use client';
import Link from 'next/link';
import { matches } from '@/lib/filters';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';

const MAX = 4; // 한 분야에서 보여줄 최대 곡 수

export function GroupWorks({ groupId, groupName }: { groupId: string; groupName: string }) {
  const s = useSite();
  const all = s.works.filter((w) =>
    matches(w, s, { q: '', groupId, partId: null, usage: [], aType: [] }),
  );
  if (!all.length) return null;
  // 이 분야 대표작으로 지정한 곡을 먼저, 나머지는 최신순(s.works는 이미 최신순입니다)
  const feat = all.filter((w) => w.feat?.groups?.includes(groupId));
  const rest = all.filter((w) => !w.feat?.groups?.includes(groupId));
  const list = [...feat, ...rest].slice(0, MAX);
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
