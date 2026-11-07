// tokens/tokens.css -> tokens/tokens.json  (node scripts/build-tokens-json.js)
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'tokens/tokens.css'), 'utf8');
function block(re) { const m = css.match(re); if (!m) return {}; const o = {}; for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) o[k] = v.trim(); return o; }
const light = block(/:root\s*\{([\s\S]*?)\n\}/);
const dark = block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
const out = { "$schema": "tokens.json — tokens.css에서 생성(scripts/build-tokens-json.js). 손으로 수정 금지.", light, dark };
fs.writeFileSync(path.join(root, 'tokens/tokens.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`tokens.json: light ${Object.keys(light).length}, dark ${Object.keys(dark).length}`);
