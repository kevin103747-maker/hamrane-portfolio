// scripts/split-admin-css.mjs
// 미리보기: node scripts/split-admin-css.mjs > split-preview.txt
// 실제 분리: node scripts/split-admin-css.mjs --write
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';

const SRC = 'src';
const CSS = 'src/app/globals.css';
const OUT = 'src/app/hr-admin/admin.css';
const WRITE = process.argv.includes('--write');

const isAdminPath = (p) => /admin/i.test(p.split(path.sep).join('/'));

function walk(dir, list = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, list);
    else if (/\.(tsx?|jsx?|mjs|mdx|html)$/.test(e.name)) list.push(p);
  }
  return list;
}

// 소스 파일 안의 단어를 모아 둔다. 'hr-st-${state}' 같은 동적 이름은 'hr-st-' 접두사로 기억한다.
function collect(list) {
  const tokens = new Set();
  const prefixes = new Set();
  for (const f of list) {
    const text = fs.readFileSync(f, 'utf8');
    for (const t of text.match(/[A-Za-z0-9_-]+/g) || []) {
      tokens.add(t);
      if (t.endsWith('-') && t.length >= 3) prefixes.add(t);
    }
  }
  return { tokens, prefixes };
}

const all = walk(SRC);
const pub = collect(all.filter((f) => !isAdminPath(f)));
const adm = collect(all.filter((f) => isAdminPath(f)));
const has = (s, c) => s.tokens.has(c) || [...s.prefixes].some((p) => c.startsWith(p));

function classesOf(sel) {
  const clean = sel.replace(/:(not|has|is|where)\([^)]*\)/g, '');
  return [...clean.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

// 'keep'(사용자 파일에 남김) | 'admin'(관리자 파일로 이동) | 'dead'(어디서도 안 쓰임)
function decide(rule) {
  if (rule.some((n) => n.type === 'atrule' && n.name === 'apply')) return 'keep';
  let anyAdmin = false;
  for (const s of rule.selectors) {
    const cs = classesOf(s);
    if (!cs.length) return 'keep';
    const notPublic = cs.filter((c) => !has(pub, c));
    if (!notPublic.length) return 'keep';
    if (notPublic.some((c) => has(adm, c))) anyAdmin = true;
  }
  return anyAdmin ? 'admin' : 'dead';
}

const root = postcss.parse(fs.readFileSync(CSS, 'utf8'), { from: CSS });
const items = [];
root.walkRules((rule) => {
  const p = rule.parent;
  const top = p.type === 'root';
  const okAt =
    p.type === 'atrule' && p.parent.type === 'root' && /^(media|supports|layer)$/.test(p.name);
  if (!top && !okAt) return;
  items.push({ rule, label: decide(rule) });
});

const adminItems = items.filter((i) => i.label === 'admin');
const deadItems = items.filter((i) => i.label === 'dead');
const short = (s) => s.replace(/\s+/g, ' ').slice(0, 70);

console.log(`검사한 규칙 ${items.length}개`);
console.log(`  관리자 전용(admin.css로 이동): ${adminItems.length}개`);
console.log(`  어디서도 안 쓰임(삭제 후보):   ${deadItems.length}개`);
console.log(`  사용자 파일에 남김:            ${items.length - adminItems.length - deadItems.length}개`);
console.log(`  (관리자 파일로 판단한 소스 ${all.filter(isAdminPath).length}개 / 사용자 파일 ${all.filter((f) => !isAdminPath(f)).length}개)`);

console.log('\n=== 이동 대상 ===');
for (const i of adminItems) console.log(`${String(i.rule.source.start.line).padStart(5)}| ${short(i.rule.selector)}`);
console.log('\n=== 삭제 후보 (동적으로 만든 클래스명이면 오탐일 수 있음) ===');
for (const i of deadItems) console.log(`${String(i.rule.source.start.line).padStart(5)}| ${short(i.rule.selector)}`);

if (WRITE) {
  const out = postcss.root();
  let lastParent = null;
  let wrapper = null;
  for (const { rule } of adminItems) {
    const p = rule.parent;
    const copy = rule.clone();
    if (p.type === 'root') {
      out.append(copy);
      lastParent = null;
    } else {
      if (lastParent !== p) {
        wrapper = postcss.atRule({ name: p.name, params: p.params });
        wrapper.raws.between = ' ';
        out.append(wrapper);
        lastParent = p;
      }
      wrapper.append(copy);
    }
  }
  for (const { rule } of adminItems) rule.remove();
  root.walkAtRules(/^(media|supports|layer)$/, (a) => {
    if (a.nodes && a.nodes.length === 0) a.remove();
  });
  const header = '/* src/app/hr-admin/admin.css — 관리자 페이지 전용 스타일 (globals.css에서 분리) */\n\n';
  fs.writeFileSync(OUT, header + out.toString().trim() + '\n');
  fs.writeFileSync(CSS, root.toString());
  console.log(`\n저장 완료: ${CSS} ${root.toString().split('\n').length}줄, ${OUT} ${out.toString().split('\n').length}줄`);
}
