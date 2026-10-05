// src/components/admin/QuoteMaker.tsx — 프로젝트 견적서: 입력 → 캔버스 미리보기 → PNG 저장/복사
'use client';
import { useEffect, useRef, useState } from 'react';

export type QuoteItem = { id: string; name: string; price: number | null; noun: string };
export type QuoteGroup = { name: string; items: QuoteItem[] };
export type PresetLine = { name: string; qty: number; unit: string; list: number | null; noun: string };
export type QuotePkg = { id: string; label: string; lines: PresetLine[] };

/** unit: 개당 금액(숫자 글자). '' = 협의, '0' = 무료 / list: 단가표 정가 / noun: 세는 말(트랙 등) */
type Line = PresetLine & { id: string; note: string };
type Song = { id: string; title: string; lines: Line[] };
type Adj = { id: string; label: string; amount: string };
type Theme = 'light' | 'dark';
type Mode = 'detail' | 'summary';
type Doc = {
  client: string; project: string; date: string; valid: string;
  songs: Song[]; adjs: Adj[]; notes: string; theme: Theme; mode: Mode;
};

const KEY = 'hr-quote-draft-v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const won = (n: number) => n.toLocaleString('ko-KR');
const toN = (s: string): number | null => {
  const d = s.replace(/[^\d]/g, '');
  return d === '' ? null : Number(d);
};
/** 부호가 있는 금액 ("-50000" → -50000) */
const adjN = (s: string) => {
  const n = toN(s);
  return n == null ? 0 : s.trim().startsWith('-') ? -n : n;
};
const lineTotal = (l: Line): number | null => {
  const u = toN(l.unit);
  return u == null ? null : u * l.qty;
};
const songTotal = (s: Song) => s.lines.reduce((t, l) => t + (lineTotal(l) ?? 0), 0);
const today = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const blankSong = (): Song => ({ id: uid(), title: '', lines: [] });
const blankDoc = (): Doc => ({
  client: '', project: '', date: '', valid: '발행일로부터 14일',
  songs: [blankSong()], adjs: [],
  notes: '• 금액은 VAT 포함입니다.\n• 곡의 난이도와 작업량에 따라 달라질 수 있으며, 확인 후 최종 금액을 안내드립니다.',
  theme: 'light', mode: 'detail',
});

/* ───────────── 이미지 그리기 ───────────── */
const W = 1080;
const PAD = 64;
const CARD_PAD = 36;

type Pal = { bg: string; card: string; ink: string; ink2: string; ink3: string; line: string; accent: string };
const PAL: Record<Theme, Pal> = {
  light: { bg: '#f3f5ef', card: '#ffffff', ink: '#18241e', ink2: '#4d5f55', ink3: '#6f8178', line: 'rgba(40,70,52,.14)', accent: '#3f8458' },
  dark: { bg: '#0f1715', card: '#1a2421', ink: '#eef3ef', ink2: '#a9b8b0', ink3: '#7d9187', line: 'rgba(190,230,205,.14)', accent: '#86efac' },
};

/** 줄 아래 작은 글씨: "20,000원 × 8트랙 · 메모" */
function subText(l: Line): string {
  const u = toN(l.unit);
  const parts: string[] = [];
  if (l.qty > 1) {
    const mul = l.noun ? `${l.qty}${l.noun}` : `${l.qty}`;
    const base = u === 0 ? l.list : u;
    parts.push(base != null && base > 0 ? `${won(base)}원 × ${mul}` : `× ${mul}`);
  }
  if (l.note.trim()) parts.push(l.note.trim());
  return parts.join('  ·  ');
}

/**
 * paint=false 면 그리지 않고 높이만 계산합니다. 반환값은 이미지 전체 높이.
 * 글자 위치는 모두 "줄 위쪽(top)" 기준으로 잡고, put 이 기준선(baseline)에 맞춰 줍니다.
 */
function drawQuote(
  ctx: CanvasRenderingContext2D, d: Doc, logo: HTMLImageElement | null, ff: string, paint: boolean,
): number {
  const p = PAL[d.theme];
  const CW = W - PAD * 2;
  let on = paint;
  const font = (w: number, s: number) => `${w} ${s}px ${ff}`;

  function withDraw<T>(v: boolean, fn: () => T): T {
    const prev = on;
    on = v && paint;
    const r = fn();
    on = prev;
    return r;
  }

  const put = (s: string, x: number, y: number, w: number, size: number, color: string, align: CanvasTextAlign = 'left') => {
    ctx.font = font(w, size);
    if (on) {
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(s, x, y);
    }
    return ctx.measureText(s).width;
  };

  const wrap = (s: string, maxW: number, w: number, size: number): string[] => {
    ctx.font = font(w, size);
    const out: string[] = [];
    for (const para of s.split('\n')) {
      let cur = '';
      for (const ch of Array.from(para)) {
        if (cur && ctx.measureText(cur + ch).width > maxW) {
          out.push(cur);
          cur = ch === ' ' ? '' : ch;
        } else cur += ch;
      }
      out.push(cur);
    }
    return out;
  };

  const hline = (x1: number, x2: number, y: number) => {
    if (!on) return;
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y + 0.5);
    ctx.lineTo(x2, y + 0.5);
    ctx.stroke();
  };

  const card = (x: number, y: number, w: number, h: number) => {
    if (!on) return;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 24);
    ctx.fillStyle = p.card;
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  /** 줄 오른쪽 금액: 일반 / 무료(정가 취소선) / 협의 */
  const amountAt = (l: Line, rx: number, base: number) => {
    const u = toN(l.unit);
    if (u == null) {
      put('협의', rx, base, 500, 20, p.ink3, 'right');
    } else if (u === 0) {
      const wFree = put('무료', rx, base, 700, 20, p.accent, 'right');
      if (l.list && l.list > 0) {
        const t = `${won(l.list * l.qty)}원`;
        const sx = rx - wFree - 14;
        const tw = put(t, sx, base - 1, 400, 16, p.ink3, 'right');
        if (on) {
          ctx.strokeStyle = p.ink3;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx - tw, base - 7);
          ctx.lineTo(sx, base - 7);
          ctx.stroke();
        }
      }
    } else {
      put(`${won(u * l.qty)}원`, rx, base, 600, 20, p.ink, 'right');
    }
  };

  /* ── 곡 카드 ── */
  const songBlock = (s: Song, i: number, x0: number, y0: number, w: number): number => {
    const ix = x0 + CARD_PAD;
    const iw = w - CARD_PAD * 2;
    let y = y0 + CARD_PAD;
    const showHead = d.songs.length > 1 || s.title.trim() !== '';
    const off = showHead ? 48 : 0;

    if (showHead) {
      const name = s.title.trim() || `곡 ${i + 1}`;
      const priced = s.lines.some((l) => toN(l.unit) != null);
      const amt = s.lines.length === 0 ? '' : priced ? `${won(songTotal(s))}원` : '협의';
      ctx.font = font(700, 28);
      const aw = amt ? ctx.measureText(amt).width : 0;
      const tl = wrap(name, iw - off - aw - 24, 700, 28);
      put(String(i + 1).padStart(2, '0'), ix, y + 28 * 1.05, 700, 20, p.accent);
      tl.forEach((ln, k) => put(ln, ix + off, y + k * 36 + 28 * 1.05, 700, 28, p.ink));
      if (amt) put(amt, ix + iw, y + 28 * 1.05, 700, 28, p.ink, 'right');
      y += tl.length * 36 + 6;
    }

    if (s.lines.length === 0) {
      y += 8;
      put('구성 항목이 없습니다', ix + off, y + 17 * 1.05, 400, 17, p.ink3);
      y += 28;
    } else if (d.mode === 'summary') {
      const names = s.lines.map((l) => `${l.name.trim() || '항목'}${l.qty > 1 ? ` ×${l.qty}` : ''}`);
      y += 4;
      wrap(names.join('  ·  '), iw - off, 400, 17).forEach((ln) => {
        put(ln, ix + off, y + 17 * 1.05, 400, 17, p.ink3);
        y += 26;
      });
    } else {
      s.lines.forEach((l, k) => {
        y += 14;
        if (k > 0 || showHead) hline(ix, ix + iw, y);
        y += 16;
        const nameW = iw - 240;
        const nl = wrap(l.name.trim() || '(항목 이름 없음)', nameW, 500, 20);
        const sub = subText(l);
        const sl = sub ? wrap(sub, nameW, 400, 15) : [];
        nl.forEach((ln, j) => put(ln, ix, y + j * 28 + 20 * 1.05, 500, 20, p.ink));
        sl.forEach((ln, j) => put(ln, ix, y + nl.length * 28 + 2 + j * 22 + 15 * 1.05, 400, 15, p.ink3));
        amountAt(l, ix + iw, y + 20 * 1.05);
        y += nl.length * 28 + (sl.length ? 2 + sl.length * 22 : 0);
      });
    }
    return y - y0 + CARD_PAD;
  };

  const songSum = d.songs.reduce((t, s) => t + songTotal(s), 0);
  const adjs = d.adjs.filter((a) => adjN(a.amount) !== 0);
  const grand = songSum + adjs.reduce((t, a) => t + adjN(a.amount), 0);
  const tbd = d.songs.some((s) => s.lines.some((l) => toN(l.unit) == null));

  /* ── 총 금액 카드 ── */
  const totalsBlock = (x0: number, y0: number, w: number): number => {
    const ix = x0 + CARD_PAD;
    const iw = w - CARD_PAD * 2;
    let y = y0 + CARD_PAD;
    if (adjs.length) {
      put('곡 합계', ix, y + 18 * 1.05, 500, 18, p.ink2);
      put(`${won(songSum)}원`, ix + iw, y + 18 * 1.05, 600, 18, p.ink, 'right');
      y += 36;
      adjs.forEach((a) => {
        const n = adjN(a.amount);
        put(a.label.trim() || '조정', ix, y + 18 * 1.05, 500, 18, p.ink2);
        put(`${n < 0 ? '-' : '+'}${won(Math.abs(n))}원`, ix + iw, y + 18 * 1.05, 600, 18, n < 0 ? p.accent : p.ink, 'right');
        y += 36;
      });
      y += 4;
      hline(ix, ix + iw, y);
      y += 22;
    }
    put('총 금액', ix, y + 44 * 1.05, 600, 22, p.ink2);
    put(`${won(grand)}원`, ix + iw, y + 44 * 1.05, 800, 44, p.accent, 'right');
    y += 44 * 1.3 + 6;
    put(tbd ? 'VAT 포함 · 협의 항목은 합계에서 제외' : 'VAT 포함', ix + iw, y + 15 * 1.05, 400, 15, p.ink3, 'right');
    y += 22;
    return y - y0 + CARD_PAD;
  };

  /* ── 위에서부터 차례로 ── */
  let y = PAD;

  // 상단: 로고 + 발행일
  const logoH = 40;
  if (logo && logo.naturalHeight > 0) {
    const lw = logoH * (logo.naturalWidth / logo.naturalHeight);
    if (on) ctx.drawImage(logo, PAD, y, lw, logoH);
  } else {
    put('HamRanè', PAD, y + 30, 700, 30, p.ink);
  }
  put('PROJECT QUOTE', W - PAD, y + 16, 600, 14, p.ink3, 'right');
  if (d.date) put(d.date.replace(/-/g, '.'), W - PAD, y + 38, 500, 16, p.ink2, 'right');
  y += logoH + 44;

  // 제목
  const title = d.project.trim() || '프로젝트 견적서';
  wrap(title, CW, 700, 42).forEach((ln) => {
    put(ln, PAD, y + 42 * 1.05, 700, 42, p.ink);
    y += 42 * 1.3;
  });
  y += 14;

  // 의뢰인 · 유효기간
  const client = d.client.trim();
  const metas: [string, string][] = [];
  if (client) metas.push(['의뢰인', client.endsWith('님') ? client : `${client}님`]);
  if (d.valid.trim()) metas.push(['유효기간', d.valid.trim()]);
  if (metas.length) {
    let x = PAD;
    metas.forEach(([k, v]) => {
      const wk = put(k, x, y + 14 * 1.05, 500, 14, p.ink3);
      const wv = put(v, x, y + 26 + 20 * 1.05, 600, 20, p.ink);
      x += Math.max(wk, wv) + 56;
    });
    y += 62;
  }
  y += 14;
  hline(PAD, W - PAD, y);
  y += 32;

  // 곡별 카드
  d.songs.forEach((s, i) => {
    const h = withDraw(false, () => songBlock(s, i, PAD, y, CW));
    card(PAD, y, CW, h);
    songBlock(s, i, PAD, y, CW);
    y += h + 20;
  });

  // 총 금액 카드
  const th = withDraw(false, () => totalsBlock(PAD, y, CW));
  card(PAD, y, CW, th);
  totalsBlock(PAD, y, CW);
  y += th;

  // 안내 문구
  const notes = d.notes.trim();
  if (notes) {
    y += 40;
    put('안내', PAD, y + 14 * 1.05, 600, 14, p.ink3);
    y += 28;
    notes.split('\n').forEach((para) => {
      if (!para.trim()) {
        y += 10;
        return;
      }
      wrap(para, CW, 400, 17).forEach((ln) => {
        put(ln, PAD, y + 17 * 1.05, 400, 17, p.ink2);
        y += 27;
      });
    });
  }
  return y + PAD;
}

/** 캔버스 크기를 맞추고 그립니다. 너무 긴 이미지는 해상도를 낮춰 브라우저 한도를 넘지 않게 합니다. */
function paintQuote(cv: HTMLCanvasElement, d: Doc, logo: HTMLImageElement | null, ff: string): number {
  const scratch = document.createElement('canvas').getContext('2d');
  if (!scratch) return 0;
  const H = Math.ceil(drawQuote(scratch, d, logo, ff, false));
  const S = Math.max(1, Math.min(2, 16000 / H));
  cv.width = Math.round(W * S);
  cv.height = Math.round(H * S);
  const ctx = cv.getContext('2d');
  if (!ctx) return H;
  ctx.setTransform(S, 0, 0, S, 0, 0);
  ctx.fillStyle = PAL[d.theme].bg;
  ctx.fillRect(0, 0, W, H);
  drawQuote(ctx, d, logo, ff, true);
  return H;
}

/* ───────────── 화면 ───────────── */
export function QuoteMaker({ groups, pkgs }: { groups: QuoteGroup[]; pkgs: QuotePkg[] }) {
  const [doc, setDoc] = useState<Doc>(blankDoc);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const [msg, setMsg] = useState('');
  const cvRef = useRef<HTMLCanvasElement>(null);
  const logos = useRef<Partial<Record<Theme, HTMLImageElement | null>>>({});
  const items = groups.flatMap((g) => g.items);

  const toast = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3500);
  };

  // 임시 저장 불러오기 (화면이 뜬 뒤에 읽어서 서버/브라우저 표시가 어긋나지 않게 합니다)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const j = JSON.parse(raw) as Partial<Doc>;
        if (j && Array.isArray(j.songs) && j.songs.length > 0) {
          setDoc({ ...blankDoc(), ...j } as Doc);
          setReady(true);
          return;
        }
      }
    } catch {
      /* 저장본이 깨졌으면 새로 시작 */
    }
    setDoc((x) => ({ ...x, date: today() }));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(doc));
    } catch {
      /* 저장 공간이 없어도 작업은 계속 */
    }
  }, [doc, ready]);

  const getLogo = (t: Theme) =>
    new Promise<HTMLImageElement | null>((res) => {
      if (t in logos.current) return res(logos.current[t] ?? null);
      const img = new Image();
      img.onload = () => { logos.current[t] = img; res(img); };
      img.onerror = () => { logos.current[t] = null; res(null); };
      img.src = t === 'dark' ? '/logo-on-dark.png' : '/logo-on-light.png';
    });

  // 미리보기 다시 그리기
  useEffect(() => {
    if (!ready) return;
    let dead = false;
    const timer = setTimeout(async () => {
      const cv = cvRef.current;
      if (!cv) return;
      const ff = getComputedStyle(document.body).fontFamily || 'sans-serif';
      const sample = JSON.stringify(doc) + '견적서 곡 합계 총 금액 무료 협의 안내 원 VAT 포함 의뢰인 유효기간';
      try {
        await Promise.all([400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 20px ${ff}`, sample)));
      } catch {
        /* 글꼴을 못 불러와도 기본 글꼴로 그림 */
      }
      const logo = await getLogo(doc.theme);
      if (dead) return;
      setHeight(paintQuote(cv, doc, logo, ff));
    }, 150);
    return () => { dead = true; clearTimeout(timer); };
  }, [doc, ready]);

  /* ── 상태 변경 도우미 ── */
  const upd = (patch: Partial<Doc>) => setDoc((x) => ({ ...x, ...patch }));
  const setSong = (sid: string, fn: (s: Song) => Song) =>
    setDoc((x) => ({ ...x, songs: x.songs.map((s) => (s.id === sid ? fn(s) : s)) }));
  const setLine = (sid: string, lid: string, patch: Partial<Line>) =>
    setSong(sid, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));

  const addSong = () => setDoc((x) => ({ ...x, songs: [...x.songs, blankSong()] }));
  const delSong = (sid: string) =>
    setDoc((x) => (x.songs.length > 1 ? { ...x, songs: x.songs.filter((s) => s.id !== sid) } : x));
  const moveSong = (i: number, dir: -1 | 1) =>
    setDoc((x) => {
      const j = i + dir;
      if (j < 0 || j >= x.songs.length) return x;
      const songs = [...x.songs];
      [songs[i], songs[j]] = [songs[j], songs[i]];
      return { ...x, songs };
    });
  const dupSong = (sid: string) =>
    setDoc((x) => {
      const i = x.songs.findIndex((s) => s.id === sid);
      if (i < 0) return x;
      const src = x.songs[i];
      const copy: Song = {
        id: uid(), title: src.title ? `${src.title} (복사)` : '',
        lines: src.lines.map((l) => ({ ...l, id: uid() })),
      };
      const songs = [...x.songs];
      songs.splice(i + 1, 0, copy);
      return { ...x, songs };
    });

  const addItem = (sid: string, itemId: string) => {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    const line: Line = {
      id: uid(), name: it.name, qty: 1, unit: it.price == null ? '' : String(it.price),
      list: it.price, noun: it.noun, note: '',
    };
    setSong(sid, (s) => ({ ...s, lines: [...s.lines, line] }));
  };
  const addCustom = (sid: string) =>
    setSong(sid, (s) => ({ ...s, lines: [...s.lines, { id: uid(), name: '', qty: 1, unit: '', list: null, noun: '', note: '' }] }));
  const addPkg = (sid: string, pid: string) => {
    const pk = pkgs.find((x) => x.id === pid);
    if (!pk) return;
    setSong(sid, (s) => ({ ...s, lines: [...s.lines, ...pk.lines.map((l) => ({ ...l, id: uid(), note: '' }))] }));
  };
  const delLine = (sid: string, lid: string) =>
    setSong(sid, (s) => ({ ...s, lines: s.lines.filter((l) => l.id !== lid) }));

  const addAdj = () => setDoc((x) => ({ ...x, adjs: [...x.adjs, { id: uid(), label: '', amount: '' }] }));
  const setAdj = (id: string, patch: Partial<Adj>) =>
    setDoc((x) => ({ ...x, adjs: x.adjs.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const delAdj = (id: string) => setDoc((x) => ({ ...x, adjs: x.adjs.filter((a) => a.id !== id) }));

  /* ── 저장 · 복사 · 초기화 ── */
  const fileName = () => {
    const base = (doc.client || doc.project || 'project').replace(/[\\/:*?"<>|\s]+/g, '_');
    return `견적서_${base}_${doc.date || today()}.png`;
  };
  const savePng = () => {
    const cv = cvRef.current;
    if (!cv) return;
    cv.toBlob((b) => {
      if (!b) return toast('이미지를 만들지 못했어요.');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = fileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };
  const copyPng = async () => {
    const cv = cvRef.current;
    if (!cv) return;
    try {
      const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('empty');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('복사했어요. 디스코드 등에 붙여넣기(⌘V) 하세요.');
    } catch {
      toast('복사하지 못했어요. 저장 버튼을 써 주세요.');
    }
  };
  const reset = () => {
    if (!window.confirm('입력한 내용을 모두 지우고 처음부터 시작할까요?')) return;
    try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
    setDoc({ ...blankDoc(), date: today() });
  };

  return (
    <div className="hr-qm">
      <div className="hr-qm-form">
        <section className="hr-card">
          <h2>기본 정보</h2>
          <div className="hr-qm-grid">
            <label>의뢰인<input value={doc.client} placeholder="예: 홍길동" onChange={(e) => upd({ client: e.target.value })} /></label>
            <label>프로젝트 이름<input value={doc.project} placeholder="예: OO 콘서트 음원 작업" onChange={(e) => upd({ project: e.target.value })} /></label>
            <label>발행일<input type="date" value={doc.date} onChange={(e) => upd({ date: e.target.value })} /></label>
            <label>유효기간<input value={doc.valid} onChange={(e) => upd({ valid: e.target.value })} /></label>
          </div>
        </section>

        {doc.songs.map((s, si) => {
          const total = songTotal(s);
          return (
            <section key={s.id} className="hr-card hr-qm-song">
              <div className="hr-qm-songhead">
                <span className="hr-qm-no">{String(si + 1).padStart(2, '0')}</span>
                <label>곡 이름
                  <input value={s.title} placeholder={`곡 ${si + 1}`} onChange={(e) => setSong(s.id, (x) => ({ ...x, title: e.target.value }))} />
                </label>
                <button type="button" aria-label="위로" disabled={si === 0} onClick={() => moveSong(si, -1)}>↑</button>
                <button type="button" aria-label="아래로" disabled={si === doc.songs.length - 1} onClick={() => moveSong(si, 1)}>↓</button>
                <button type="button" onClick={() => dupSong(s.id)}>복제</button>
                <button type="button" disabled={doc.songs.length < 2} onClick={() => delSong(s.id)}>삭제</button>
              </div>

              {s.lines.map((l) => {
                const t = lineTotal(l);
                return (
                  <div key={l.id} className="hr-qm-line">
                    <input aria-label="항목 이름" value={l.name} placeholder="항목 이름" onChange={(e) => setLine(s.id, l.id, { name: e.target.value })} />
                    <input
                      aria-label="수량" type="number" min={1} max={99} value={l.qty}
                      onChange={(e) => setLine(s.id, l.id, { qty: Math.min(99, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })}
                    />
                    <input
                      aria-label="개당 금액 (비우면 협의, 0은 무료)" inputMode="numeric" placeholder="협의"
                      value={l.unit === '' ? '' : Number(l.unit).toLocaleString('ko-KR')}
                      onChange={(e) => setLine(s.id, l.id, { unit: e.target.value.replace(/[^\d]/g, '') })}
                    />
                    <button type="button" aria-label="항목 삭제" onClick={() => delLine(s.id, l.id)}>×</button>
                    <div className="n2">
                      <input aria-label="메모" value={l.note} placeholder="메모 (예: 빠른 마감 +30%)" onChange={(e) => setLine(s.id, l.id, { note: e.target.value })} />
                      <span className="hr-qm-lt">
                        {l.list != null ? `정가 ${won(l.list)}원 · ` : ''}
                        {t == null ? '협의' : t === 0 ? '무료' : `${won(t)}원`}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="hr-qm-btns">
                <select value="" aria-label="단가표에서 추가" onChange={(e) => { if (e.target.value) addItem(s.id, e.target.value); }}>
                  <option value="">+ 단가표에서 추가…</option>
                  {groups.map((g) => (
                    <optgroup key={g.name} label={g.name}>
                      {g.items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}{i.price != null ? ` · ${won(i.price)}원` : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <select value="" aria-label="패키지로 채우기" onChange={(e) => { if (e.target.value) addPkg(s.id, e.target.value); }}>
                  <option value="">+ 패키지 구성 불러오기…</option>
                  {pkgs.map((pk) => <option key={pk.id} value={pk.id}>{pk.label}</option>)}
                </select>
                <button type="button" onClick={() => addCustom(s.id)}>+ 직접 입력</button>
                <span className="hr-qm-st">곡 합계 <b>{won(total)}원</b></span>
              </div>
            </section>
          );
        })}

        <button type="button" className="hr-qm-add" onClick={addSong}>+ 곡 추가</button>

        <section className="hr-card">
          <h2>할인/조정 <small>(선택)</small></h2>
          {doc.adjs.map((a) => (
            <div key={a.id} className="hr-qm-adj">
              <input aria-label="항목" value={a.label} placeholder="예: 묶음 할인" onChange={(e) => setAdj(a.id, { label: e.target.value })} />
              <input
                aria-label="금액 (할인은 앞에 -)" inputMode="numeric" value={a.amount} placeholder="-50000"
                onChange={(e) => {
                  const neg = e.target.value.trim().startsWith('-');
                  const digits = e.target.value.replace(/[^\d]/g, '');
                  setAdj(a.id, { amount: (neg ? '-' : '') + digits });
                }}
              />
              <button type="button" aria-label="삭제" onClick={() => delAdj(a.id)}>×</button>
            </div>
          ))}
          <div className="hr-qm-btns">
            <button type="button" onClick={addAdj}>+ 할인/조정 줄 추가</button>
          </div>
        </section>

        <section className="hr-card">
          <h2>안내 문구</h2>
          <textarea rows={4} aria-label="안내 문구" value={doc.notes} onChange={(e) => upd({ notes: e.target.value })} />
        </section>
      </div>

      <aside className="hr-qm-prev">
        <div className="hr-qm-btns">
          <div className="hr-qm-seg" role="group" aria-label="곡별 표시">
            <button type="button" className={doc.mode === 'detail' ? 'on' : ''} onClick={() => upd({ mode: 'detail' })}>상세</button>
            <button type="button" className={doc.mode === 'summary' ? 'on' : ''} onClick={() => upd({ mode: 'summary' })}>요약</button>
          </div>
          <div className="hr-qm-seg" role="group" aria-label="테마">
            <button type="button" className={doc.theme === 'light' ? 'on' : ''} onClick={() => upd({ theme: 'light' })}>라이트</button>
            <button type="button" className={doc.theme === 'dark' ? 'on' : ''} onClick={() => upd({ theme: 'dark' })}>다크</button>
          </div>
        </div>
        <div className="hr-qm-btns">
          <button type="button" className="pri" onClick={savePng}>PNG 저장</button>
          <button type="button" onClick={copyPng}>이미지 복사</button>
          <button type="button" onClick={reset}>처음부터</button>
        </div>
        {msg && <p className="hr-qm-msg" role="status">{msg}</p>}
        {height > 9000 && (
          <p className="hr-qm-msg">이미지가 매우 깁니다. &lsquo;요약&rsquo; 보기를 쓰면 짧아져요.</p>
        )}
        <div className="hr-qm-cvwrap">
          <canvas ref={cvRef} className="hr-qm-cv" aria-label="견적서 미리보기" />
        </div>
      </aside>
    </div>
  );
}
