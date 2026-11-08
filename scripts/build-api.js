// api/ 생성 — 정적 "API": 스크립트·에이전트·LLM 이 URL 로 디자인 시스템을 받아가게 한다.
//   node scripts/build-api.js [--base https://nangoh.github.io/references/]
// 결과 (GitHub Pages 에 그대로 올라간다):
//   api/manifest.json   파일 목록(경로, URL, 크기, sha256), 버전, 커밋, 설치 명령, CDN 주소
//   api/charts.json     차트 카탈로그: 종류별 언제 쓰나 / 옵션 / 호출 예 / 예시 페이지
//   api/components.json ds.css 의 클래스 목록 (블록별)
//   api/tokens.json     tokens/tokens.json 복사
//   api/prompt.txt, api/prompt-short.txt, api/agents.md
//   api/dist/ds.css     tokens.css + ds.css 한 파일
//   api/dist/ds.js      ds-theme.js + ds-charts.js + ds-prompt.js 한 파일
//   api/install.sh      필요한 파일을 curl 로 받아오는 설치 스크립트
const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const cp = require('child_process');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const bi = process.argv.indexOf('--base');
const argBase = (process.argv.find(a => a.startsWith('--base=')) || '').slice(7) || (bi > -1 ? process.argv[bi + 1] : '');
const BASE = (argBase || pkg.homepage || 'https://nangoh.github.io/references/').replace(/\/?$/, '/');
const REPO = 'Nangoh/references';
let commit = 'unknown'; try { commit = cp.execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { /* no git */ }
const out = path.join(root, 'api'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'dist'), { recursive: true });
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => { fs.mkdirSync(path.dirname(path.join(out, p)), { recursive: true }); fs.writeFileSync(path.join(out, p), s); };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

/* ---------- 파일 목록 ---------- */
const CORE = ['tokens/tokens.css', 'tokens/tokens.json', 'css/ds.css', 'js/ds-theme.js', 'js/ds-charts.js', 'js/ds-prompt.js'];
const INTEGRATIONS = ['integrations/echarts-theme.js', 'integrations/echarts-theme.light.json', 'integrations/echarts-theme.dark.json', 'integrations/vega-config.js', 'integrations/vega-config.light.json', 'integrations/vega-config.dark.json', 'integrations/ag-grid-theme.js', 'integrations/ag-grid-theme.css', 'integrations/perspective-theme.css', 'integrations/vgplot-theme.css', 'integrations/mosaic-setup.js'];
const DOCS = ['AGENTS.md', 'README.md', 'prompts/system-prompt.md', 'prompts/system-prompt-short.md', ...fs.readdirSync(path.join(root, 'docs')).filter(f => f.endsWith('.md')).map(f => 'docs/' + f)];
const EXAMPLES = fs.readdirSync(path.join(root, 'examples')).filter(f => f.endsWith('.html')).map(f => 'examples/' + f).concat(['examples/js/sales.js', 'examples/data/sales.csv']);
const fileEntry = (p, group) => { const buf = fs.readFileSync(path.join(root, p)); return { path: p, group, url: BASE + p, raw: `https://raw.githubusercontent.com/${REPO}/main/${p}`, cdn: `https://cdn.jsdelivr.net/gh/${REPO}@main/${p}`, bytes: buf.length, sha256: sha(buf) }; };
const files = [...CORE.map(p => fileEntry(p, 'core')), ...INTEGRATIONS.filter(p => fs.existsSync(path.join(root, p))).map(p => fileEntry(p, 'integration')), ...DOCS.map(p => fileEntry(p, 'docs')), ...EXAMPLES.filter(p => fs.existsSync(path.join(root, p))).map(p => fileEntry(p, 'example'))];

/* ---------- 번들 ---------- */
const banner = (what) => `/* references design system — ${what} — v${pkg.version} (${commit}) — ${REPO} — 생성 파일, 직접 수정 금지 */\n`;
const cssBundle = banner('tokens + components') + read('tokens/tokens.css') + '\n\n' + read('css/ds.css');
const jsBundle = banner('theme + charts + prompt') + ['js/ds-theme.js', 'js/ds-charts.js', 'js/ds-prompt.js'].map(p => `\n/* ===== ${p} ===== */\n` + read(p)).join('\n');
write('dist/ds.css', cssBundle); write('dist/ds.js', jsBundle);

/* ---------- 설치 스크립트 ---------- */
const install = `#!/bin/sh
# references 디자인 시스템 파일 받기
#   curl -fsSL ${BASE}api/install.sh | sh -s -- ./public/ds
# 인자: 받을 디렉터리 (기본 ./ds). 환경변수 DS_BASE 로 다른 서버(사내 미러) 지정 가능.
set -e
DEST="\${1:-./ds}"; BASE="\${DS_BASE:-${BASE}}"
mkdir -p "$DEST/tokens" "$DEST/css" "$DEST/js" "$DEST/integrations"
for f in ${[...CORE, 'integrations/echarts-theme.js', 'integrations/ag-grid-theme.js', 'integrations/ag-grid-theme.css', 'integrations/perspective-theme.css', 'AGENTS.md'].join(' ')}; do
  echo "  $f"; curl -fsSL "$BASE$f" -o "$DEST/$f"
done
echo "완료: $DEST  (HTML 에서 <link rel=stylesheet href=\\"$DEST/tokens/tokens.css\\"> <link rel=stylesheet href=\\"$DEST/css/ds.css\\"> <script src=\\"$DEST/js/ds-theme.js\\"></script> <script src=\\"$DEST/js/ds-charts.js\\"></script>)"
`;
write('install.sh', install);

/* ---------- 차트 카탈로그 ---------- */
const ex = p => BASE + 'examples/' + p;
const common = { title: 'string — 카드 제목(단위 포함: "매출(백만원)")', subtitle: 'string', format: "'number'|'integer'|'currency'|'compact-krw'|'percent'|'percent-point'|function", tableView: 'boolean (기본 true) — 표로 보기 쌍둥이', legend: 'boolean — 시리즈 2개 이상이면 자동', height: 'number(px)', onSelect: '(rows)=>void — 클릭 마킹 콜백 (Shift 로 추가)' };
const charts = [
  { kind: 'stat', label: 'KPI 타일', when: '현재 값 하나(+전기 대비 증감, 추세). 막대 1개짜리 차트 대신.', call: 'DSCharts.stat(el, opts)', options: { label: 'string', value: 'number', format: common.format, delta: 'number — 증감(%p 또는 %)', deltaLabel: "string — '전월 대비'", upIsGood: 'boolean (기본 true)', trend: 'number[] — 12점 스파크라인', hero: 'boolean — 화면당 1개 대표 숫자', compact: 'boolean' }, example: "DSCharts.stat(el, { label: '이번 달 매출', value: 128400000, format: 'compact-krw', delta: 6.2, deltaLabel: '전월 대비', trend: [3,4,4,5,6,5,7,8,8,9,10,11] });", examplePage: ex('charts.html#k1') },
  { kind: 'line', label: '선 차트', when: '시간에 따른 변화. 단일 시리즈면 area:true 가능. 시리즈 최대 8.', call: 'DSCharts.line(el, opts)', options: { data: 'object[]', x: 'string — 시간/범주 필드', y: 'string|string[] — 값 필드(들)', area: 'boolean', markers: "'auto'|'always'|'none'", emphasis: 'string — 강조할 시리즈명(나머지 회색)', xLabel: 'string', yLabel: 'string', ...common }, example: "DSCharts.line(el, { data: rows, x: 'month', y: ['매장','온라인','B2B'], title: '채널별 월 매출', format: 'compact-krw' });", examplePage: ex('charts.html#c-channel-month') },
  { kind: 'bar', label: '막대 차트', when: '범주 간 크기 비교(세로), 순위·긴 이름(가로 horizontal:true), 여러 시리즈(series 필드 + stacked).', call: 'DSCharts.bar(el, opts)', options: { data: 'object[] (long 형식이면 series 지정)', x: 'string', y: 'string|string[]', series: 'string — long 형식의 시리즈 필드', seriesOrder: 'string[] — 색 고정 순서', stacked: 'boolean', horizontal: 'boolean', sort: "'asc'|'desc'|null", limit: 'number — 상위 N', labels: "'auto'|'none'|'all-ends'", emphasis: 'string', xLabel: 'string', yLabel: 'string', ...common }, example: "DSCharts.bar(el, { data: rows, x: 'branch', y: 'revenue', horizontal: true, sort: 'desc', limit: 10, title: '지점 Top 10', format: 'compact-krw' });", examplePage: ex('charts.html#c-top10') },
  { kind: 'segmented', label: '분할 막대 (파이 대신)', when: '하나의 전체를 ≤6 부분으로. thin 은 표/목록 옆에 글자 없이, tall 은 단독 카드에 비중 인쇄.', call: 'DSCharts.segmented(el, opts)', options: { parts: '{name, value}[]', size: "'thin'|'tall'|'dense'", legend: 'boolean', title: common.title, format: common.format, tableView: common.tableView }, example: "DSCharts.segmented(el, { parts: [{ name: '매장', value: 112 }, { name: '온라인', value: 64 }, { name: 'B2B', value: 49 }], size: 'tall', title: '채널 구성', format: 'compact-krw' });", examplePage: ex('charts.html#c-seg-tall') },
  { kind: 'heatmap', label: '히트맵', when: '격자(범주 × 범주)의 크기. 틸 한 색 램프.', call: 'DSCharts.heatmap(el, opts)', options: { data: 'object[]', x: 'string', y: 'string', value: 'string', valueLabel: 'string', xOrder: 'string[]', yOrder: 'string[]', cell: 'number(px)', ...common }, example: "DSCharts.heatmap(el, { data: rows, x: 'month', y: 'region', value: 'revenue', title: '지역 × 월 매출', format: 'compact-krw' });", examplePage: ex('charts.html#c-heat') },
  { kind: 'diverging', label: '발산형 막대', when: '기준선 위/아래, 목표 대비 증감(+/−).', call: 'DSCharts.diverging(el, opts)', options: { data: 'object[]', x: 'string', y: 'string — 부호 있는 값', sort: "'asc'|'desc'|null", ...common }, example: "DSCharts.diverging(el, { data: rows, x: 'region', y: 'yoy', title: '지역별 전년 대비', format: 'percent' });", examplePage: ex('charts.html#c-div') },
  { kind: 'sparkline', label: '스파크라인', when: '표 셀이나 타일 안의 작은 추세선. 축·범례 없음.', call: 'DSCharts.sparkline(el, opts)', options: { values: 'number[]', width: 'number', height: 'number' }, example: 'DSCharts.sparkline(el, { values: [3,4,4,5,6,5,7,8] });', examplePage: ex('charts.html#k1') },
  { kind: 'echarts-treemap', label: '트리맵 드릴다운 (ECharts)', when: '계층(지역›지점›제품) 비중과 드릴. DSCharts 에 없는 형태는 ECharts + ds 테마.', call: "DSEchartsTheme.bind(echarts, el, () => option)", options: { 'integrations/echarts-theme.js': '색·글꼴·격자·툴팁을 토큰에서 읽어 테마 \'ds\' 등록, 테마 토글 시 자동 재구성', vendor: 'vendor/echarts/echarts.min.js (npm run vendor) 또는 CDN' }, example: "DSEchartsTheme.bind(echarts, el, () => ({ series: [{ type: 'treemap', data: tree(rows), leafDepth: 1, nodeClick: 'zoomToNode' }] }));", examplePage: ex('drilldown.html') },
  { kind: 'echarts-drill-bar', label: '막대 수동 드릴다운 (ECharts + 상태머신)', when: '클릭 → 다음 계층, 브레드크럼/드릴업, URL 해시 저장. 가장 많이 쓰는 패턴.', call: 'LEVELS[] + path[] + rowsAt() + DSEchartsTheme.bind(...)', options: { LEVELS: "string[] — ['region','branch','product']", path: 'string[] — 현재 경로' }, example: '예시 페이지의 "프롬프트" 버튼이 전체 템플릿을 준다.', examplePage: ex('drilldown.html#c-bar') },
];
const rules = ['색 옵션(color:)을 직접 넘기지 않는다 — 토큰이 처리', '파이·도넛·이중 y축 금지', '시리즈 최대 8, 9번째는 "기타"', '상태색(ok/warn/danger)을 시리즈 색으로 쓰지 않는다', '모든 값은 표 뷰(tableView) 또는 직접 라벨로도 닿아야 한다', '라이트/다크 둘 다 확인'];
write('charts.json', JSON.stringify({ name: 'references', version: pkg.version, commit, base: BASE, library: BASE + 'js/ds-charts.js', bundle: BASE + 'api/dist/ds.js', rules, charts, promptButton: '예시 페이지의 각 차트 오른쪽 위 "프롬프트" 버튼이 사양+코드+규칙을 복사해 준다 (js/ds-prompt.js)' }, null, 2) + '\n');

/* ---------- 컴포넌트 클래스 목록 ---------- */
const css = read('css/ds.css');
const classes = Array.from(new Set((css.match(/\.ds-[a-z0-9_-]+/gi) || []).map(c => c.slice(1)))).sort();
const byBlock = {}; classes.forEach(c => { const b = c.split('__')[0].split('--')[0]; (byBlock[b] = byBlock[b] || []).push(c); });
write('components.json', JSON.stringify({ version: pkg.version, commit, stylesheet: BASE + 'css/ds.css', bundle: BASE + 'api/dist/ds.css', count: classes.length, blocks: byBlock, docs: BASE + 'docs/05-components.md', showcase: ex('showcase.html') }, null, 2) + '\n');

/* ---------- 토큰 / 프롬프트 ---------- */
write('tokens.json', read('tokens/tokens.json'));
write('prompt.txt', read('prompts/system-prompt.md'));
write('prompt-short.txt', read('prompts/system-prompt-short.md'));
write('agents.md', read('AGENTS.md'));

/* ---------- llms.txt (LLM 이 사이트를 읽는 관례적 진입점; Pages 루트에도 복사된다) ---------- */
const llms = `# references — 사내 디자인 시스템 + 차트 레퍼런스

> 모든 사내 시스템 UI 를 통일하는 디자인 시스템. 화면을 만들 때는 아래 규칙 파일을 먼저 읽고, 파일은 손으로 복사하지 말고 URL 로 가져온다.

## 규칙 (먼저 읽기)
- 짧은 규칙: ${BASE}api/prompt-short.txt
- 전체 규칙(코딩 에이전트용): ${BASE}api/agents.md
- 디자인 원칙/컴포넌트/차트 문서: ${BASE}docs/

## 가져오기 (자동)
- 한 줄로 쓰기: <link rel="stylesheet" href="${BASE}api/dist/ds.css"> + <script src="${BASE}api/dist/ds.js"></script>
- 프로젝트에 내려받기(셸): curl -fsSL ${BASE}api/install.sh | sh -s -- ./public/ds
- 파일 목록/해시: ${BASE}api/manifest.json
- 개별 파일: ${BASE}tokens/tokens.css, ${BASE}css/ds.css, ${BASE}js/ds-theme.js, ${BASE}js/ds-charts.js
- CDN 대안: https://cdn.jsdelivr.net/gh/${REPO}@main/{path}

## 차트
- 카탈로그(JSON): ${BASE}api/charts.json — 종류별 언제 쓰나, 옵션, 호출 예
- 실제 렌더 예시: ${BASE}examples/charts.html (각 차트의 "프롬프트" 버튼이 사양+코드를 준다)
- ECharts 테마: ${BASE}integrations/echarts-theme.js

## 컴포넌트
- 클래스 목록(JSON): ${BASE}api/components.json
- 갤러리: ${BASE}examples/showcase.html

## 예시
- 대시보드: ${BASE}examples/dashboard.html
- Spotfire 식 탐색기(마킹·드릴다운·크로스테이블): ${BASE}examples/explorer.html
- 리포: https://github.com/${REPO}
`;
write('llms.txt', llms);

/* ---------- 매니페스트 ---------- */
const manifest = {
  name: 'references', description: pkg.description, version: pkg.version, commit, built_at: new Date().toISOString(), base: BASE, repo: `https://github.com/${REPO}`,
  usage: {
    quick_start_html: [`<link rel="stylesheet" href="${BASE}api/dist/ds.css">`, `<script src="${BASE}api/dist/ds.js"></script>`],
    install_sh: `curl -fsSL ${BASE}api/install.sh | sh -s -- ./public/ds`,
    cdn_note: `사내망에서 github.io 가 막히면 jsDelivr(cdn) 또는 raw 주소를 쓰거나, install.sh 로 받아 자체 서버에 둔다. DS_BASE 환경변수로 미러 지정.`,
    cors: 'GitHub Pages 는 Access-Control-Allow-Origin: * 를 보내므로 브라우저 fetch 로도 받을 수 있다.',
  },
  endpoints: { llms: BASE + 'llms.txt', manifest: BASE + 'api/manifest.json', charts: BASE + 'api/charts.json', components: BASE + 'api/components.json', tokens: BASE + 'api/tokens.json', prompt: BASE + 'api/prompt.txt', prompt_short: BASE + 'api/prompt-short.txt', agents: BASE + 'api/agents.md', bundle_css: BASE + 'api/dist/ds.css', bundle_js: BASE + 'api/dist/ds.js', install: BASE + 'api/install.sh' },
  bundles: [{ path: 'api/dist/ds.css', url: BASE + 'api/dist/ds.css', bytes: Buffer.byteLength(cssBundle), sha256: sha(cssBundle), contains: ['tokens/tokens.css', 'css/ds.css'] }, { path: 'api/dist/ds.js', url: BASE + 'api/dist/ds.js', bytes: Buffer.byteLength(jsBundle), sha256: sha(jsBundle), contains: ['js/ds-theme.js', 'js/ds-charts.js', 'js/ds-prompt.js'] }],
  files,
  github_api: { contents: `https://api.github.com/repos/${REPO}/contents/{path}?ref=main`, tarball: `https://api.github.com/repos/${REPO}/tarball/main`, note: '공개 리포 — 토큰 없이 60회/시간' },
};
write('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`api/ 생성: ${files.length} files, bundles ${(Buffer.byteLength(cssBundle) / 1024).toFixed(0)}KB css + ${(Buffer.byteLength(jsBundle) / 1024).toFixed(0)}KB js, base ${BASE}`);
