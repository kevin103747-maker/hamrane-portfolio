// scripts/css-audit.mjs — node scripts/css-audit.mjs > css-audit.txt
import fs from 'node:fs';
import path from 'node:path';

const CSS = 'src/app/globals.css';
const ADMIN = /[\\/]admin[\\/]|[\\/]\(admin\)[\\/]/; // 관리자 폴더 경로. 프로젝트에 맞게 고치세요

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.(tsx?|jsx?)$/.test(d.name) ? [p] : [];
  });
const files = walk('src').map((p) => ({ p, text: fs.readFileSync(p, 'utf8') }));

const css = fs.readFileSync(CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const classes = [...new Set([...css.matchAll(/\.([_a-zA-Z][\w-]*)/g)].map((m) => m[1]))];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const usedIn = (cls) =>
  files.filter(({ text }) => {
    if (new RegExp(`(^|[^\\w-])${esc(cls)}($|[^\\w-])`).test(text)) return true;
    // hr-st-${state} 처럼 이름 앞부분만 코드에 있는 동적 클래스도 사용 중으로 봅니다
    for (let i = cls.indexOf('-'); i !== -1; i = cls.indexOf('-', i + 1)) {
      if (text.includes(cls.slice(0, i + 1) + '${')) return true;
    }
    return false;
  });

const unused = [];
const adminOnly = [];
for (const c of classes) {
  const hits = usedIn(c);
  if (!hits.length) unused.push(c);
  else if (hits.every((h) => ADMIN.test(h.p))) adminOnly.push(c);
}

console.log(`클래스 ${classes.length}개 검사\n`);
console.log(`[코드에서 못 찾은 후보 ${unused.length}개]\n${unused.join('\n')}\n`);
console.log(`[관리자에서만 쓰는 클래스 ${adminOnly.length}개]\n${adminOnly.join('\n')}`);
