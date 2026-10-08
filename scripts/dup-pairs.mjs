// scripts/dup-pairs.mjs — node scripts/dup-pairs.mjs > dup-pairs.txt
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const FILE = 'src/app/globals.css';
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// start(1부터 센 줄 번호)에서 시작하는 규칙 한 개를 중괄호 짝에 맞춰 잘라냄
function block(start) {
  let depth = 0;
  let seen = false;
  const out = [];
  for (let i = start - 1; i < lines.length; i++) {
    out.push(`${String(i + 1).padStart(5)}| ${lines[i]}`);
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; seen = true; }
      else if (ch === '}') depth--;
    }
    if (seen && depth <= 0) break;
    if (out.length >= 40) { out.push('     | ...(40줄 초과, 생략)'); break; }
  }
  return out.join('\n');
}

const r = spawnSync('npx', ['stylelint', FILE, '-f', 'json'], { encoding: 'utf8' });
const raw = `${r.stdout || ''}${r.stderr || ''}`;
const json = JSON.parse(raw.slice(raw.indexOf('[')));
const warnings = json[0].warnings.filter((w) => w.rule === 'no-duplicate-selectors');

for (const w of warnings) {
  const m = w.text.match(/first used at line (\d+)/);
  if (!m) continue;
  console.log(`\n######## ${w.text}`);
  console.log('--- 먼저 나온 규칙 ---');
  console.log(block(Number(m[1])));
  console.log('--- 나중에 나온 규칙 (이쪽이 이김) ---');
  console.log(block(w.line));
}
