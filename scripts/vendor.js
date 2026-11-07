#!/usr/bin/env node
/**
 * node_modules → vendor/  복사 (npm run vendor)
 * 예시 페이지는 CDN 대신 vendor/ 를 참조한다 (사내망·오프라인 동작).
 * vendor/ 는 .gitignore 대상이며, CI(Pages 배포)에서도 이 스크립트를 실행한다.
 *
 * Mosaic(vgplot)은 ESM 소스만 배포되어(bare import) 정적 서버에서 바로 못 쓰므로
 * esbuild로 단일 번들(vendor/mosaic/mosaic.mjs)을 만든다. DuckDB-WASM 도 같은 번들에서
 * export 하여 탐색기와 Mosaic 이 같은 DuckDB 인스턴스를 공유한다.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const nm = path.join(root, 'node_modules');
const out = path.join(root, 'vendor');

const FILES = [
  // [node_modules 상대경로, vendor 상대경로]
  ['echarts/dist/echarts.min.js', 'echarts/echarts.min.js'],
  ['ag-grid-community/dist/ag-grid-community.min.js', 'ag-grid/ag-grid-community.min.js'],
  ['ag-grid-community/styles/ag-grid.css', 'ag-grid/styles/ag-grid.css'],          // 레거시 CSS 테마 사용자용
  ['ag-grid-community/styles/ag-theme-quartz.css', 'ag-grid/styles/ag-theme-quartz.css'],
  ['vega/build/vega.min.js', 'vega/vega.min.js'],
  ['vega-lite/build/vega-lite.min.js', 'vega/vega-lite.min.js'],
  ['vega-embed/build/vega-embed.min.js', 'vega/vega-embed.min.js'],
  // DuckDB-WASM: 워커 + wasm (mvp / eh 두 번들). 번들 선택은 duckdb.selectBundle 이 한다.
  ['@duckdb/duckdb-wasm/dist/duckdb-browser.mjs', 'duckdb/duckdb-browser.mjs'],   // 참고용(bare import 'apache-arrow' 포함 → importmap 필요)
  ['@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm', 'duckdb/duckdb-mvp.wasm'],
  ['@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js', 'duckdb/duckdb-browser-mvp.worker.js'],
  ['@duckdb/duckdb-wasm/dist/duckdb-eh.wasm', 'duckdb/duckdb-eh.wasm'],
  ['@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', 'duckdb/duckdb-browser-eh.worker.js'],
];
const DIRS = [
  // Perspective: cdn/*.js 가 ../wasm/*.wasm 을 상대참조하므로 dist 구조를 그대로 유지
  ['@finos/perspective/dist/cdn', 'perspective/perspective/dist/cdn'],
  ['@finos/perspective/dist/wasm', 'perspective/perspective/dist/wasm'],
  ['@finos/perspective-viewer/dist/cdn', 'perspective/perspective-viewer/dist/cdn'],
  ['@finos/perspective-viewer/dist/wasm', 'perspective/perspective-viewer/dist/wasm'],
  ['@finos/perspective-viewer/dist/css', 'perspective/perspective-viewer/dist/css'],
  ['@finos/perspective-viewer-datagrid/dist/cdn', 'perspective/perspective-viewer-datagrid/dist/cdn'],
  ['@finos/perspective-viewer-d3fc/dist/cdn', 'perspective/perspective-viewer-d3fc/dist/cdn'],
];

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.endsWith('.map') || e.name.endsWith('.d.ts')) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : copyFile(s, d);
  }
}

let n = 0, bytes = 0;
for (const [s, d] of FILES) {
  const src = path.join(nm, s);
  if (!fs.existsSync(src)) { console.warn('  !! 없음:', s); continue; }
  copyFile(src, path.join(out, d)); n++; bytes += fs.statSync(src).size;
  console.log('  ', s, '→ vendor/' + d);
}
for (const [s, d] of DIRS) {
  const src = path.join(nm, s);
  if (!fs.existsSync(src)) { console.warn('  !! 없음:', s); continue; }
  copyDir(src, path.join(out, d)); n++;
  console.log('  ', s + '/ → vendor/' + d + '/');
}

// Mosaic + DuckDB-WASM 단일 ESM 번들
(async () => {
  let esbuild;
  try { esbuild = require('esbuild'); } catch { console.warn('  !! esbuild 없음 — vendor/mosaic 번들 생략 (npm i -D esbuild)'); return; }
  const entry = path.join(root, 'scripts/mosaic-entry.mjs');
  await esbuild.build({
    entryPoints: [entry],
    bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
    outfile: path.join(out, 'mosaic/mosaic.mjs'),
    minify: true, sourcemap: false, legalComments: 'none',
    logLevel: 'warning',
  });
  const sz = fs.statSync(path.join(out, 'mosaic/mosaic.mjs')).size;
  console.log(`   @uwdata/vgplot + @duckdb/duckdb-wasm → vendor/mosaic/mosaic.mjs (${(sz / 1024).toFixed(0)} KB)`);
  console.log(`vendor 완료: ${n} 항목`);
})().catch(e => { console.error(e); process.exit(1); });
