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

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function TrackMixer({ tracks, mode = 'mix' }: { tracks: Track[]; mode?: 'mix' | 'ab' }) {
  const ab = mode === 'ab';
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(0);
  const [on, setOn] = useState<boolean[]>(() => tracks.map(() => true));
  const [solo, setSolo] = useState<boolean[]>(() => tracks.map(() => false));
  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);
  const [pos, setPos] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const bufs = useRef<AudioBuffer[]>([]);
  const gains = useRef<GainNode[]>([]);
  const srcs = useRef<AudioBufferSourceNode[]>([]);
  const started = useRef(false);
  const base = useRef(0); // 재생 위치 계산 기준: 위치 = (ctx.currentTime - base) % 길이
  const pending = useRef(0); // 재생 전에 재생바로 고른 위치
  const drag = useRef(false);
  const loopEnd = useRef(0);

  const anySolo = solo.some(Boolean);

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
        loopEnd.current = Math.min(...out.map((b) => b.duration)); // 길이가 조금씩 달라도 같이 반복
        setDur(loopEnd.current);
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

  // 켜짐/솔로/선택이 바뀔 때마다 트랙별 소리 크기를 맞춥니다.
  useEffect(() => {
    const any = solo.some(Boolean);
    gains.current.forEach((g, i) => {
      const audible = ab ? sel === i : any ? solo[i] : on[i];
      g.gain.value = audible ? 1 : 0;
    });
  }, [on, solo, sel, ab, playing]);

  // 재생 중에는 재생바를 갱신합니다.
  useEffect(() => {
    if (!playing || !dur) return;
    const id = window.setInterval(() => {
      const ctx = ctxRef.current;
      if (!ctx || drag.current) return;
      setPos((((ctx.currentTime - base.current) % dur) + dur) % dur);
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, dur]);

  /** 모든 트랙을 같은 시각, 같은 위치(offset초)에서 새로 시작합니다. */
  function begin(offset: number) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    srcs.current.forEach((s) => {
      try { s.stop(); } catch { /* 이미 멈춘 소스 */ }
      s.disconnect();
    });
    if (!gains.current.length) {
      gains.current = bufs.current.map(() => {
        const g = ctx.createGain();
        g.gain.value = 0; // 켜짐 상태는 위의 effect가 곧바로 맞춥니다
        g.connect(ctx.destination);
        return g;
      });
    }
    const off = Math.max(0, Math.min(offset, loopEnd.current - 0.1));
    const when = ctx.currentTime + 0.05;
    srcs.current = bufs.current.map((b, i) => {
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = loopEnd.current;
      src.connect(gains.current[i]);
      src.start(when, off);
      return src;
    });
    base.current = when - off;
    setPos(off);
  }

  function toggle() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (!started.current) {
      started.current = true;
      void ctx.resume(); // 버튼을 누른 순간에 시작해야 iPhone에서도 소리가 납니다
      begin(pending.current);
      setPlaying(true);
      return;
    }
    if (playing) {
      void ctx.suspend();
      setPlaying(false);
    } else {
      void ctx.resume();
      setPlaying(true);
    }
  }

  function commit(v: number) {
    if (!drag.current) return;
    drag.current = false;
    if (!started.current) {
      pending.current = v;
      setPos(v);
    } else {
      begin(v); // 일시정지 중이면 위치만 옮기고 멈춘 채로 둡니다
    }
  }

  const flip = (i: number) => setOn((p) => p.map((x, k) => (k === i ? !x : x)));
  const flipSolo = (i: number) => setSolo((p) => p.map((x, k) => (k === i ? !x : x)));
  const reset = () => {
    setOn(tracks.map(() => true));
    setSolo(tracks.map(() => false));
  };

  const error = fatal || (phase === 'error' ? msg : '');

  return (
    <div className="hr-mx">
      {error ? (
        <p className="hr-mx-err">{error}</p>
      ) : phase === 'loading' ? (
        <p className="hr-mx-note">{`트랙을 불러오는 중… ${done}/${tracks.length}`}</p>
      ) : (
        <>
          <div className="hr-mx-seekrow">
            <span>{clock(pos)}</span>
            <input
              type="range"
              className="hr-mx-seek"
              aria-label="재생 위치"
              min={0}
              max={dur}
              step={0.1}
              value={Math.min(pos, dur)}
              onChange={(e) => { drag.current = true; setPos(Number(e.target.value)); }}
              onPointerUp={(e) => commit(Number(e.currentTarget.value))}
              onPointerCancel={(e) => commit(Number(e.currentTarget.value))}
              onTouchEnd={(e) => commit(Number(e.currentTarget.value))}
              onKeyUp={(e) => commit(Number(e.currentTarget.value))}
              onBlur={(e) => commit(Number(e.currentTarget.value))}
            />
            <span>{clock(dur)}</span>
          </div>
          <div className="hr-mx-list">
            {ab
              ? tracks.map((t, i) => (
                  <button key={t.file} type="button" className="hr-mx-trk" aria-pressed={sel === i} onClick={() => setSel(i)}>
                    {t.label}
                  </button>
                ))
              : tracks.map((t, i) => (
                  <div key={t.file} className="hr-mx-row">
                    <button type="button" className="hr-mx-trk" aria-pressed={on[i]} data-dim={anySolo && !solo[i]} onClick={() => flip(i)}>
                      {t.label}
                    </button>
                    <button type="button" className="hr-mx-solo" aria-pressed={solo[i]} aria-label={`${t.label} 솔로`} onClick={() => flipSolo(i)}>
                      S
                    </button>
                  </div>
                ))}
          </div>
          <div className="hr-mx-top">
            <button type="button" className="hr-mx-btn hr-mx-play" onClick={toggle}>{playing ? '일시정지' : '재생'}</button>
            {!ab && <button type="button" className="hr-mx-btn" onClick={reset}>전체 켜기</button>}
          </div>
        </>
      )}
      <p className="hr-mx-note">
        {ab
          ? '트랙 이름을 누르면 그 소리로 바뀌고, 재생 위치는 그대로 이어져요. '
          : '트랙 이름은 켜고 끄기, S는 솔로예요. S를 켠 트랙만 들려요. '}
        소리가 안 나면 휴대폰 무음 모드를 확인해 보세요.
      </p>
    </div>
  );
}
