// src/components/GroupMixer.tsx — 가격표 분야 아래의 "트랙 분리 듣기" (원곡 영상 + 분리 트랙)
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { MixItem } from '@/lib/pricing-mixer';
import { useLocale } from './LocaleLink';
import { dict, fill } from '@/lib/dict';

// 믹서 코드는 곡을 열었을 때만 내려받습니다.
const TrackMixer = dynamic(() => import('./TrackMixer').then((m) => m.TrackMixer), { ssr: false });

export function GroupMixer({ groupName, mode, items }: { groupName: string; mode: 'mix' | 'ab'; items: MixItem[] }) {
  const G = dict(useLocale()).gmix;
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<'orig' | 'mix'>('mix');
  if (!items.length) return null;
  const ab = mode === 'ab';
  const label = ab ? G.abLabel : G.mixLabel;

  return (
    <div className="hr-gm">
      <div className="hr-gm-head">
        <b>{fill(G.head, { name: groupName, label })}</b>
        <p>{ab ? G.abDesc : G.mixDesc}</p>
      </div>
      <div className="hr-gm-list">
        {items.map((w) => {
          const open = openId === w.id;
          return (
            <div key={w.id} className="hr-gm-item">
              <div className="hr-gm-bar">
                <div>
                  <b>{w.title}</b>
                  {w.sub && <small>{w.sub}</small>}
                </div>
                <button
                  type="button"
                  className="hr-mx-btn"
                  aria-expanded={open}
                  onClick={() => { setOpenId(open ? null : w.id); setView('mix'); }}
                >
                  {open ? G.close : G.open}
                </button>
              </div>
              {open && (
                <div className="hr-gm-body">
                  {w.youtubeId && (
                    <div className="hr-gm-tabs">
                      <button type="button" className="hr-mx-btn" aria-pressed={view === 'mix'} onClick={() => setView('mix')}>{label}</button>
                      <button type="button" className="hr-mx-btn" aria-pressed={view === 'orig'} onClick={() => setView('orig')}>{G.orig}</button>
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
                    <TrackMixer key={w.id} tracks={w.tracks} mode={mode} />
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
