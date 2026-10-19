// src/components/GroupMixer.tsx — 가격표 분야 아래의 "트랙 분리 듣기" (원곡 영상 + 분리 트랙)
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Work } from '@/lib/types';
import { useSite } from './SiteProvider';

// 믹서 코드는 곡을 열었을 때만 내려받습니다.
const TrackMixer = dynamic(() => import('./TrackMixer').then((m) => m.TrackMixer), { ssr: false });

export function GroupMixer({ groupName, mode, ids }: { groupName: string; mode: 'mix' | 'ab'; ids: string[] }) {
  const s = useSite();
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'orig' | 'mix'>('mix');
  const list = ids
    .map((id) => s.works.find((w) => w.id === id))
    .filter((w): w is Work => !!w && (w.tracks?.length ?? 0) > 1);
  if (!list.length) return null;
  const ab = mode === 'ab';
  const label = ab ? '비교해서 듣기' : '트랙 분리 듣기';

  return (
    <div className="hr-gm">
      <div className="hr-gm-head">
        <b>{groupName} {label}</b>
        <p>
          {ab
            ? '작업 전과 후를 번갈아 눌러 비교해 보세요. 재생 위치는 이어집니다.'
            : '트랙을 켜고 꺼 가며 한 파트씩 들어볼 수 있어요. 원곡 영상도 함께 볼 수 있어요.'}
        </p>
      </div>
      <div className="hr-gm-list">
        {list.map((w) => {
          const open = openId === w.id;
          return (
            <div key={w.id} className="hr-gm-item">
              <div className="hr-gm-bar">
                <div>
                  <b>{w.title}</b>
                  <small>{s.artistNames(w)}</small>
                </div>
                <button
                  type="button"
                  className="hr-mx-btn"
                  aria-expanded={open}
                  onClick={() => { setOpenId(open ? null : w.id); setView('mix'); }}
                >
                  {open ? '닫기' : '들어보기'}
                </button>
              </div>
              {open && (
                <div className="hr-gm-body">
                  {w.youtubeId && (
                    <div className="hr-gm-tabs">
                      <button type="button" className="hr-mx-btn" aria-pressed={view === 'mix'} onClick={() => setView('mix')}>{label}</button>
                      <button type="button" className="hr-mx-btn" aria-pressed={view === 'orig'} onClick={() => setView('orig')}>원곡 영상</button>
                    </div>
                  )}
                  {view === 'orig' && w.youtubeId ? (
                    <div className="hr-video">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${w.youtubeId}?autoplay=1&rel=0`}
                        title={w.title}
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <TrackMixer key={w.id} tracks={w.tracks ?? []} mode={mode} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
