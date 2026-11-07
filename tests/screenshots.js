// 예시 페이지 전부를 라이트/다크 × 데스크톱/모바일로 렌더링해
// 콘솔 에러·가로 스크롤을 잡고 스크린샷을 tests/__screens__/ 에 남긴다.
// 사용: npm run vendor && node tests/screenshots.js   (playwright 필요: npm i -D playwright && npx playwright install chromium)
const path = require('path'); const fs = require('fs'); const http = require('http');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..'); const port = 4174;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.csv': 'text/csv', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.map': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
const PAGES = ['index', 'showcase', 'charts', 'dashboard', 'explorer', 'drilldown'].filter(p => fs.existsSync(path.join(root, 'examples', p + '.html')));
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, mobile: { width: 400, height: 800 } };
const ALLOW = [/favicon/i, /fonts\.g(oogleapis|static)\.com/i, /ERR_INTERNET_DISCONNECTED/];
(async () => {
  await new Promise(r => server.listen(port, r));
  const out = path.join(__dirname, '__screens__'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(); let failures = 0;
  for (const page of PAGES) for (const theme of ['light', 'dark']) for (const [vp, size] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({ viewport: size, colorScheme: theme, deviceScaleFactor: 1 });
    const pg = await ctx.newPage(); const errors = [];
    pg.on('console', m => { if (m.type() === 'error' && !ALLOW.some(a => a.test(m.text()))) errors.push(m.text()); });
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    pg.on('requestfailed', r => { if (!ALLOW.some(a => a.test(r.url()))) errors.push('requestfailed: ' + r.url()); });
    await pg.addInitScript(t => { try { localStorage.setItem('ds-theme', t); } catch {} document.documentElement.setAttribute('data-theme', t); }, theme);
    try { await pg.goto(`http://localhost:${port}/examples/${page}.html`, { waitUntil: 'networkidle', timeout: 60000 }); } catch (e) { errors.push('goto: ' + e.message); }
    await pg.waitForTimeout(page === 'explorer' ? 4000 : 800);
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const file = path.join(out, `${page}-${theme}-${vp}.png`);
    await pg.screenshot({ path: file, fullPage: vp === 'desktop' });
    const bad = errors.length || overflow;
    if (bad) failures++;
    console.log(`${bad ? 'FAIL' : ' ok '} ${page.padEnd(10)} ${theme.padEnd(5)} ${vp.padEnd(7)} ${overflow ? 'HORIZONTAL-OVERFLOW ' : ''}${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(failures ? `\n${failures}개 조합 실패` : '\n모든 페이지 통과');
  process.exit(failures ? 1 : 0);
})();
