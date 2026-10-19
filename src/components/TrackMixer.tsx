// src/components/TrackMixer.tsx — 트랙 분리 듣기 (Web Audio). 파일은 Cloudflare Worker(mixer-files)에서 직접 받습니다.
'use client';
import { useEffect, useRef, useState } from 'react';
import type { Track } from '@/lib/tracks';

const BASE = (process.env.NEXT_PUBLIC_MIXER_BASE ?? '').replace(/\/+$/, '');
const MEM_LIMIT = 120 * 1024 * 1024; // 풀어 둔 소리 전체의 최대 크기(바이트). 넘으면 중단
const FETCH_MS = 30_000; // 트랙 하나를 받는 최대 시간

class MixErr extends Error {}

function audioCtor(): typeof AudioContext | undefined {
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export function TrackMixer({ tracks, onBack }: { tracks: Track[]; onBack: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(0);
  const [on, setOn] = useState<boolean[]>(() => tracks.map(() => true));
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const bufs = useRef<AudioBuffer[]>([]);
  const gains = useRef<GainNode[]>([]);
  const started = useRef(false);

  const fatal = !BASE
    ? '믹서 주소(NEXT_PUBLIC_MIXER_BASE)가 설정되지 않았어요.'
    : !audioCtor()
      ? '이 브라우저에서는 트랙 분리 듣기를 쓸 수 없어요.'
      : '';

  useEffect(() => {
    if (fatal) return;
    const Ctor = audioCtor();
    if (!Ctor) return;
    let dead = false;
    const ctx = new Ctor();
    ctxRef.current = ctx;

    (async () => {
      try {
        let bytes = 0;
        const out: AudioBuffer[] = [];
        for (const t of tracks) {
          const res = await fetch(`${BASE}/${encodeURIComponent(t.file)}`, { signal: AbortSignal.timeout(FETCH_MS) });
          if (!res.ok) throw new MixErr(`'${t.label}' 파일을 받지 못했어요 (${res.status}).`);
          const buf = await ctx.decodeAudioData(await res.arrayBuffer());
          bytes += buf.length * buf.numberOfChannels * 4;
          if (bytes > MEM_LIMIT) throw new MixErr('트랙 용량이 너무 커서 재생할 수 없어요.');
          if (dead) return;
          out.push(buf);
          setDone(out.length);
        }
        bufs.current = out;
        setPhase('ready');
      } catch (e) {
        if (dead) return;
        setMsg(e instanceof MixErr ? e.message : '트랙을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        setPhase('error');
      }
    })();

    return () => {
      dead = true;
      ctxRef.current = null;
      void ctx.close().catch(() => {});
    };
  }, [tracks, fatal]);

  function toggle() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (!started.current) {
      started.current = true;
      void ctx.resume(); // 버튼을 누른 순간에 시작해야 iPhone에서도 소리가 납니다
      const loopEnd = Math.min(...bufs.current.map((b) => b.duration)); // 길이가 조금씩 달라도 같이 반복
      const t0 = ctx.currentTime + 0.1;
      gains.current = bufs.current.map((b, i) => {
        const g = ctx.createGain();
        g.gain.value = on[i] ? 1 : 0;
        g.connect(ctx.destination);
        const src = ctx.createBufferSource();
        src.buffer = b;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = loopEnd;
        src.connect(g);
        src.start(t0);
        return g;
      });
      setPlaying(true);
      return;
    }
    if (ctx.state === 'running') {
      void ctx.suspend();
      setPlaying(false);
    } else {
      void ctx.resume();
      setPlaying(true);
    }
  }

  function flip(i: number) {
    const v = !on[i];
    setOn((p) => p.map((x, k) => (k === i ? v : x)));
    if (gains.current[i]) gains.current[i].gain.value = v ? 1 : 0;
  }

  function allOn() {
    setOn(tracks.map(() => true));
    gains.current.forEach((g) => { g.gain.value = 1; });
  }

  const error = fatal || (phase === 'error' ? msg : '');

  return (
    <div className="hr-mx">
      <div className="hr-mx-top">
        <b>트랙 분리 듣기</b>
        <button type="button" className="hr-mx-btn" onClick={onBack}>영상으로 돌아가기</button>
      </div>
      {error ? (
        <p className="hr-mx-err">{error}</p>
      ) : phase === 'loading' ? (
        <p className="hr-mx-note">{`트랙을 불러오는 중… ${done}/${tracks.length}`}</p>
      ) : (
        <>
          <div className="hr-mx-list">
            {tracks.map((t, i) => (
              <button key={t.file} type="button" className="hr-mx-trk" aria-pressed={on[i]} onClick={() => flip(i)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="hr-mx-top">
            <button type="button" className="hr-mx-btn hr-mx-play" onClick={toggle}>{playing ? '일시정지' : '재생'}</button>
            <button type="button" className="hr-mx-btn" onClick={allOn}>전체 켜기</button>
          </div>
        </>
      )}
      <p className="hr-mx-note">트랙 이름을 눌러 켜고 끄세요. 소리가 안 나면 휴대폰 무음 모드를 확인해 보세요.</p>
    </div>
  );
}
