#!/usr/bin/env node
/**
 * 정적 서버 (의존성 없음):  node scripts/serve.js [port]   → http://localhost:4173/
 * 예시 페이지 중 explorer/drilldown 은 wasm·Web Worker·ESM 을 쓰므로 file:// 로는 열리지 않는다.
 * 사내 배포 시에는 아무 정적 호스팅(Nginx, S3, GitHub Pages)이면 된다 — 특별한 헤더 불필요.
 */
const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.map': 'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 ' + p); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size, 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, () => console.log(`serving ${root} at http://localhost:${port}/  (예: /examples/explorer.html)`));
