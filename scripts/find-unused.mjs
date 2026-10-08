// scripts/find-unused.mjs — 쓰이지 않는 파일 · export · CSS 클래스를 찾아 보여줍니다. (읽기 전용)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';

const SRC = resolve('src');
const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const rel = (f) => relative(process.cwd(), f).replaceAll('\\', '/');

const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (text.has(c)) return c;
  }
  return null;
}

// Next.js가 스스로 불러오는 파일들 = 출발점
const SPECIAL = new Set([
  'page', 'layout', 'error', 'global-error', 'not-found', 'loading', 'template', 'default', 'route',
  'opengraph-image', 'twitter-image', 'icon', 'apple-icon', 'robots', 'sitemap', 'manifest',
]);
const isRoot = (f) => {
  const name = basename(f).replace(/\.(ts|tsx)$/, '');
  const inApp = f.startsWith(join(SRC, 'app'));
  return (inApp && SPECIAL.has(name)) || (dirname(f) === SRC && ['middleware', 'proxy', 'instrumentation'].includes(name));
};

// ── 1) 어디서도 import되지 않는 파일
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
const roots = files.filter(isRoot);
const seen = new Set(roots);
const queue = [...roots];
while (queue.length) {
  const f = queue.pop();
  for (const m of text.get(f).matchAll(IMPORT)) {
    const t = resolveImport(f, m[1]);
    if (t && !seen.has(t)) { seen.add(t); queue.push(t); }
  }
}
const orphans = files.filter((f) => !seen.has(f));
console.log(`\n■ 1. 어디서도 불러오지 않는 파일 (${orphans.length}개)`);
orphans.forEach((f) => console.log('  ', rel(f)));

// ── 2) 선언만 있고 다른 파일에서 쓰이지 않는 export
const EXPORT = /export\s+(?:async\s+)?(?:const|let|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
const unusedExports = [];
for (const f of seen) {
  if (isRoot(f)) continue; // page/layout 등의 metadata 같은 특수 export는 제외
  for (const m of text.get(f).matchAll(EXPORT)) {
    const re = new RegExp(`\\b${m[1].replace(/\$/g, '\\$')}\\b`);
    const used = [...text].some(([g, t]) => g !== f && re.test(t));
    if (!used) unusedExports.push(`${rel(f)}  →  ${m[1]}`);
  }
}
console.log(`\n■ 2. 다른 파일에서 쓰이지 않는 export (${unusedExports.length}개)`);
unusedExports.forEach((x) => console.log('  ', x));

// ── 3) 어떤 코드에도 나오지 않는 CSS 클래스
const cssPath = join(SRC, 'app', 'globals.css');
const blank = (m) => m.replace(/[^\n]/g, ' '); // 줄 번호를 유지한 채 지움
const css = readFileSync(cssPath, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .replace(/url\([^)]*\)/g, blank);
const allCode = [...text.values()].join('\n');
const classes = new Map();
css.split('\n').forEach((line, i) => {
  for (const m of line.matchAll(/(?<![\w)\]-])\.([a-zA-Z_][\w-]*)/g)) {
    if (!classes.has(m[1])) classes.set(m[1], i + 1);
  }
});
const deadCss = [...classes].filter(([c]) => {
  const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp(`(?<![\\w-])${esc}(?![\\w-])`).test(allCode);
});
console.log(`\n■ 3. 코드에 나오지 않는 CSS 클래스 (${deadCss.length}개 / 전체 ${classes.size}개)`);
console.log('   (class="a-${x}" 처럼 이름을 조립해 쓰는 곳은 잘못 걸릴 수 있으니 반드시 확인 후 삭제)');
deadCss.forEach(([c, line]) => console.log(`   L${line}  .${c}`));
console.log('');
