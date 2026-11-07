# 08. Spotfire → 웹 구현 매핑

Spotfire 로 하던 분석 화면을 **라이브러리 조합**으로 웹에 그대로 옮기는 방법. 살아 있는 예시는
`examples/explorer.html`(전체 조합), `examples/drilldown.html`(드릴다운 3패턴)이다.
GPT/GLM 에게 "탐색 화면 만들어줘"라고 시킬 때는 이 문서와 두 예시를 함께 주면 된다.

## 1. 기능 매핑표

| Spotfire 기능 | 웹 구현 | 라이브러리 | 예시 위치 |
|---|---|---|---|
| 인메모리 데이터 엔진 | 브라우저 안 SQL (Web Worker) | **DuckDB-WASM** | `integrations/mosaic-setup.js` |
| 마킹 (선택 → 모든 시각화 하이라이트) | 클릭/브러시 → SQL 조건(OR 결합) → 집계를 "마킹/나머지" 두 시리즈로 | ECharts + DuckDB | explorer `mark()`, `markExpr()` |
| Limit data using markings | 마킹 조건을 시각화 베이스 WHERE 에 합침 | – | explorer `whereBase()` + `마킹된 데이터만 보기` 스위치 |
| 마킹 → 필터 전환 | 마킹 SQL 을 필터 칩(extra)으로 이동 | – | explorer `markingToFilter()` |
| 필터 패널 (체크박스·범위·날짜) | 사이드바 폼 → `whereFilters()` | ds.css 컴포넌트 | explorer 좌측 패널 |
| 교차 필터 (한 차트의 브러시가 다른 차트 필터) | Mosaic `Selection` → 코디네이터가 전파 | **Mosaic(vgplot)** | explorer `buildVgPanel()` 할인율 히스토그램 |
| 드릴다운 / 드릴업 | 계층 배열 + 경로 배열 상태머신, 브레드크럼 | ECharts | explorer 지역 차트 · drilldown.html ③ |
| 트리맵 드릴 | `leafDepth` + 내장 breadcrumb | ECharts treemap | drilldown.html ① |
| Details-on-demand | 마킹된 행만 그리드에 표시 | **AG Grid Community** | explorer 상세 보기 탭 |
| 크로스 테이블 (피벗) | 행/열 그룹 드래그, 집계 | **Perspective** | explorer 크로스 테이블 탭 |
| 북마크 | 상태(JSON) → base64 → `location.hash` | – | explorer `writeHash()/readHash()` |
| 우클릭 메뉴 (드릴/필터/마킹) | ECharts `contextmenu` 이벤트 → `.ds-menu` | – | explorer `openCtx()` |
| 데이터 함수 (R/Python) | SQL(윈도우 함수, quantile, 피벗) 로 대체 | DuckDB | explorer `quantile_cont` |
| 지도 | MapLibre GL (+deck.gl) | 필요 시 추가 | – |
| 시각화 테마 | tokens.css 변수 → 각 라이브러리 테마 어댑터 | `integrations/*` | – |

## 2. 라이브러리 역할 분담과 정책

- **ECharts** – 기본 차트 전부. 테마는 `integrations/echarts-theme.js`(`DSEchartsTheme.register/bind`). 차트 종류가 가장 많고 트리맵/선버스트 드릴이 내장.
- **DuckDB-WASM** – 데이터 계층. CSV/Parquet/JSON/Arrow 를 그대로 올리고 집계는 SQL 로. 수백만 행도 브라우저에서 즉시.
- **Mosaic (vgplot)** – 코디네이터 패턴(선택이 1급 객체). 브러시·교차필터가 많은 화면이면 모든 차트를 vgplot 으로 가도 되고, 예시처럼 ECharts 와 섞어 DuckDB 만 공유해도 된다.
- **AG Grid Community** – 그리드(정렬·컬럼 필터·CSV). 피벗은 엔터프라이즈 기능이라 **Perspective** 로.
- **Perspective (FINOS)** – 크로스 테이블. WebAssembly, 실시간 갱신 가능.
- **Vega-Lite** – LLM 에게 "차트 하나 JSON 으로" 시킬 때 가장 안정적. 테마는 `integrations/vega-config.js`.

**CDN 정책**: 사내망 기준으로 CDN 을 쓰지 않는다. `npm run vendor` 가 `node_modules → vendor/` 로 복사·번들하고 페이지는 `../vendor/...` 를 참조한다. `vendor/` 는 git 에 넣지 않고 CI/배포에서 생성한다.

## 3. 패턴별 코드

### 3-1. 마킹 조건 만들기 (클릭한 차원 → SQL predicate)

```js
// 상태: state.marking = [{ label, sql }]  — 여러 개면 OR
function mark(clause, { add = false } = {}) {
  const i = state.marking.findIndex(m => m.sql === clause.sql);
  if (add) i >= 0 ? state.marking.splice(i, 1) : state.marking.push(clause);   // Shift+클릭 = 토글 추가
  else if (i >= 0 && state.marking.length === 1) state.marking = [];           // 같은 것 재클릭 = 해제
  else state.marking = [clause];
  refresh();
}
chart.on('click', p => mark({ label: `지역 ${p.name}`, sql: `region = '${esc(p.name)}'` }, { add: shiftHeld }));
// 브러시(기간) → 범위 조건
chart.on('brushEnd', p => { const [i0, i1] = p.areas[0].coordRange.map(Math.round);
  mark({ label: '기간', sql: `date >= DATE '${months[i0]}' AND date < DATE '${months[i1]}' + INTERVAL 1 MONTH` }); });
```

### 3-2. 마킹을 모든 차트에 반영 — "마킹 / 나머지" 두 시리즈

Spotfire 처럼 막대의 일부만 밝게 보이게 하려면, 집계 때 마킹 플래그로 두 합계를 뽑아 **누적 막대**로 그린다.

```sql
SELECT region k,
       sum(revenue)::DOUBLE total,
       sum(CASE WHEN (region = '수도권' OR category = '가전') THEN revenue ELSE 0 END)::DOUBLE marked
FROM sales WHERE <필터> GROUP BY 1
```
```js
series: [
  { type: 'bar', stack: 'a', data: rows.map(r => hasMark ? r.marked : r.total), itemStyle: { color: series1 } },
  { type: 'bar', stack: 'a', data: rows.map(r => hasMark ? r.total - r.marked : 0), itemStyle: { color: cssVar('--chart-dim') } },
]
```
선 차트는 전체 선을 `--chart-dim` 으로, 마킹 선을 시리즈 색으로 겹쳐 그리고, 히트맵은 마킹 0 인 셀만 dim 처리한다.

> **주의**: DuckDB 의 `sum(BIGINT)` 은 HUGEINT(128bit) 를 돌려주며 Arrow→JS 변환이 깨진다. 집계는 항상 `::DOUBLE` 캐스팅. `cost` 는 예약어라 `"cost"` 로 인용.

### 3-3. 마킹 → 필터 전환 (Limit data by marking)

```js
function markingToFilter() {
  state.filters.extra.push({ label: state.marking.map(m => m.label).join(' | '), sql: whereMarking() });
  state.marking = []; refresh();
}
// "마킹된 데이터만 보기" 스위치: 필터는 그대로 두고 시각화 베이스에만 마킹을 AND
const whereBase = () => state.markedOnly && whereMarking() ? `${whereFilters()} AND (${whereMarking()})` : whereFilters();
```

### 3-4. 드릴다운 상태머신 + 브레드크럼

```js
const LEVELS = ['region', 'branch', 'product'];
const path = [];                               // ['수도권'] → ['수도권','서울 강남']
const level = () => path.length;
const where = () => path.map((v, i) => `${LEVELS[i]} = '${esc(v)}'`).join(' AND ') || '1=1';
const sql = () => `SELECT ${LEVELS[level()]} k, sum(revenue)::DOUBLE v FROM sales WHERE ${where()} GROUP BY 1 ORDER BY 2 DESC`;
chart.on('click', p => level() < LEVELS.length - 1 ? (path.push(p.name), render()) : mark(...));   // 마지막 레벨은 마킹
function drillTo(n) { path.length = n; render(); }            // 브레드크럼 / 드릴업
```
브레드크럼은 `.ds-breadcrumb` (`<a>` 는 상위 레벨, 마지막은 `aria-current="page"`). 경로를 해시에 넣으면 뒤로가기가 드릴업이 된다.
트리맵은 코드 없이 `series.treemap.leafDepth: 1` 과 내장 `breadcrumb` 으로 같은 동작.

### 3-5. Details-on-demand (AG Grid)

```js
agGrid.ModuleRegistry.registerModules([agGrid.AllCommunityModule]);
const api = DSAgGridTheme.track(agGrid.createGrid(el, { theme: DSAgGridTheme.theme(), columnDefs, rowData: [] }));
const rows = await query(`SELECT ... FROM sales WHERE ${hasMark ? filters + ' AND (' + marking + ')' : filters} LIMIT 5000`);
api.setGridOption('rowData', rows);           // 마킹이 바뀔 때마다
api.exportDataAsCsv({ fileName: 'detail.csv' });
```
테마 토글은 `DSAgGridTheme.track()` 에 등록해 두면 `ds-themechange` 때 자동 재적용.

### 3-6. 크로스 테이블 (Perspective)

```js
import perspective from '../vendor/perspective/perspective/dist/cdn/perspective.js';
await import('../vendor/perspective/perspective-viewer/dist/cdn/perspective-viewer.js');
await import('../vendor/perspective/perspective-viewer-datagrid/dist/cdn/perspective-viewer-datagrid.js');
await import('../vendor/perspective/perspective-viewer-d3fc/dist/cdn/perspective-viewer-d3fc.js');
const viewer = document.createElement('perspective-viewer');   // ⚠ 보이는 상태에서 생성
viewer.setAttribute('theme', 'DS'); host.appendChild(viewer);
const worker = await perspective.worker();
await viewer.load(await worker.table(rows));
await viewer.restore({ plugin: 'Datagrid', group_by: ['region', 'branch'], split_by: ['category'], columns: ['revenue', 'units'], aggregates: { revenue: 'sum', units: 'sum' } });
```
스킨은 `integrations/perspective-theme.css` (pro.css 다음에 로드). 데이터가 바뀌면 `viewer.save()` 로 설정을 보관 → 새 table `load` → `restore(saved)`.

### 3-7. 교차 필터 (Mosaic Selection)

```js
const brush = vg.Selection.intersect();          // 브러시 결과
const appFilter = vg.Selection.single();         // 앱 필터를 vgplot 쪽에 전달
vg.plot(vg.rectY(vg.from('sales', { filterBy: appFilter }), { x: vg.bin('discount_rate', { steps: 20 }), y: vg.count(), fill: series1 }),
        vg.intervalX({ as: brush }));
brush.addEventListener('value', ([lo, hi] = []) => { state.filters.discount = lo == null ? null : [lo, hi]; refresh(); });
appFilter.update({ source: app, fields: [], value: whereSql, predicate: vg.sql([whereSql]) });   // 앱 → Mosaic
```
모든 차트를 vgplot 으로 만들면 `Selection.crossfilter()` 하나로 "자기 자신은 제외하고 나머지 전부 필터"가 된다 (Spotfire 교차필터 그 자체).

### 3-8. 북마크 (URL 해시)

```js
const writeHash = () => history.replaceState(null, '', '#f=' + btoa(unescape(encodeURIComponent(JSON.stringify({ f: state.filters, m: state.marking, d: state.drill })))));
const readHash  = () => { const m = /[#&]f=([^&]+)/.exec(location.hash); if (m) Object.assign(state, JSON.parse(decodeURIComponent(escape(atob(m[1]))))); };
```

### 3-9. 테마 연동

| 라이브러리 | 방법 |
|---|---|
| ECharts | 테마 핫스왑 불가 → `DSEchartsTheme.bind(echarts, el, optionFn)` 이 `ds-themechange` 때 dispose/재생성 |
| AG Grid | `api.setGridOption('theme', DSAgGridTheme.theme())` (track 으로 자동) |
| Perspective | CSS 변수만 쓰므로 자동 |
| vgplot | `vgplot-theme.css` + 생성 시 `dsVgplotTheme(vg)`; 색이 바뀌면 plot 재생성 |
| Vega-Lite | `vegaEmbed` 다시 호출 (`DSVegaConfig.build()`) |

## 4. 함정 (실제로 겪은 것)

1. **DuckDB-WASM 은 http(s) 에서만** — Worker + wasm 은 `file://` 로 안 열린다. `node scripts/serve.js` 또는 아무 정적 서버.
2. **`sum(BIGINT)` → HUGEINT** — JS 에서 객체로 깨짐. `::DOUBLE` 캐스팅 필수. `min(date)` 도 `CAST(... AS VARCHAR)` 가 안전.
3. **Perspective 는 숨겨진(display:none) 상태에서 업그레이드되면 wasm 패닉(`unreachable`)** 후 플러그인이 Debug 로 떨어진다. 탭이 보일 때 요소를 만들어라.
4. **ECharts 테마는 핫스왑 불가** — setOption 으로 색만 다시 넣거나 dispose/재생성. 이벤트 바인딩을 `onInit` 콜백에 두어 재생성 시 다시 붙게 한다.
5. **zrender 이벤트의 modifier 키** — 일부 환경에서 `event.shiftKey` 가 빠진다. `keydown/keyup` 으로 직접 추적(explorer `keys`).
6. **vgplot 은 ESM 소스만 배포** — 정적 서버에서 bare import 가 안 풀리므로 esbuild 로 번들(`scripts/vendor.js`). DuckDB 도 같은 번들에서 export 해야 인스턴스를 공유할 수 있다.
7. **AG Grid v33+** 는 CSS 테마 파일 대신 Theming API(`themeQuartz.withParams`) — CSS 변수 값을 그대로 넘겨도 되지만 토글 시 재적용이 더 안전.
8. **마킹 수가 0이어도 Perspective 에 빈 배열을 넣으면 스키마를 못 잡는다** — 더미 1행을 넣거나 이전 table 을 유지.
