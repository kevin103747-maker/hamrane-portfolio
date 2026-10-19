// src/components/GroupWorks.tsx — 가격표 분야 아래의 "이 분야 작업물" 줄
'use client';
import Link from 'next/link';
import { matches } from '@/lib/filters';
import { useSite } from './SiteProvider';
import { WorkCard } from './WorkCard';

const MAX_AUTO = 4; // 직접 고른 곡이 없을 때 최신순으로 보여줄 개수
const MAX_PICK = 8; // 직접 고른 곡을 보여줄 최대 개수

export function GroupWorks({ groupId, groupName }: { groupId: string; groupName: string }) {
  const s = useSite();
  const all = s.works.filter((w) =>
    matches(w, s, { q: '', groupId, partId: null, usage: [], aType: [] }),
  );
  if (!all.length) return null;
  // 어드민 "분야별 대표곡"에서 고른 곡이 있으면 그 곡만, 없으면 최신 곡을 보여줍니다.
  const picked = all.filter((w) => w.feat?.groups?.includes(groupId));
  const list = picked.length ? picked.slice(0, MAX_PICK) : all.slice(0, MAX_AUTO);
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
