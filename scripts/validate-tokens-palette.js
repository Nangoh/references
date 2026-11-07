// tokens.css의 --series-1..8 을 라이트/다크 각각 색약 안전성 검증기로 통과시킨다.
// 실패하면 exit 1 → CI가 막는다. (node scripts/validate-tokens-palette.js)
const fs = require('fs'); const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'tokens/tokens.css'), 'utf8');
function block(re) { const m = css.match(re); const o = {}; for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) o[k] = v.trim(); return o; }
const light = block(/:root\s*\{([\s\S]*?)\n\}/);
const dark = block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
const resolve = (t, v) => { let s = v, n = 0; while (/var\(--/.test(s) && n++ < 10) s = s.replace(/var\(--([\w-]+)\)/g, (_, k) => t[k] ?? light[k] ?? ''); return s; };
const series = t => Array.from({ length: 8 }, (_, i) => resolve(t, t[`series-${i + 1}`]));
const run = (mode, t) => new Promise((res) => {
  const surface = resolve(t, t['chart-surface']);
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'validate_palette.js'), series(t).join(','), '--mode', mode, '--surface', surface], { encoding: 'utf8' });
  process.stdout.write(r.stdout + r.stderr); res(r.status);
});
(async () => {
  const a = await run('light', light); const b = await run('dark', { ...light, ...dark });
  if (a || b) { console.error('\n팔레트 검증 실패 — tokens.css의 --series-* 를 고치세요.'); process.exit(1); }
  console.log('\n팔레트 검증 통과 (light + dark).');
})();
