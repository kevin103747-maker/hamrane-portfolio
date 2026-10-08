// scripts/remove-classes.mjs
// 미리보기: node scripts/remove-classes.mjs
// 실제 삭제: node scripts/remove-classes.mjs --write
import fs from 'node:fs';
import postcss from 'postcss';

const CSS = 'src/app/globals.css';
const WRITE = process.argv.includes('--write');

// 코드에서 안 쓰이는 것으로 확인된 클래스만 적습니다.
const TARGETS = new Set([
  'hr-gd-steps', 'hr-gd-no', 'hr-gd-faq',
  'hr-faq-list', 'hr-faq-steps',
  'hr-tg', 'hr-tg-t', 'hr-tg-s', 'hr-tg-n', 'hr-tg-act',
  'hr-tl', 'hr-dc', 'hr-dc-i',
  'hr-pm-rows', 'hr-pm-g',
  'hr-pt-end', 'hr-pr-first',
]);

const hit = (sel) =>
  [...sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].some((m) => TARGETS.has(m[1]));

const root = postcss.parse(fs.readFileSync(CSS, 'utf8'), { from: CSS });
const log = [];

root.walkRules((rule) => {
  const p = rule.parent;
  if (p.type === 'atrule' && /keyframes/i.test(p.name)) return;
  const keep = rule.selectors.filter((s) => !hit(s));
  if (keep.length === rule.selectors.length) return;
  const where = p.type === 'atrule' ? `@${p.name} ` : '';
  log.push(`${String(rule.source.start.line).padStart(5)}| ${where}${rule.selector.replace(/\s+/g, ' ').slice(0, 80)}`);
  if (keep.length === 0) rule.remove();
  else rule.selectors = keep;
});

root.walkAtRules(/^(media|supports|layer)$/, (a) => {
  if (a.nodes && a.nodes.length === 0) a.remove();
});

console.log(`삭제 대상 규칙 ${log.length}개`);
console.log(log.join('\n'));

if (WRITE) {
  fs.writeFileSync(CSS, root.toString());
  console.log(`\n저장 완료: ${root.toString().split('\n').length}줄`);
}
