// src/components/admin/QuoteMaker.tsx — 견적서·명세서: 입력 → 캔버스 미리보기 → PNG 저장/복사
'use client';
import { useEffect, useRef, useState } from 'react';
import {
  nextNo, renumber, validLabel, listSlots, saveSlot, removeSlot, readPreset, writePreset,
  type QuoteSlot,
} from '@/lib/quote-store';
import { feeLabel, type Fee } from '@/lib/turnaround';

export type QuoteItem = {
  id: string; name: string; price: number | null; noun: string;
  rush?: { days: string; fee: Fee }; // 단가표에서 빠른 마감을 켠 항목
  same?: { fee: Fee }; // 단가표에서 당일 마감을 켠 항목
};
export type QuoteGroup = { name: string; items: QuoteItem[] };
export type PresetLine = { name: string; qty: number; unit: string; list: number | null; noun: string; iid?: string };
export type QuotePkg = { id: string; label: string; lines: PresetLine[] };

/** 항목 할인 표시 방식: off=사용 안 함, pct=할인율로 표시, amt=할인금액으로 표시 */
type DMode = 'off' | 'pct' | 'amt';
/** 단계별 입금: 입금 완료 / 이번 입금 / 추후 입금 */
const PAYS = ['paid', 'now', 'later'] as const;
type Pay = (typeof PAYS)[number];
const PAY_NAME: Record<Pay, string> = { paid: '입금 완료', now: '이번 입금', later: '추후 입금' };

/**
 * unit: 개당 금액(숫자 글자). '' = 협의, '0' = 무료 / list: 단가표 정가 / noun: 세는 말(트랙 등)
 * 항목 할인(금액은 모두 "수량을 곱한 이 항목 합계" 기준)
 *  orig: 원가 직접 입력('' = 단가표 정가 × 수량) / dv: 할인율(%) 또는 할인금액 / af: 할인 후 가격
 *  by: 마지막에 직접 입력한 쪽 ('v' = 할인값, 'a' = 할인 후 가격). 나머지 한쪽은 자동 계산
 */
type Line = PresetLine & {
  id: string; note: string; who: string; org: string;
  dm: DMode; orig: string; dv: string; af: string; by: 'v' | 'a';
  pay: Pay;
};
type Song = { id: string; title: string; lines: Line[] };
type Adj = { id: string; label: string; amount: string; pay: Pay };
type Theme = 'light' | 'dark';
type Mode = 'detail' | 'summary';
type Kind = 'quote' | 'statement';
type Doc = {
  kind: Kind;
  no: string; // 문서 번호 (예: Q-20261010-01). 비어 있으면 표시하지 않음
  client: string; project: string; date: string;
  valid: string; // 견적서: 유효기간
  done: string; // 명세서: 작업 완료일 (YYYY-MM-DD)
  due: string; // 명세서: 입금 기한
  bank: string; // 명세서: 입금 계좌
  paid: string; // 명세서: 기 입금액(선입금), 숫자 글자
  stage: boolean; // 명세서: 단계별 입금 사용
  later: string; // 명세서: 추후 입금 안내 문구
  songs: Song[]; adjs: Adj[]; notes: string; theme: Theme; mode: Mode;
};

const KEY = 'hr-quote-draft-v1';
const KIND_NAME: Record<Kind, string> = { quote: '견적서', statement: '명세서' };
const DEFAULT_NOTES: Record<Kind, string> = {
  quote: '• 금액은 VAT 포함입니다.\n• 곡의 난이도와 작업량에 따라 달라질 수 있으며, 확인 후 최종 금액을 안내드립니다.',
  statement: '• 금액은 VAT 포함입니다.\n• 문의 사항은 편하게 연락 주세요.',
};

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
const toPay = (v: unknown): Pay => (v === 'paid' || v === 'later' ? v : 'now');
const toDm = (v: unknown): DMode => (v === 'pct' || v === 'amt' ? v : 'off');
/** 할인율 입력 정리: 숫자와 소수점 한 자리만, 100 초과 불가 */
const cleanPct = (s: string): string => {
  const m = s.replace(/[^\d.]/g, '');
  const [a, ...r] = m.split('.');
  const v = r.length ? `${a}.${r.join('').slice(0, 1)}` : a;
  return Number(v) > 100 ? '100' : v;
};

/* ───────────── 항목 할인 계산 ───────────── */
type Disc = { base: number; after: number; off: number; pct: number };

/** 원가(수량 반영): 직접 입력 → 단가표 정가×수량 → 개당 금액×수량 순서로 찾습니다. */
const baseOf = (l: Line): number | null => {
  const o = toN(l.orig);
  if (o != null) return o;
  if (l.list != null) return l.list * l.qty;
  const u = toN(l.unit);
  return u == null ? null : u * l.qty;
};
/** 원가 칸을 비웠을 때 쓰이는 기본 원가 */
const defaultBase = (l: Line): number | null => baseOf({ ...l, orig: '' });

/** 할인이 켜져 있고 실제로 깎이는 경우에만 값을 돌려줍니다. */
function discOf(l: Line): Disc | null {
  if (l.dm === 'off') return null;
  const base = baseOf(l);
  if (base == null || base <= 0) return null;
  let after: number;
  if (l.by === 'a') {
    const a = toN(l.af);
    if (a == null) return null;
    after = Math.min(base, a);
  } else {
    if (l.dv === '') return null;
    const cut =
      l.dm === 'pct'
        ? Math.round((base * Math.min(100, Number(l.dv) || 0)) / 100)
        : Math.min(base, toN(l.dv) ?? 0);
    after = base - cut;
  }
  const off = base - after;
  if (off <= 0) return null;
  return { base, after, off, pct: Math.round((off / base) * 1000) / 10 };
}

/** 항목 합계: 할인이 적용되면 할인 후 금액, 아니면 개당 금액 × 수량. null 은 협의 */
const lineTotal = (l: Line): number | null => {
  const d = discOf(l);
  if (d) return d.after;
  const u = toN(l.unit);
  return u == null ? null : u * l.qty;
};
const songTotal = (s: Song) => s.lines.reduce((t, l) => t + (lineTotal(l) ?? 0), 0);
const today = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/* ───────────── 단계별 입금 집계 ───────────── */
type PayRow = { label: string; amount: number | null };
type PayGroup = { rows: PayRow[]; sum: number };

function payGroups(d: Doc): Record<Pay, PayGroup> {
  const g: Record<Pay, PayGroup> = {
    paid: { rows: [], sum: 0 },
    now: { rows: [], sum: 0 },
    later: { rows: [], sum: 0 },
  };
  const multi = d.songs.length > 1;
  d.songs.forEach((s, i) => {
    const sn = s.title.trim() || `곡 ${i + 1}`;
    s.lines.forEach((l) => {
      const name = `${l.name.trim() || '항목'}${l.qty > 1 ? ` ×${l.qty}` : ''}`;
      const t = lineTotal(l);
      g[l.pay].rows.push({ label: multi ? `${sn} · ${name}` : name, amount: t });
      if (t != null) g[l.pay].sum += t;
    });
  });
  d.adjs.forEach((a) => {
    const n = adjN(a.amount);
    if (n === 0) return;
    g[a.pay].rows.push({ label: a.label.trim() || '조정', amount: n });
    g[a.pay].sum += n;
  });
  return g;
}

/** 카톡·디스코드에 붙여넣을 요약 글. 이미지와 같은 계산(항목 할인·조정·단계별 입금)을 씁니다. */
export function messengerText(d: Doc): string {
  const isSt = d.kind === 'statement';
  const money = (t: number | null) => (t == null ? '협의' : t === 0 ? '무료' : `${won(t)}원`);
  const out: string[] = [];

  out.push(`[${KIND_NAME[d.kind]}] ${d.project.trim() || (isSt ? '작업 명세서' : '프로젝트 견적서')}`);
  if (d.no.trim()) out.push(`번호: ${d.no.trim()}`);
  const client = d.client.trim();
  if (client) out.push(`의뢰인: ${client.endsWith('님') ? client : `${client}님`}`);
  if (d.date) out.push(`발행일: ${d.date.replace(/-/g, '.')}`);
  if (isSt) {
    if (d.done) out.push(`작업 완료일: ${d.done.replace(/-/g, '.')}`);
    if (d.due.trim()) out.push(`입금 기한: ${d.due.trim()}`);
  } else if (d.valid.trim()) {
    out.push(`유효기간: ${d.valid.trim()}`);
  }

  const staged = isSt && d.stage;
  const multi = d.songs.length > 1;
  let gross = 0;
  d.songs.forEach((s, i) => {
    out.push('');
    const whoSet = Array.from(new Set(s.lines.map((l) => whoText(l))));
    const common = s.lines.length > 1 && whoSet.length === 1 ? whoSet[0] : '';
    out.push(`■ ${s.title.trim() || `곡 ${i + 1}`}`);
    if (common) out.push(`  담당: ${common}`);
    s.lines.forEach((l) => {
      const dc = discOf(l);
      const t = lineTotal(l);
      let row = `- ${l.name.trim() || '항목'}${l.qty > 1 ? ` ×${l.qty}` : ''}: `;
      if (dc) {
        row += `${won(dc.base)}원 → ${money(t)} (${l.dm === 'pct' ? `${dc.pct}% 할인` : `${won(dc.off)}원 할인`})`;
      } else {
        row += money(t);
      }
      const w = whoText(l);
      out.push(row + (w && !common ? ` (담당: ${w})` : '') + (staged ? ` [${PAY_NAME[l.pay]}]` : ''));
    });
    if (multi) out.push(`  소계 ${won(songTotal(s))}원`);
    gross += songTotal(s);
  });

  let adjSum = 0;
  const adjs = d.adjs.filter((a) => adjN(a.amount) !== 0);
  if (adjs.length) {
    out.push('');
    adjs.forEach((a) => {
      const n = adjN(a.amount);
      adjSum += n;
      out.push(`${a.label.trim() || '조정'}: ${n < 0 ? '-' : '+'}${won(Math.abs(n))}원${staged ? ` [${PAY_NAME[a.pay]}]` : ''}`);
    });
  }

  const total = gross + adjSum;
  out.push('');
  out.push(`합계: ${won(total)}원 (VAT 포함)`);

  if (isSt) {
    if (staged) {
      const g = payGroups(d);
      out.push(`입금 완료: ${won(g.paid.sum)}원`);
      out.push(`이번에 입금할 금액: ${won(g.now.sum)}원`);
      out.push(`추후 입금: ${won(g.later.sum)}원${d.later.trim() ? ` (${d.later.trim()})` : ''}`);
    } else {
      const paid = toN(d.paid) ?? 0;
      if (paid > 0) {
        out.push(`기 입금액: -${won(paid)}원`);
        out.push(`남은 금액: ${won(Math.max(0, total - paid))}원`);
      }
    }
    if (d.bank.trim()) {
      out.push('');
      out.push(`입금 계좌: ${d.bank.trim()}`);
    }
  }

  const notes = d.notes.trim();
  if (notes) {
    out.push('');
    out.push(notes);
  }
  return out.join('\n');
}
const blankLine = (): Line => ({
  
  id: uid(), name: '', qty: 1, unit: '', list: null, noun: '', note: '', who: '', org: '',
  dm: 'off', orig: '', dv: '', af: '', by: 'v', pay: 'now',
});
/** 담당자·소속을 한 줄로 합칩니다. 둘 다 비면 빈 글자. 예: "홍길동 / 하늘크루" */
const whoText = (l: Pick<Line, 'who' | 'org'>): string =>
  [l.who.trim(), l.org.trim()].filter(Boolean).join(' / ');
const blankSong = (): Song => ({ id: uid(), title: '', lines: [] });
const blankDoc = (kind: Kind = 'quote'): Doc => ({
  kind, no: '', client: '', project: '', date: '', valid: '발행일로부터 14일',
  done: '', due: '', bank: '', paid: '', stage: false, later: '',
  songs: [blankSong()], adjs: [], notes: DEFAULT_NOTES[kind], theme: 'light', mode: 'detail',
});

/** 저장본·불러온 파일을 안전하게 읽습니다. 형식이 틀리면 null, 빠진 값은 기본값으로 채웁니다. */
const str = (v: unknown) => (typeof v === 'string' ? v : '');
function normalize(raw: unknown): Doc | null {
  if (!raw || typeof raw !== 'object') return null;
  const j = raw as Record<string, unknown>;
  if (!Array.isArray(j.songs) || j.songs.length === 0) return null;
  const kind: Kind = j.kind === 'statement' ? 'statement' : 'quote';
  const base = blankDoc(kind);

  const songs: Song[] = j.songs.map((s): Song => {
    const o = (s ?? {}) as Record<string, unknown>;
    const lines = Array.isArray(o.lines) ? o.lines : [];
    return {
      id: str(o.id) || uid(),
      title: str(o.title),
      lines: lines.map((l): Line => {
        const q = (l ?? {}) as Record<string, unknown>;
        const list = typeof q.list === 'number' && Number.isFinite(q.list) ? q.list : null;
        const dm = toDm(q.dm);
        const by: 'v' | 'a' = q.by === 'a' ? 'a' : 'v';
        const dvRaw = str(q.dv);
        return {
          id: str(q.id) || uid(),
          name: str(q.name),
          qty: Math.min(99, Math.max(1, Math.floor(Number(q.qty)) || 1)),
          unit: str(q.unit).replace(/[^\d]/g, ''),
          list,
          noun: str(q.noun),
          iid: str(q.iid) || undefined,
          note: str(q.note),
          who: str(q.who).slice(0, 30),
          org: str(q.org).slice(0, 30),
          dm,
          orig: str(q.orig).replace(/[^\d]/g, ''),
          dv: dm === 'amt' ? dvRaw.replace(/[^\d]/g, '') : cleanPct(dvRaw),
          af: str(q.af).replace(/[^\d]/g, ''),
          by,
          pay: toPay(q.pay),
        };
      }),
    };
  });
  const adjs: Adj[] = (Array.isArray(j.adjs) ? j.adjs : []).map((a): Adj => {
    const o = (a ?? {}) as Record<string, unknown>;
    return {
      id: str(o.id) || uid(),
      label: str(o.label),
      amount: str(o.amount).replace(/[^\d-]/g, ''),
      pay: toPay(o.pay),
    };
  });

  return {
    kind,
    no: str(j.no).slice(0, 30),
    client: str(j.client),
    project: str(j.project),
    date: str(j.date),
    valid: typeof j.valid === 'string' ? j.valid : base.valid,
    done: str(j.done),
    due: str(j.due),
    bank: str(j.bank),
    paid: str(j.paid).replace(/[^\d]/g, ''),
    stage: j.stage === true,
    later: str(j.later),
    songs,
    adjs,
    notes: typeof j.notes === 'string' ? j.notes : base.notes,
    theme: j.theme === 'dark' ? 'dark' : 'light',
    mode: j.mode === 'summary' ? 'summary' : 'detail',
  };
}

/* ───────────── 이미지 그리기 ───────────── */
const W = 1080;
const PAD = 64;
const CARD_PAD = 36;

type Pal = {
  bg: string; card: string; ink: string; ink2: string; ink3: string; line: string; accent: string;
  onAccent: string; tint: string;
};
const PAL: Record<Theme, Pal> = {
  light: {
    bg: '#f3f5ef', card: '#ffffff', ink: '#18241e', ink2: '#4d5f55', ink3: '#6f8178',
    line: 'rgba(40,70,52,.14)', accent: '#3f8458', onAccent: '#ffffff', tint: 'rgba(63,132,88,.10)',
  },
  dark: {
    bg: '#0f1715', card: '#1a2421', ink: '#eef3ef', ink2: '#a9b8b0', ink3: '#7d9187',
    line: 'rgba(190,230,205,.14)', accent: '#86efac', onAccent: '#0f1715', tint: 'rgba(134,239,172,.10)',
  },
};

/** 줄 아래 작은 글씨: "20,000원 × 8트랙 · 메모" */
function subText(l: Line): string {
  const u = toN(l.unit);
  const dc = discOf(l);
  const parts: string[] = [];
  if (l.qty > 1) {
    const mul = l.noun ? `${l.qty}${l.noun}` : `${l.qty}`;
    // 원가를 직접 입력했다면 개당 금액을 알 수 없어 곱셈 표기는 생략합니다.
    const base = dc ? (l.orig !== '' ? null : (l.list ?? u)) : u === 0 ? l.list : u;
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
  const isSt = d.kind === 'statement';
  const st = isSt && d.stage; // 단계별 입금 사용 중
  const G = st ? payGroups(d) : null;
  // 입금 완료·추후 입금 항목이 하나라도 있을 때만 강조/흐림/입금 안내 카드를 씁니다.
  const hl = !!G && (G.paid.rows.length > 0 || G.later.rows.length > 0);
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

  /** "이번 입금" 부분 강조 배경 */
  const tint = (x: number, y: number, w: number, h: number) => {
    if (!on) return;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fillStyle = p.tint;
    ctx.fill();
  };

  /** 입금 단계 표시 (높이 24). 이번 입금=채움, 입금 완료=실선, 추후 입금=점선 */
  const chip = (label: string, x: number, y: number, kind: Pay): number => {
    ctx.font = font(600, 13);
    const w = ctx.measureText(label).width + 22;
    if (on) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, 24, 12);
      if (kind === 'now') {
        ctx.fillStyle = p.accent;
        ctx.fill();
      } else {
        ctx.strokeStyle = kind === 'paid' ? p.ink3 : p.ink2;
        ctx.lineWidth = 1.2;
        ctx.setLineDash(kind === 'later' ? [4, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    put(label, x + 11, y + 17, 600, 13, kind === 'now' ? p.onAccent : kind === 'paid' ? p.ink3 : p.ink2);
    return w;
  };

  /** 줄 오른쪽 금액: 일반 / 항목 할인(원가 취소선) / 무료(정가 취소선) / 협의 */
  const amountAt = (l: Line, rx: number, base: number, dim = false) => {
    const dc = discOf(l);
    if (dc) {
      const free = dc.after === 0;
      const wf = put(free ? '무료' : `${won(dc.after)}원`, rx, base, 700, 20, free ? p.accent : dim ? p.ink3 : p.ink, 'right');
      const sx = rx - wf - 14;
      const tw = put(`${won(dc.base)}원`, sx, base - 1, 400, 16, p.ink3, 'right');
      if (on) {
        ctx.strokeStyle = p.ink3;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - tw, base - 7);
        ctx.lineTo(sx, base - 7);
        ctx.stroke();
      }
      put(l.dm === 'pct' ? `${dc.pct}% 할인` : `${won(dc.off)}원 할인`, rx, base + 24, 600, 15, p.accent, 'right');
      return;
    }
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
      put(`${won(u * l.qty)}원`, rx, base, 600, 20, dim ? p.ink3 : p.ink, 'right');
    }
  };

  /* ── 곡 카드 ── */
  const songBlock = (s: Song, i: number, x0: number, y0: number, w: number): number => {
    const ix = x0 + CARD_PAD;
    const iw = w - CARD_PAD * 2;
    let y = y0 + CARD_PAD;
    const showHead = d.songs.length > 1 || s.title.trim() !== '';
    const off = showHead ? 48 : 0;
    const whoSet = Array.from(new Set(s.lines.map((l) => whoText(l))));
    const common = showHead && s.lines.length > 1 && whoSet.length === 1 ? whoSet[0] : '';
    const lineSub = (l: Line) => [subText(l), common ? '' : whoText(l)].filter(Boolean).join('  ·  ');

    if (showHead) {
      const name = s.title.trim() || `곡 ${i + 1}`;
      const priced = s.lines.some((l) => lineTotal(l) != null);
      const amt = s.lines.length === 0 ? '' : priced ? `${won(songTotal(s))}원` : '협의';
      ctx.font = font(700, 28);
      const aw = amt ? ctx.measureText(amt).width : 0;
      const tl = wrap(name, iw - off - aw - 24, 700, 28);
      put(String(i + 1).padStart(2, '0'), ix, y + 28 * 1.05, 700, 20, p.accent);
      tl.forEach((ln, k) => put(ln, ix + off, y + k * 36 + 28 * 1.05, 700, 28, p.ink));
      if (amt) put(amt, ix + iw, y + 28 * 1.05, 700, 28, p.ink, 'right');
      y += tl.length * 36 + 6;
      if (common) {
        wrap(common, iw - off, 400, 16).forEach((ln) => {
          put(ln, ix + off, y + 16 * 1.05, 400, 16, p.ink3);
          y += 24;
        });
        y += 2;
      }
    }

    if (s.lines.length === 0) {
      y += 8;
      put('구성 항목이 없습니다', ix + off, y + 17 * 1.05, 400, 17, p.ink3);
      y += 28;
    } else if (d.mode === 'summary') {
      const names = s.lines.map(
        (l) => `${l.name.trim() || '항목'}${l.qty > 1 ? ` ×${l.qty}` : ''}${st ? ` (${PAY_NAME[l.pay]})` : ''}`,
      );
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
        const dc = discOf(l);
        const nameW = iw - (dc ? 330 : 240);
        const nl = wrap(l.name.trim() || '(항목 이름 없음)', nameW, 500, 20);
        const sub = lineSub(l);
        const sl = sub ? wrap(sub, nameW, 400, 15) : [];
        const chipH = st ? 32 : 0;
        const leftH = nl.length * 28 + chipH + (sl.length ? 2 + sl.length * 22 : 0);
        const rowH = Math.max(leftH, dc ? 52 : 28);
        const dim = hl && l.pay !== 'now';
        if (hl && l.pay === 'now') tint(ix - 14, y - 10, iw + 28, rowH + 20);
        nl.forEach((ln, j) => put(ln, ix, y + j * 28 + 20 * 1.05, 500, 20, dim ? p.ink2 : p.ink));
        if (st) chip(PAY_NAME[l.pay], ix, y + nl.length * 28 + 4, l.pay);
        sl.forEach((ln, j) => put(ln, ix, y + nl.length * 28 + chipH + 2 + j * 22 + 15 * 1.05, 400, 15, p.ink3));
        amountAt(l, ix + iw, y + 20 * 1.05, dim);
        y += rowH;
      });
    }
    return y - y0 + CARD_PAD;
  };

  const songSum = d.songs.reduce((t, s) => t + songTotal(s), 0);
  const adjs = d.adjs.filter((a) => adjN(a.amount) !== 0);
  const grand = songSum + adjs.reduce((t, a) => t + adjN(a.amount), 0);
  const tbd = d.songs.some((s) => s.lines.some((l) => lineTotal(l) == null));
  // 단계별 입금을 쓰는 동안에는 기 입금액 칸 대신 파트별 입금 단계로 계산합니다.
  const paid = isSt && !st ? (toN(d.paid) ?? 0) : 0;
  const remain = grand - paid;

  /* ── 입금 안내 카드 (단계별 입금: 입금 완료 / 이번 입금 / 추후 입금) ── */
  const stageBlock = (x0: number, y0: number, w: number): number => {
    if (!G) return 0;
    const g = G;
    const ix = x0 + CARD_PAD;
    const iw = w - CARD_PAD * 2;
    let y = y0 + CARD_PAD;
    put('입금 안내', ix, y + 15 * 1.05, 600, 15, p.ink3);
    y += 36;
    const kinds = PAYS.filter((k) => g[k].rows.length > 0);
    kinds.forEach((k, gi) => {
      const hot = k === 'now';
      const rows = g[k].rows.map((r) => ({ r, lines: wrap(r.label, iw - 230, 400, 18) }));
      const gh = 36 + rows.reduce((t, x) => t + x.lines.length * 26 + 6, 0) + 6;
      if (hot) tint(ix - 16, y - 10, iw + 32, gh + 14);
      const title =
        k === 'later' ? `추후 입금 · ${d.later.trim() || '입금일 별도 협의'}` : hot ? '이번 입금' : '입금 완료';
      put(title, ix, y + 20 * 1.05, 700, 20, hot ? p.accent : p.ink2);
      put(`${won(g[k].sum)}원`, ix + iw, y + 20 * 1.05, 700, 20, hot ? p.accent : p.ink2, 'right');
      y += 36;
      rows.forEach(({ r, lines }) => {
        lines.forEach((ln, j) => put(ln, ix + 14, y + j * 26 + 18 * 1.05, 400, 18, hot ? p.ink : p.ink3));
        const a = r.amount;
        put(
          a == null ? '협의' : a === 0 ? '무료' : `${a < 0 ? '-' : ''}${won(Math.abs(a))}원`,
          ix + iw, y + 18 * 1.05, 500, 18, hot ? p.ink : p.ink3, 'right',
        );
        y += lines.length * 26 + 6;
      });
      y += 6;
      if (gi < kinds.length - 1) {
        y += 10;
        hline(ix, ix + iw, y);
        y += 18;
      }
    });
    return y - y0 + CARD_PAD;
  };

  /* ── 총 금액 카드 ── */
  const totalsBlock = (x0: number, y0: number, w: number): number => {
    const ix = x0 + CARD_PAD;
    const iw = w - CARD_PAD * 2;
    let y = y0 + CARD_PAD;
    const row = (label: string, value: string, color: string) => {
      put(label, ix, y + 18 * 1.05, 500, 18, p.ink2);
      put(value, ix + iw, y + 18 * 1.05, 600, 18, color, 'right');
      y += 36;
    };
    const minus = (n: number) => `${n >= 0 ? '-' : '+'}${won(Math.abs(n))}원`;

    if (adjs.length) {
      row('곡 합계', `${won(songSum)}원`, p.ink);
      adjs.forEach((a) => {
        const n = adjN(a.amount);
        row(a.label.trim() || '조정', `${n < 0 ? '-' : '+'}${won(Math.abs(n))}원`, n < 0 ? p.accent : p.ink);
      });
    }
    if (paid > 0) {
      row('작업 금액', `${won(grand)}원`, p.ink);
      row('기 입금액', `-${won(paid)}원`, p.accent);
    }
    if (G && hl) {
      row('작업 금액 (전체)', `${won(grand)}원`, p.ink);
      if (G.paid.rows.length) row('입금 완료', minus(G.paid.sum), p.accent);
      if (G.later.rows.length) row('추후 입금', minus(G.later.sum), p.accent);
    }
    if (adjs.length || paid > 0 || (G && hl)) {
      y += 4;
      hline(ix, ix + iw, y);
      y += 22;
    }

    const nowAmt = G ? G.now.sum : remain;
    const label = !isSt
      ? '총 금액'
      : G
        ? nowAmt < 0 ? '환불 금액' : '이번 입금 금액'
        : remain < 0 ? '환불 금액' : paid > 0 ? '남은 금액' : '청구 금액';
    const shown = isSt ? Math.abs(nowAmt) : grand;
    put(label, ix, y + 44 * 1.05, 600, 22, p.ink2);
    put(`${won(shown)}원`, ix + iw, y + 44 * 1.05, 800, 44, p.accent, 'right');
    y += 44 * 1.3 + 6;
    put(tbd ? 'VAT 포함 · 협의 항목은 합계에서 제외' : 'VAT 포함', ix + iw, y + 15 * 1.05, 400, 15, p.ink3, 'right');
    y += 22;
    return y - y0 + CARD_PAD;
  };

  /* ── 입금 계좌 카드 (명세서) ── */
  const bank = isSt ? d.bank.trim() : '';
  const bankBlock = (x0: number, y0: number, w: number): number => {
    const ix = x0 + CARD_PAD;
    const iw = w - CARD_PAD * 2;
    let y = y0 + CARD_PAD;
    put('입금 계좌', ix, y + 15 * 1.05, 500, 15, p.ink3);
    y += 32;
    wrap(bank, iw, 600, 22).forEach((ln) => {
      put(ln, ix, y + 22 * 1.05, 600, 22, p.ink);
      y += 32;
    });
    return y - y0 + CARD_PAD - 8;
  };

  /* ── 위에서부터 차례로 ── */
  let y = PAD;

  // 상단: 로고 + 문서 종류/발행일
  const logoH = 40;
  if (logo && logo.naturalHeight > 0) {
    const lw = logoH * (logo.naturalWidth / logo.naturalHeight);
    if (on) ctx.drawImage(logo, PAD, y, lw, logoH);
  } else {
    put('HamRanè', PAD, y + 30, 700, 30, p.ink);
  }
  put(isSt ? 'STATEMENT' : 'PROJECT QUOTE', W - PAD, y + 16, 600, 14, p.ink3, 'right');
  if (d.date) put(d.date.replace(/-/g, '.'), W - PAD, y + 38, 500, 16, p.ink2, 'right');
  if (d.no.trim()) put(d.no.trim(), W - PAD, y + 62, 500, 14, p.ink3, 'right');
  y += logoH + 44;

  // 제목: 프로젝트 이름이 있으면 위에 문서 종류를 작게 붙입니다.
  const projectName = d.project.trim();
  if (projectName) {
    put(isSt ? '작업 명세서' : '견적서', PAD, y + 16 * 1.05, 700, 16, p.accent);
    y += 30;
  }
  const title = projectName || (isSt ? '작업 명세서' : '프로젝트 견적서');
  wrap(title, CW, 700, 42).forEach((ln) => {
    put(ln, PAD, y + 42 * 1.05, 700, 42, p.ink);
    y += 42 * 1.3;
  });
  y += 14;

  // 의뢰인 · 유효기간(견적서) / 작업 완료일 · 입금 기한(명세서)
  const client = d.client.trim();
  const metas: [string, string][] = [];
  if (client) metas.push(['의뢰인', client.endsWith('님') ? client : `${client}님`]);
  if (isSt) {
    if (d.done) metas.push(['작업 완료일', d.done.replace(/-/g, '.')]);
    if (d.due.trim()) metas.push(['입금 기한', d.due.trim()]);
  } else if (d.valid.trim()) {
    metas.push(['유효기간', d.valid.trim()]);
  }
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

  // 입금 안내 카드 (단계별 입금을 쓰고, 입금 완료/추후 입금 항목이 있을 때만)
  if (hl) {
    const sh = withDraw(false, () => stageBlock(PAD, y, CW));
    card(PAD, y, CW, sh);
    stageBlock(PAD, y, CW);
    y += sh + 20;
  }

  // 총 금액 카드
  const th = withDraw(false, () => totalsBlock(PAD, y, CW));
  card(PAD, y, CW, th);
  totalsBlock(PAD, y, CW);
  y += th;

  // 입금 계좌 카드 (명세서)
  if (bank) {
    y += 20;
    const bh = withDraw(false, () => bankBlock(PAD, y, CW));
    card(PAD, y, CW, bh);
    bankBlock(PAD, y, CW);
    y += bh;
  }

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
  const [doc, setDoc] = useState<Doc>(() => blankDoc());
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);
  const [msg, setMsg] = useState('');
  const cvRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const logos = useRef<Partial<Record<Theme, HTMLImageElement | null>>>({});
  const items = groups.flatMap((g) => g.items);
  const isSt = doc.kind === 'statement';
  const st = isSt && doc.stage;
  const split = st ? payGroups(doc) : null;
  const pending = doc.songs.reduce((n, s) => n + s.lines.filter((l) => lineTotal(l) == null).length, 0);

  const toast = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3500);
  };

  // 임시 저장 불러오기 (화면이 뜬 뒤에 읽어서 서버/브라우저 표시가 어긋나지 않게 합니다)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const n = normalize(JSON.parse(raw));
        if (n) {
          setDoc(n);
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
      const sample =
        JSON.stringify(doc) +
        '견적서 명세서 곡 합계 총 금액 청구 남은 입금 계좌 무료 협의 안내 원 VAT 포함 의뢰인 유효기간 할인 완료 추후 이번 전체 별도';
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

  /** 문서 종류 전환: 곡·금액은 그대로 두고, 기본 문구였던 안내만 새 종류의 기본 문구로 바꿉니다. */
  const setKind = (kind: Kind) =>
    setDoc((x) => {
      if (x.kind === kind) return x;
      const keep = x.notes.trim() !== '' && x.notes !== DEFAULT_NOTES[x.kind];
      return {
        ...x,
        kind,
        no: renumber(x.no, kind),
        bank: x.bank || (kind === 'statement' ? readPreset().bank : ''),
        notes: keep ? x.notes : DEFAULT_NOTES[kind],
        done: kind === 'statement' ? x.done || today() : x.done,
      };
    });

  const setSong = (sid: string, fn: (s: Song) => Song) =>
    setDoc((x) => ({ ...x, songs: x.songs.map((s) => (s.id === sid ? fn(s) : s)) }));
  const setLine = (sid: string, lid: string, patch: Partial<Line>) =>
    setSong(sid, (s) => ({ ...s, lines: s.lines.map((l) => (l.id === lid ? { ...l, ...patch } : l)) }));
  const setSongPay = (sid: string, pay: Pay) =>
    setSong(sid, (s) => ({ ...s, lines: s.lines.map((l) => ({ ...l, pay })) }));

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
      ...blankLine(),
      name: it.name,
      unit: it.price == null ? '' : String(it.price),
      list: it.price,
      noun: it.noun,
      iid: it.id,
    };
    setSong(sid, (s) => ({ ...s, lines: [...s.lines, line] }));
  };
  const addCustom = (sid: string) => setSong(sid, (s) => ({ ...s, lines: [...s.lines, blankLine()] }));
  const [whoOpen, setWhoOpen] = useState<string[]>([]);
  const toggleWho = (id: string) =>
    setWhoOpen((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const applyWho = (sid: string, from: Line) =>
    setSong(sid, (s) => ({ ...s, lines: s.lines.map((l) => ({ ...l, who: from.who, org: from.org })) }));

  const addPkg = (sid: string, pid: string) => {
    const pk = pkgs.find((x) => x.id === pid);
    if (!pk) return;
    setSong(sid, (s) => ({
      ...s,
      lines: [...s.lines, ...pk.lines.map((l): Line => ({ ...blankLine(), ...l, id: uid(), note: '' }))],
    }));
  };
  const delLine = (sid: string, lid: string) =>
    setSong(sid, (s) => ({ ...s, lines: s.lines.filter((l) => l.id !== lid) }));

  /* ── 항목 할인 입력 ── */
  const onOrig = (sid: string, l: Line, v: string) => setLine(sid, l.id, { orig: v.replace(/[^\d]/g, '') });
  const onDv = (sid: string, l: Line, v: string) =>
    setLine(sid, l.id, { dv: l.dm === 'pct' ? cleanPct(v) : v.replace(/[^\d]/g, ''), by: 'v' });
  const onAf = (sid: string, l: Line, v: string) => setLine(sid, l.id, { af: v.replace(/[^\d]/g, ''), by: 'a' });
  /** 할인율 ↔ 할인금액 표시 전환: 가격은 그대로 두고 입력값 표기만 바꿉니다. */
  const switchDm = (sid: string, l: Line, dm: DMode) => {
    if (dm === l.dm) return;
    const d = discOf(l);
    setLine(sid, l.id, {
      dm,
      dv: l.by === 'v' ? (d ? String(dm === 'pct' ? d.pct : d.off) : '') : l.dv,
    });
  };

  const discPanel = (sid: string, l: Line) => {
    const d = discOf(l);
    const base = baseOf(l);
    const def = defaultBase(l);
    const pct = l.dm === 'pct';
    const dvShown =
      l.by === 'v'
        ? pct ? l.dv : l.dv === '' ? '' : won(Number(l.dv))
        : d ? (pct ? String(d.pct) : won(d.off)) : '';
    const afShown = l.by === 'a' ? (l.af === '' ? '' : won(Number(l.af))) : d ? won(d.after) : '';

    let note = '할인율·할인금액·할인 후 가격 중 하나만 넣으면 나머지는 자동으로 계산돼요. (금액은 수량을 곱한 합계 기준)';
    let bad = false;
    if (d) {
      note = `${won(d.base)}원 → ${won(d.after)}원 · ${won(d.off)}원(${d.pct}%) 할인`;
    } else if (base == null || base <= 0) {
      note = '원가를 알 수 없어요. 원가 칸에 금액을 넣어 주세요.';
      bad = true;
    } else if (l.by === 'a' && l.af !== '' && (toN(l.af) ?? 0) >= base) {
      note = '할인 후 가격이 원가 이상이라 할인이 적용되지 않아요.';
      bad = true;
    }

    return (
      <div className="hr-qm-dc">
        <div className="hr-qm-seg" role="group" aria-label="할인 표시 방식">
          <button type="button" className={pct ? 'on' : ''} onClick={() => switchDm(sid, l, 'pct')}>할인율(%)로 표시</button>
          <button type="button" className={!pct ? 'on' : ''} onClick={() => switchDm(sid, l, 'amt')}>할인금액(원)으로 표시</button>
        </div>
        <label>
          원가
          <input
            inputMode="numeric"
            value={l.orig === '' ? '' : won(Number(l.orig))}
            placeholder={def != null ? `${won(def)} (기본)` : '원가 입력'}
            onChange={(e) => onOrig(sid, l, e.target.value)}
          />
        </label>
        <label>
          {pct ? '할인율 (%)' : '할인금액 (원)'}
          <input
            inputMode={pct ? 'decimal' : 'numeric'}
            value={dvShown}
            placeholder={pct ? '예: 20' : '예: 30,000'}
            onChange={(e) => onDv(sid, l, e.target.value)}
          />
        </label>
        <label>
          할인 후 가격
          <input
            inputMode="numeric"
            value={afShown}
            placeholder="예: 120,000"
            onChange={(e) => onAf(sid, l, e.target.value)}
          />
        </label>
        <p className={`hr-qm-dcs${bad ? ' bad' : ''}`}>{note}</p>
      </div>
    );
  };

  const addAdj = () =>
    setDoc((x) => ({ ...x, adjs: [...x.adjs, { id: uid(), label: '', amount: '', pay: 'now' }] }));
  const setAdj = (id: string, patch: Partial<Adj>) =>
    setDoc((x) => ({ ...x, adjs: x.adjs.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const delAdj = (id: string) => setDoc((x) => ({ ...x, adjs: x.adjs.filter((a) => a.id !== id) }));

  /* ── 저장 · 복사 · 파일 · 초기화 ── */
  const fileName = (ext: 'png' | 'json') => {
    const base = (doc.client || doc.project || 'project').replace(/[\\/:*?"<>|\s]+/g, '_');
    return `${KIND_NAME[doc.kind]}_${base}_${doc.date || today()}.${ext}`;
  };
  const download = (blob: Blob, name: string) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const savePng = () => {
    const cv = cvRef.current;
    if (!cv) return;
    cv.toBlob((b) => {
      if (!b) return toast('이미지를 만들지 못했어요.');
      download(b, fileName('png'));
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
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ v: 1, doc }, null, 2)], { type: 'application/json' });
    download(blob, fileName('json'));
    toast('작업 파일을 저장했어요. 나중에 불러오기로 이어서 작업할 수 있어요.');
  };
  const importJson = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (!window.confirm('지금 작성 중인 내용이 불러온 파일의 내용으로 바뀝니다. 계속할까요?')) return;
      const j = JSON.parse(await f.text()) as { doc?: unknown };
      const n = normalize(j?.doc ?? j);
      if (!n) throw new Error('bad');
      setDoc(n);
      setSlotId('');
      toast('불러왔어요.');
    } catch {
      toast('불러오지 못했어요. 이 페이지에서 저장한 .json 파일인지 확인해 주세요.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const reset = () => {
    if (!window.confirm('입력한 내용을 모두 지우고 처음부터 시작할까요? (입금 계좌는 남겨 둡니다)')) return;
    try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
    setSlotId('');
    setDoc({
      ...blankDoc(doc.kind),
      date: today(),
      done: doc.kind === 'statement' ? today() : '',
      bank: doc.bank,
    });
  };

  /* ── 마감 옵션(빠른·당일) 추가요금 ── */
  const addRush = (sid: string, l: Line, kind: 'rush' | 'same') => {
    const it = items.find((x) => x.id === l.iid);
    const opt = kind === 'rush' ? it?.rush : it?.same;
    if (!it || !opt) return;
    const fee = opt.fee;
    const total = lineTotal(l);
    let unit = '';
    if (fee) {
      if (fee.type === 'won') unit = String(fee.value * l.qty); // 정액은 개당 금액에 붙는 값이라 수량을 곱합니다.
      else if (total != null) unit = String(Math.round((total * fee.value) / 100));
    }
    const days = kind === 'rush' ? (it.rush?.days ?? '').trim() : '';
    const times = fee?.type === 'won' && l.qty > 1 ? ` × ${l.qty}${l.noun}` : '';
    const extra: Line = {
      ...blankLine(),
      name: `${l.name.trim() || '항목'} · ${kind === 'rush' ? '빠른 마감' : '당일 마감'}`,
      unit,
      note: `${feeLabel(fee)}${times}${days ? ` · ${days}` : ''}`,
      pay: l.pay,
    };
    setSong(sid, (s) => {
      const i = s.lines.findIndex((x) => x.id === l.id);
      const lines = [...s.lines];
      lines.splice(i < 0 ? lines.length : i + 1, 0, extra);
      return { ...s, lines };
    });
    toast(fee ? '마감 추가요금 줄을 넣었어요. 금액은 직접 고칠 수 있어요.' : '추가요금이 정해져 있지 않아 "협의"로 넣었어요.');
  };

  const rushOpts = (sid: string, l: Line) => {
    const it = l.iid ? items.find((x) => x.id === l.iid) : undefined;
    if (!it || (!it.rush && !it.same)) return null;
    return (
      <select
        className="hr-qm-pay" aria-label="마감 옵션 추가요금" value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'rush' || v === 'same') addRush(sid, l, v);
        }}
      >
        <option value="">+ 마감 옵션…</option>
        {it.rush && <option value="rush">빠른 마감 {feeLabel(it.rush.fee)}</option>}
        {it.same && <option value="same">당일 마감 {feeLabel(it.same.fee)}</option>}
      </select>
    );
  };


  /* ── 번호 · 유효기간 · 보관함 · 자주 쓰는 값 · 글로 복사 ── */
  const [slots, setSlots] = useState<QuoteSlot[]>([]);
  const [slotName, setSlotName] = useState('');
  const [slotId, setSlotId] = useState('');
  useEffect(() => { setSlots(listSlots()); }, []);

  const issueNo = () => upd({ no: nextNo(doc.kind, doc.date) });
  const setValidDays = (days: number) => upd({ valid: validLabel(days, doc.date) });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(messengerText(doc));
      toast('글로 복사했어요. 카톡·디스코드에 붙여넣기(⌘V) 하세요.');
    } catch {
      toast('복사하지 못했어요.');
    }
  };

  const saveToSlot = (overwrite: boolean) => {
    const target = overwrite ? slots.find((s) => s.id === slotId) : undefined;
    if (overwrite && !target) return toast('덮어쓸 보관본이 없어요. "새로 보관"을 눌러 주세요.');
    if (target && !window.confirm(`"${target.name}" 보관본을 지금 내용으로 덮어쓸까요?`)) return;
    const name = slotName.trim() || target?.name || doc.project.trim() || doc.client.trim();
    const next = saveSlot(name, JSON.stringify(doc), target?.id);
    if (!next) return toast('저장 공간이 부족해요. 오래된 보관본을 지워 주세요.');
    setSlots(next);
    setSlotId(next[0].id);
    setSlotName('');
    toast(`"${next[0].name}" 이름으로 보관했어요.`);
  };
  const loadSlot = (s: QuoteSlot) => {
    if (!window.confirm(`지금 작성 중인 내용이 "${s.name}"의 내용으로 바뀝니다. 계속할까요?`)) return;
    try {
      const n = normalize(JSON.parse(s.json));
      if (!n) throw new Error('bad');
      setDoc(n);
      setSlotId(s.id);
      toast(`"${s.name}" 보관본을 불러왔어요.`);
    } catch {
      toast('이 보관본을 읽지 못했어요.');
    }
  };
  const dropSlot = (s: QuoteSlot) => {
    if (!window.confirm(`"${s.name}" 보관본을 지울까요?`)) return;
    setSlots(removeSlot(s.id));
    if (slotId === s.id) setSlotId('');
  };

  const saveBankPreset = () => {
    if (!doc.bank.trim()) return toast('저장할 입금 계좌를 먼저 적어 주세요.');
    toast(writePreset({ bank: doc.bank.trim() }) ? '입금 계좌를 저장해 뒀어요.' : '저장하지 못했어요.');
  };
  const loadBankPreset = () => {
    const p = readPreset();
    if (!p.bank) return toast('저장해 둔 입금 계좌가 없어요.');
    upd({ bank: p.bank });
    toast('저장해 둔 입금 계좌를 넣었어요.');
  };
  const saveNotesPreset = () => {
    const patch = isSt ? { notesStatement: doc.notes } : { notesQuote: doc.notes };
    toast(writePreset(patch) ? `${KIND_NAME[doc.kind]} 안내 문구를 저장해 뒀어요.` : '저장하지 못했어요.');
  };
  const loadNotesPreset = () => {
    const p = readPreset();
    const v = isSt ? p.notesStatement : p.notesQuote;
    if (!v) return toast(`저장해 둔 ${KIND_NAME[doc.kind]} 안내 문구가 없어요.`);
    upd({ notes: v });
    toast('저장해 둔 안내 문구를 넣었어요.');
  };

  return (
    <div className="hr-qm">
      <div className="hr-qm-form">
        <section className="hr-card hr-qt">
          <h2>번호 · 보관함</h2>
          <div className="hr-qt-row">
            <button type="button" onClick={issueNo}>문서 번호 발급</button>
            <button type="button" onClick={copyText}>글로 복사 (카톡·디스코드)</button>
          </div>
          <div className="hr-qt-row">
            <input
              aria-label="보관 이름" maxLength={40} value={slotName}
              placeholder="보관 이름 (비우면 프로젝트·의뢰인 이름)"
              onChange={(e) => setSlotName(e.target.value)}
            />
            <button type="button" disabled={!slotId} onClick={() => saveToSlot(true)}>덮어쓰기</button>
            <button type="button" onClick={() => saveToSlot(false)}>새로 보관</button>
          </div>
          {slots.length > 0 && (
            <ul className="hr-qt-slots">
              {slots.map((s) => (
                <li key={s.id} className={s.id === slotId ? 'on' : undefined}>
                  <b title={s.name}>{s.name}</b>
                  <small>{new Date(s.at).toLocaleDateString('ko-KR')}</small>
                  <button type="button" onClick={() => loadSlot(s)}>불러오기</button>
                  <button type="button" onClick={() => dropSlot(s)}>삭제</button>
                </li>
              ))}
            </ul>
          )}
          <div className="hr-qt-row">
            <span>자주 쓰는 값</span>
            <button type="button" onClick={saveBankPreset}>입금 계좌 저장</button>
            <button type="button" onClick={loadBankPreset}>계좌 불러오기</button>
            <button type="button" onClick={saveNotesPreset}>{KIND_NAME[doc.kind]} 안내 문구 저장</button>
            <button type="button" onClick={loadNotesPreset}>문구 불러오기</button>
          </div>
          <small>보관함과 저장값은 이 브라우저에만 남습니다. 브라우저 데이터를 지우면 사라지니, 중요한 건은 작업 파일(.json)도 같이 받아 두세요.</small>
        </section>

        <section className="hr-card">
          <div className="hr-qm-kind">
            <h2>기본 정보</h2>
            <div className="hr-qm-seg" role="group" aria-label="문서 종류">
              <button type="button" className={doc.kind === 'quote' ? 'on' : ''} onClick={() => setKind('quote')}>견적서</button>
              <button type="button" className={doc.kind === 'statement' ? 'on' : ''} onClick={() => setKind('statement')}>명세서</button>
            </div>
            <small>같은 내용으로 문서 종류만 바꿔 뽑을 수 있어요.</small>
          </div>
          <div className="hr-qm-grid">
            <label>의뢰인<input value={doc.client} placeholder="예: 홍길동" onChange={(e) => upd({ client: e.target.value })} /></label>
            <label>프로젝트 이름<input value={doc.project} placeholder="예: OO 콘서트 음원 작업" onChange={(e) => upd({ project: e.target.value })} /></label>
            <label>발행일<input type="date" value={doc.date} onChange={(e) => upd({ date: e.target.value })} /></label>
            <label>문서 번호<input maxLength={30} value={doc.no} placeholder="비우면 이미지에 표시 안 함" onChange={(e) => upd({ no: e.target.value })} /></label>
            {isSt ? (
              <>
                <label>작업 완료일<input type="date" value={doc.done} onChange={(e) => upd({ done: e.target.value })} /></label>
                <label>입금 기한<input maxLength={30} value={doc.due} placeholder="예: 2026.10.12" onChange={(e) => upd({ due: e.target.value })} /></label>
                <label>입금 계좌<input maxLength={60} value={doc.bank} placeholder="예: 은행 000-0000-0000 예금주" onChange={(e) => upd({ bank: e.target.value })} /></label>
                {st ? (
                  <p className="hr-qm-hint">
                    단계별 입금을 쓰는 동안은 파트별 입금 단계로 계산해서 ‘기 입금액’ 칸은 쓰지 않아요.
                  </p>
                ) : (
                  <label>
                    기 입금액 (선입금)
                    <input
                      inputMode="numeric" placeholder="없으면 비워 두세요"
                      value={doc.paid === '' ? '' : Number(doc.paid).toLocaleString('ko-KR')}
                      onChange={(e) => upd({ paid: e.target.value.replace(/[^\d]/g, '') })}
                    />
                  </label>
                )}
              </>
            ) : (
              <>
                <label>유효기간<input maxLength={30} value={doc.valid} onChange={(e) => upd({ valid: e.target.value })} /></label>
                <div className="hr-qt-chips">
                  <span>유효기간 빠르게 넣기</span>
                  {[7, 14, 30].map((n) => (
                    <button key={n} type="button" onClick={() => setValidDays(n)}>{n}일</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {isSt && (
            <div className="hr-qm-stage">
              <label className="hr-qm-chk">
                <input type="checkbox" checked={doc.stage} onChange={(e) => upd({ stage: e.target.checked })} />
                단계별 입금 사용
              </label>
              <small>
                프로젝트 전체는 그대로 보여 주고, 파트마다 ‘입금 완료 / 이번 입금 / 추후 입금’을 표시해요.
                끄면 지금처럼 나옵니다.
              </small>
              {st && (
                <>
                  <label>
                    추후 입금 안내 문구 (선택)
                    <input
                      maxLength={30} value={doc.later} placeholder="비우면 ‘입금일 별도 협의’로 나와요"
                      onChange={(e) => upd({ later: e.target.value })}
                    />
                  </label>
                  {split && (
                    <p className="hr-qm-sum">
                      입금 완료 <b>{won(split.paid.sum)}원</b> · 이번 입금 <b>{won(split.now.sum)}원</b> · 추후 입금 <b>{won(split.later.sum)}원</b>
                    </p>
                  )}
                </>
              )}
            </div>
          )}
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

              {st && s.lines.length > 0 && (
                <div className="hr-qm-bulk">
                  <span>이 곡 전체를</span>
                  {PAYS.map((k) => (
                    <button key={k} type="button" onClick={() => setSongPay(s.id, k)}>{PAY_NAME[k]}</button>
                  ))}
                </div>
              )}

              {s.lines.map((l) => {
                const t = lineTotal(l);
                const dcOn = l.dm !== 'off';
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
                        {dcOn && discOf(l) ? ' · 할인 적용' : ''}
                      </span>
                    </div>
                    <div className="n3">
                      <button
                        type="button" className={`hr-qm-dtog${dcOn ? ' on' : ''}`} aria-pressed={dcOn}
                        onClick={() => setLine(s.id, l.id, { dm: dcOn ? 'off' : 'pct' })}
                      >
                        {dcOn ? '항목 할인 끄기' : '항목 할인'}
                      </button>
                      <button
                        type="button" className={`hr-qm-dtog${whoOpen.includes(l.id) || whoText(l) ? ' on' : ''}`}
                        aria-pressed={whoOpen.includes(l.id)} onClick={() => toggleWho(l.id)}
                      >
                        담당자
                      </button>
                      {rushOpts(s.id, l)}
                      {st && (
                        <select
                          className="hr-qm-pay" aria-label="입금 단계" value={l.pay}
                          onChange={(e) => setLine(s.id, l.id, { pay: toPay(e.target.value) })}
                        >
                          {PAYS.map((k) => <option key={k} value={k}>{PAY_NAME[k]}</option>)}
                        </select>
                      )}
                    </div>
                    {dcOn && discPanel(s.id, l)}
                    {whoOpen.includes(l.id) && (
                      <div className="hr-qm-who">
                        <input
                          aria-label="담당자" value={l.who} maxLength={30} placeholder="담당자"
                          onChange={(e) => setLine(s.id, l.id, { who: e.target.value })}
                        />
                        <input
                          aria-label="소속" value={l.org} maxLength={30} placeholder="소속 (회사·크루·팀)"
                          onChange={(e) => setLine(s.id, l.id, { org: e.target.value })}
                        />
                        <button type="button" onClick={() => applyWho(s.id, l)}>이 곡 전체에 적용</button>
                      </div>
                    )}
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
              {st && (
                <select
                  className="hr-qm-pay" aria-label="입금 단계" value={a.pay}
                  onChange={(e) => setAdj(a.id, { pay: toPay(e.target.value) })}
                >
                  {PAYS.map((k) => <option key={k} value={k}>{PAY_NAME[k]}</option>)}
                </select>
              )}
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
        <div className="hr-qm-btns">
          <button type="button" onClick={exportJson}>작업 파일 저장</button>
          <button type="button" onClick={() => fileRef.current?.click()}>불러오기</button>
          <input
            ref={fileRef} type="file" accept="application/json,.json" className="hr-qm-file"
            aria-label="작업 파일 불러오기" onChange={(e) => importJson(e.target.files?.[0])}
          />
        </div>
        {isSt && pending > 0 && (
          <p className="hr-qm-warn" role="status">
            금액이 비어(협의) 있는 항목이 {pending}개 있어요. 명세서에는 확정 금액을 넣어 주세요.
          </p>
        )}
        {msg && <p className="hr-qm-msg" role="status">{msg}</p>}
        {height > 9000 && (
          <p className="hr-qm-msg">이미지가 매우 깁니다. &lsquo;요약&rsquo; 보기를 쓰면 짧아져요.</p>
        )}
        <div className="hr-qm-cvwrap">
          <canvas ref={cvRef} className="hr-qm-cv" aria-label={`${KIND_NAME[doc.kind]} 미리보기`} />
        </div>
      </aside>
    </div>
  );
}
