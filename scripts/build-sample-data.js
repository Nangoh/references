// examples/data/sales.csv -> examples/data/sales.js  (file:// 에서도 예시가 돌도록 CSV를 JS 전역으로 포장)
// 실행: node scripts/build-sample-data.js
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const csv = fs.readFileSync(path.join(root, 'examples/data/sales.csv'), 'utf8');
const js = '/* 자동 생성: node scripts/build-sample-data.js — 손으로 수정 금지 */\nwindow.SALES_CSV = ' + JSON.stringify(csv) + ';\n';
fs.writeFileSync(path.join(root, 'examples/data/sales.js'), js);
console.log('examples/data/sales.js', (js.length / 1024).toFixed(0) + 'KB');
