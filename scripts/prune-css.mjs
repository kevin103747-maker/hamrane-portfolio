// scripts/prune-css.mjs — 쓰지 않는 CSS 클래스의 규칙을 안전하게 지웁니다.
// 미리보기: node scripts/prune-css.mjs scripts/dead-classes-a.txt
// 실제 적용: node scripts/prune-css.mjs scripts/dead-classes-a.txt --write
import { readFileSync, writeFileSync } from 'node:fs';

const [, , listPath, flag] = process.argv;
if (!listPath) {
  console.error('사용법: node scripts/prune-css.mjs <클래스목록.txt> [--write]');
  process.exit(1);
}

const CSS_PATH = 'src/app/globals.css';
const dead = new Set(
  readFileSync(listPath, 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim().replace(/^\./, ''))
    .filter(Boolean),
);
const src = readFileSync(CSS_PATH, 'utf8');

let active = new Set();
const removed = [];
const partial = [];
const risky = [];

// 주석·따옴표를 건너뛰며, 괄호 밖에서 stops 중 하나가 처음 나오는 위치를 찾습니다.
function scanTo(s, i, stops) {
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? s.length : e + 1; continue; }
    if (c === '"' || c === "'") { for (i++; i < s.length && s[i] !== c; i++) if (s[i] === '\\') i++; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && stops.includes(c)) return i;
  }
  return -1;
}

// open 위치의 '{' 와 짝이 맞는 '}' 위치를 찾습니다.
function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); i = e < 0 ? s.length : e + 1; continue; }
    if (c === '"' || c === "'") { for (i++; i < s.length && s[i] !== c; i++) if (s[i] === '\\') i++; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

function splitTop(p) {
  const out = [];
  let d = 0;
  let cur = '';
  for (const c of p) {
    if (c === '(' || c === '[') d++;
    else if (c === ')' || c === ']') d--;
    if (c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}

const classesOf = (sel) => {
  const clean = sel.replace(/\[[^\]]*\]/g, '').replace(/"[^"]*"|'[^']*'/g, '');
  return [...clean.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
};

const CONTAINERS = new Set(['media', 'supports', 'layer', 'container']);
const WS = /\s+/y;
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

function prune(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    WS.lastIndex = i;
    const w = WS.exec(s);
    if (w) { out += w[0]; i += w[0].length; continue; }
    if (s.startsWith('/*', i)) {
      const e = s.indexOf('*/', i + 2);
      const end = e < 0 ? s.length : e + 2;
      out += s.slice(i, end);
      i = end;
      continue;
    }

    const stop = scanTo(s, i, '{;}');
    if (stop < 0) { out += s.slice(i); break; }
    if (s[stop] !== '{') { out += s.slice(i, stop + 1); i = stop + 1; continue; }

    const close = matchBrace(s, stop);
    if (close < 0) { out += s.slice(i); break; }
    const end = close + 1;
    const trimmed = s.slice(i, stop).trim();

    if (trimmed.startsWith('@')) {
      const name = (/^@([\w-]+)/.exec(trimmed)?.[1] ?? '').toLowerCase();
      if (CONTAINERS.has(name)) {
        const kept = prune(s.slice(stop + 1, close));
        if (stripComments(kept).trim() === '') removed.push(`${trimmed} { … }  (안의 규칙이 모두 지워져 블록도 제거)`);
        else out += s.slice(i, stop + 1) + kept + '}';
      } else {
        out += s.slice(i, end); // keyframes, theme, font-face 등은 그대로 둡니다.
      }
      i = end;
      continue;
    }

    const sels = splitTop(trimmed).map((x) => x.trim()).filter(Boolean);
    const info = sels.map((sel) => {
      const cls = classesOf(sel);
      return { hit: cls.some((c) => active.has(c)), complex: /:(not|is|where|has)\(/.test(sel) };
    });

    if (info.some((x) => x.hit && x.complex)) {
      risky.push(trimmed);
      out += s.slice(i, end);
    } else if (info.length > 0 && info.every((x) => x.hit)) {
      removed.push(trimmed);
    } else {
      if (info.some((x) => x.hit)) partial.push(trimmed);
      out += s.slice(i, end);
    }
    i = end;
  }
  return out;
}

// 1) 자체 검사: 지울 것이 없을 때 원본과 완전히 같아야 합니다.
if (prune(src) !== src) {
  console.error('✗ 자체 검사 실패: 이 CSS는 스크립트가 정확히 재현하지 못합니다. 아무것도 바꾸지 않았습니다.');
  process.exit(1);
}

// 2) 실제 실행
active = dead;
removed.length = 0; partial.length = 0; risky.length = 0;
const out = prune(src).replace(/\n{3,}/g, '\n\n');

const b0 = Buffer.byteLength(src);
const b1 = Buffer.byteLength(out);
console.log(`\n자체 검사 통과 · 대상 클래스 ${dead.size}개`);
console.log(`지운 규칙 ${removed.length}개 · ${b0.toLocaleString()} → ${b1.toLocaleString()} 바이트 (-${(b0 - b1).toLocaleString()})`);

console.log('\n■ 지운 규칙');
removed.forEach((r) => console.log('  -', r.replace(/\s+/g, ' ').slice(0, 110)));

console.log(`\n■ 일부 선택자만 해당해서 그대로 둔 규칙 (${partial.length}개) — 손으로 확인`);
partial.forEach((r) => console.log('  ?', r.replace(/\s+/g, ' ').slice(0, 110)));

console.log(`\n■ :not/:is/:where/:has 때문에 건드리지 않은 규칙 (${risky.length}개)`);
risky.forEach((r) => console.log('  !', r.replace(/\s+/g, ' ').slice(0, 110)));

if (flag === '--write') {
  writeFileSync(CSS_PATH, out);
  console.log('\n✓ globals.css에 적용했습니다. (되돌리기: git checkout src/app/globals.css)');
} else {
  console.log('\n(미리보기입니다. 파일은 바뀌지 않았습니다. 적용하려면 맨 뒤에 --write)');
}
