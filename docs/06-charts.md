# 06. 차트

차트는 **사람이 읽고, 코드가 그린다.** 취향이 아니라 절차로 맞는 결과가 나오게 한다.
살아 있는 예시: [`examples/charts.html`](../examples/charts.html) · 조립 예시: [`examples/dashboard.html`](../examples/dashboard.html)

## 0. 순서 — 색은 마지막에 고른다

1. **형태를 고른다.** 데이터의 일이 뭔가 — 크기, 정체, 극성, 대표 숫자 하나, 시간 추이? (아래 §1)
2. **색의 일을 정한다.** 범주형(정체) / 순차형(크기) / 발산형(극성) / 상태(좋다·나쁘다). 각각 규칙 하나. (§3)
3. **팔레트를 바꿨다면 검증기를 돌린다.** 눈으로 "충분히 달라 보인다"는 금지. `node scripts/validate_palette.js`
4. **마크 규격을 적용한다.** ds-charts.js 를 쓰면 자동. ECharts 를 쓰면 테마가 맡는다. (§4)
5. **호버 레이어는 기본.** 툴팁 없는 차트는 스탯 타일뿐.
6. **접근성 마무리.** 2개 이상 시리즈면 범례, 모든 차트에 표 뷰, 다크 모드는 별도 선택된 단계.
7. **렌더해서 눈으로 본다.** 라벨 충돌, 잘림, 넘침은 검증기가 못 잡는다.

## 1. 형태 고르기

### 차트가 맞긴 한가?

| 데이터가… | 쓴다 | 쓰지 않는다 |
|---|---|---|
| 현재 값 하나 (+추세) | **스탯 타일** `DSCharts.stat` | 막대 하나짜리 막대차트 |
| 대표 숫자 몇 개 | **KPI 행** (`.ds-kpi-row` 안에 스탯 타일) | 그룹 막대 |
| 대시보드가 이끄는 숫자 하나 | **대표 숫자** `stat({hero:true})`, 화면당 1개 | — |
| 한도 대비 비율 하나 | **미터** `.ds-progress` | 2조각 파이 |
| 한 전체를 ≤6 조각으로, 한눈에 | **키 큰 분할 막대** `segmented({size:'tall'})` | 도넛, 파이 |
| 의미를 가진 분류가 7개 넘음 | **표** (또는 표+차트) | 색 더 쓰기 |

### 차트가 맞다면 — 일이 형태를 고른다

| 독자가 해야 하는 일 | 기본 형태 | 색의 일 |
|---|---|---|
| 크기 비교 | 막대/기둥 `bar`, 격자면 **히트맵** `heatmap` | 순차형 |
| 시간 추이 | 선 `line`, 단일 시리즈면 영역 `line({area:true})` | 순차형 또는 범주 1색 |
| 서로 다른 시리즈 구분 | 그룹/누적 막대, 다중 선 | **범주형** |
| 하나가 주인공, 나머지는 맥락 | **강조** `{emphasis:'이름'}` | 1색 + 회색 |
| 기준선 위/아래, 목표 대비 차이 | 발산 막대 `diverging` | 발산형 |
| 부분-전체 | 막대 (아래 표) | 범주형 / 순위면 1색 |
| 전/후 비교 | 덤벨 (ECharts) | 1색 2단계 |

### 부분-전체 — 어떤 막대인가

| 독자가 해야 하는 일 | 쓴다 |
|---|---|
| 조각끼리 비교, 순위, 가까운 값 구분, 7개 이상 | **순위 가로 막대** `bar({horizontal:true, sort:'desc'})` 한 색 |
| 한 전체가 어떻게 나뉘는지 한눈에, 옆에 수치 없음 | **키 큰 분할 막대** — 비중을 안에 인쇄, 범례는 이름만 |
| 수치가 옆에 적힌 표/목록 안 | **얇은 분할 막대** `segmented({size:'thin'})` — 글자 없음 |
| 시간에 따라, 또는 여러 전체를 한 축에 | **누적 막대** `bar({stacked:true})` |

### 시리즈 개수 사다리 (범주형)

| 시리즈 | 처리 |
|---|---|
| 1–3 | 색만으로 충분. 직접 라벨 |
| 4 | 직접 라벨 필수 (옐로와 오렌지가 같이 뜸). 산점도·버블·지도는 **3개까지** |
| 5–6 | 범례 또는 작은 다중 차트 |
| 7–8 | 토큰 상한. 넘으면 "기타"로 접거나, 작은 다중 차트, 또는 색×모양 |

9번째 색을 만들지 않는다. ds-charts.js 는 9개 이상이면 합계가 작은 것부터 자동으로 "기타"에 접는다.

## 2. 고정 규칙 (모든 디자인 시스템에서 참)

- **범주 색은 고정 순서로 부여, 순환 금지.** 1번 틸 → 8번 레드. 필터로 시리즈가 빠져도 남은 것의 색은 그대로 (`seriesOrder` 로 순서를 못 박는다).
- **축은 하나.** 이중 y축 금지. 단위가 다르면 차트를 둘로, 또는 공통 기준(=100)으로 지수화.
- **순차형 = 한 색 연함→진함. 발산형 = 두 색 + 중립 회색 중앙.** 무지개 금지, 중앙에 색 금지.
- **상태색은 예약.** `--ok / --warn / --danger` 는 "좋다/나쁘다"를 뜻할 때만, 항상 아이콘+라벨과 함께. 시리즈 4번으로 쓰지 않는다.
- **글자는 시리즈 색을 입지 않는다.** 값·라벨·범례는 ink 토큰. 색은 옆의 스와치가 맡는다. (예외: 채움 안에 인쇄한 라벨은 흰색 또는 near-black)
- **가는 마크, 가라앉은 격자.** 막대 ≤24px, 선 2px, 격자 1px 실선.
- **2개 이상이면 범례 항상.** 1개면 범례 없음(제목이 설명). 직접 라벨은 선택적으로 — 끝점, 극값, 주인공.
- **툴팁은 보강이지 관문이 아니다.** 모든 값은 직접 라벨 또는 표 뷰로도 닿는다.
- **큰 숫자는 비례 숫자.** `tabular-nums` 는 표와 축 눈금에만.
- **필터는 차트 위 한 줄.** 차트 안에 필터를 두지 않는다. 아래 모든 것이 같은 슬라이스를 본다.

## 3. 색

### 범주형 8색 (라이트/다크 각각 검증됨)

| 슬롯 | 색 | 라이트 | 다크 | 비고 |
|---|---|---|---|---|
| 1 | 틸 (브랜드) | `#0091a3` | `#11a1b4` | 단일 시리즈는 전부 이 색 |
| 2 | 오렌지 | `#e36a2e` | `#d8662a` | |
| 3 | 바이올렛 | `#6b5bd6` | `#8771de` | |
| 4 | 옐로 | `#e0a000` | `#c98500` | 라이트 흰 표면 대비 2.3:1 — **직접 라벨 또는 표 뷰 필수** |
| 5 | 마젠타 | `#d6578e` | `#ca5e96` | |
| 6 | 그린 | `#3e8e1f` | `#4f9b3e` | |
| 7 | 블루 | `#2a78d6` | `#3986e4` | |
| 8 | 레드 | `#e34948` | `#da534f` | |
| 기타 | 회색 | `--series-other` | | 접힌 꼬리 |

토큰: `--series-1` … `--series-8`, `--series-other`. 코드에 hex 를 적지 않는다 — ds-charts.js 는 렌더 시점에 CSS 변수를 읽고, 테마가 바뀌면 다시 그린다.

검증 결과 (2026-11): 인접 쌍 색약 ΔE 최악 11.7(라이트)/10.3(다크) ≥ 8 통과, 정상 시력 ΔE 24.4/19.9 ≥ 15 통과, 대비는 옐로만 라이트에서 완화 대상.

```bash
node scripts/validate_palette.js "#0091a3,#e36a2e,#6b5bd6,#e0a000,#d6578e,#3e8e1f,#2a78d6,#e34948" --mode light --surface "#ffffff"
node scripts/validate_palette.js "#11a1b4,#d8662a,#8771de,#c98500,#ca5e96,#4f9b3e,#3986e4,#da534f" --mode dark --surface "#131a1b"
# 산점도·버블·지도·작은 다중 차트는 --pairs all (3색까지만 통과)
```

### 순차형 (크기)

`--seq-100` (거의 0, 표면 쪽으로 물러남) → `--seq-700` (최대). 틸 한 색. 다크 모드에서는 앵커가 뒤집혀 100이 어두운 쪽. 히트맵, 지도 단계구분도, 순위 단계(퍼널·등급)에 쓴다. 두 번째 순차 맥락이 동시에 필요하면 다음 슬롯 색(오렌지)으로 별도 램프.

### 발산형 (극성)

`--div-neg-3 … --div-neg-1` (틸, 차가움) · `--div-mid` (중립 회색) · `--div-pos-1 … --div-pos-3` (오렌지, 따뜻함). 양팔 단계 수 같게. 기준선 위/아래, 목표 대비, 전년 대비, 동의↔반대 척도.

### 상태 (고정, 테마 무관)

| 역할 | 토큰 | 쓰임 |
|---|---|---|
| 좋음 | `--ok`, `--ok-text`, `--ok-soft` | 달성, 정상 |
| 경고 | `--warn`, `--warn-text`, `--warn-soft` | 주의, 임계 근접 |
| 위험 | `--danger`, `--danger-text`, `--danger-soft` | 미달, 장애 |

차트 안에서는 **델타 방향**(스탯 타일 ▲▼)과 **미터 채움**에만. 시리즈가 "오류율"처럼 좋다/나쁘다를 뜻하면 상태 토큰, 그냥 "4번 시리즈"면 범주 토큰 — 한 차트에 둘 다는 없다.

### 글자색

| 역할 | 토큰 |
|---|---|
| 값, 직접 라벨, 범례 | `--chart-ink-2` |
| 축 눈금 | `--chart-muted` |
| 격자 / 기준선 | `--chart-grid` / `--chart-axis` |
| 강조 차트의 조연 | `--chart-dim` |
| 마킹(선택) 링 | `--chart-mark` |
| 채움 안 라벨 | 흰색, 옐로 위에서만 `#0b0b0b` |

## 4. 마크 규격 (ds-charts.js 가 강제)

| 마크 | 규격 |
|---|---|
| 막대/기둥 | ≤24px, 데이터 끝 4px 라운드, 기준선은 직각, 한 기준선에서 자람 |
| 선 | 2px, round join/cap |
| 마커/끝점 | ≥8px (r≥4), 시리즈 색 채움, **2px 표면색 링** |
| 영역 채움 | 시리즈 색 10% |
| 격자/축 | 표면보다 한 단계 짙은 회색, 1px 실선 (점선 금지) |
| 간격 | 인접 막대·누적 조각 사이 **2px 표면색**. 테두리로 구분하지 않는다 |
| 얇은 분할 막대 | 8px (조밀하면 4px), 끝 완전 라운드, 글자 없음 |
| 키 큰 분할 막대 | 28px, 블록마다 4px 모서리, 비중은 들어갈 때만 안에 인쇄, 범례는 이름만 |
| 대표 숫자 | ≥48px, 같은 산세리프, 화면당 1개 |
| 라벨 | 들어갈 때만 안에, 아니면 끝 바깥, 그것도 안 되면 툴팁/표. 잘라서 넣지 않는다 |

## 5. DSCharts API

```html
<script src="js/ds-charts.js"></script>
```

모든 함수는 `(el, opts)` 를 받고 `{ update(opts), destroy(), toggleTable(force), setSelection(keys), clearSelection(), selection, el }` 을 돌려준다. `el` 은 빈 블록 요소(보통 `.ds-card__body` 안의 `<div>`). 색은 `el` 에 적용된 CSS 변수에서 읽는다.

### 공통 옵션

| 옵션 | 뜻 |
|---|---|
| `data` | 행 객체 배열. 와이드(`y:['a','b']`) 또는 롱(`series:'field'`) |
| `x`, `y` | 필드명. `y` 는 문자열 또는 배열 |
| `series` | 롱 포맷일 때 시리즈 필드. 같은 x·시리즈 행은 합산 |
| `seriesOrder` | 시리즈 순서(=색 슬롯) 고정. `['매장','온라인','B2B']` |
| `title`, `subtitle`, `xLabel`, `yLabel` | 제목/부제/표 뷰 열 이름 |
| `format` | `'number' \| 'integer' \| 'currency' \| 'compact' \| 'compact-krw' \| 'percent' \| 'percent-point' \| fn` |
| `labels` | `'auto'`(극값만) \| `'none'` \| `'all-ends'` |
| `legend` | `false` 면 숨김 (2개 이상일 때 기본 표시) |
| `tableView` | `false` 면 "표로 보기" 버튼 없음 (기본 true) |
| `sort` | `'asc' \| 'desc'` 카테고리 합계 정렬 |
| `limit` | 정렬 후 상위 n개만 |
| `emphasis` | 강조할 시리즈 이름, 나머지는 `--chart-dim` |
| `height` | 플롯 높이 px (축 띠 포함, 기본 260) |
| `onSelect(rows, keys)` | 마킹 콜백. 클릭 = 선택, Shift+클릭 = 추가, 재클릭 = 해제. `rows` 는 원본 행 |

### 포맷

| 이름 | 1234567 → |
|---|---|
| `number` | 1,234,567 |
| `compact` | 123.5만 |
| `compact-krw` | 123만 / 12.3억 / 1.2조 (예시 기본) |
| `currency` | ₩1,234,567 |
| `percent` | 입력 0.034 → 3.4% |
| `percent-point` | 입력 12.3 → +12.3% (델타용) |

축 눈금은 축마다 한 스타일: 1만 이상이면 압축 표기, 아니면 전체 자릿수.

### 함수

```js
// 막대 (단일/그룹/누적/가로)
DSCharts.bar(el, { data, x:'region', y:'revenue', title:'지역별 매출', format:'compact-krw', sort:'desc' });
DSCharts.bar(el, { data: longRows, x:'category', y:'revenue', series:'channel', seriesOrder:['매장','온라인','B2B'], stacked:true });
DSCharts.bar(el, { data, x:'branch', y:'revenue', horizontal:true, sort:'desc', limit:10, height:300 });

// 선 / 영역 — x 가 날짜면 시간축, 아니면 순서축. 크로스헤어가 가장 가까운 x에 스냅
DSCharts.line(el, { data: byMonth, x:'month', y:'revenue', area:true, title:'월별 매출' });
DSCharts.line(el, { data: wide, x:'month', y:['매장','온라인','B2B'], markers:'auto' /* 30점 이하만 */ });

// 스탯 타일 — ds.css 의 .ds-stat 마크업을 생성. delta 는 % 포인트, upIsGood:false 면 오르면 빨강
DSCharts.stat(el, { label:'반품률', value:0.034, format:'percent', delta:0.4, deltaLabel:'전월 대비', upIsGood:false, trend:[...12개] });
DSCharts.stat(el, { label:'이번 달 매출', value: 870000000, format:'compact-krw', delta:-9.4, hero:true });

// 분할 막대
DSCharts.segmented(el, { parts:[{name:'매장',value:55},{name:'온라인',value:30},{name:'B2B',value:15}], size:'tall', title:'채널 구성' });
DSCharts.segmented(el, { parts, size:'thin', legend:false, tableView:false }); // 옆에 수치 목록이 있을 때

// 스파크라인 (스탯 타일 밖에서 단독으로)
DSCharts.sparkline(el, { values:[3,4,5,4,6], width:96, height:28 });

// 히트맵 — 순차형 7단계, 스케일 범례 자동
DSCharts.heatmap(el, { data, x:'month', y:'region', value:'revenue', valueLabel:'매출', cell:26 });

// 발산 막대 — 부호 있는 값, 크기에 따라 3단계 농도
DSCharts.diverging(el, { data, x:'region', y:'yoy', format:'percent', sort:'desc' });
```

### 마킹 (Spotfire식 선택)

```js
const c = DSCharts.bar(el, { data, x:'region', y:'revenue', onSelect(rows, keys) {
  detailTable.render(rows);          // 상세 보기
  otherChart.update({ data: rows }); // 다른 차트는 마킹된 행만
}});
c.setSelection(['수도권']); c.clearSelection(); c.selection; // ['수도권']
```

선택된 마크는 `--chart-mark` 2px 링, 나머지는 30% 불투명. 키보드: Tab 으로 마크 이동, Enter 로 선택. 수천만 행 규모의 교차 필터는 ds-charts.js 가 아니라 DuckDB + Mosaic 패턴 ([08-spotfire-mapping.md](08-spotfire-mapping.md), `examples/explorer.html`).

### 테마

`DSTheme.toggle()` 또는 `html[data-theme]` 변경, OS 설정 변경 모두 자동 재렌더. 컨테이너 너비 변화도 `ResizeObserver` 로 재렌더.

## 5b. 갤러리에서 프롬프트 복사해 쓰기

`examples/charts.html`의 각 차트 오른쪽 위 **프롬프트** 버튼을 누르면 x/y/제목을 확인·수정한 뒤 "사양 + 호출 코드 + 규칙 요약"을 한 번에 복사할 수 있다. Claude/GPT에 붙여넣기만 하면 같은 차트가 나온다. 구현은 `js/ds-prompt.js` (DSCharts 호출을 가로채 사양을 기억한다).

## 6. ECharts 를 쓸 때

ds-charts.js 에 없는 형태(트리맵, 생키, 평행좌표, 지도, 드릴다운, 브러시)는 Apache ECharts 를 쓴다. 색·글꼴·격자·마크 규격은 테마가 맡는다:

```html
<script src="../vendor/echarts/echarts.min.js"></script>
<script src="../integrations/echarts-theme.js"></script>
<script>
  // 토큰(CSS 변수)을 호출 시점에 읽어 'ds' 테마를 등록하고, 테마 토글 시 자동으로 다시 그린다
  const ref = DSEchartsTheme.bind(echarts, el, () => option);
  ref.chart.on('click', p => { /* ... */ });
</script>
```

정적 파일이 필요하면 `integrations/echarts-theme.light.json` / `.dark.json` 을 `echarts.registerTheme('ds', json)` 으로 등록한다 (`npm run tokens` 뒤 `node scripts/build-echarts-theme-json.js` 로 재생성).

테마를 쓰더라도 §2 의 고정 규칙은 그대로다 — 이중 축, 색 순환, 모든 점 라벨, 점선 격자 금지. 세부는 `integrations/` 와 [08-spotfire-mapping.md](08-spotfire-mapping.md).

## 7. 출시 전 체크리스트 (안티패턴)

- [ ] 이중 y축이 없다
- [ ] 필터해도 남은 시리즈 색이 안 바뀐다 (`seriesOrder`)
- [ ] 9번째 색을 만들지 않았다 — "기타"로 접었다
- [ ] 팔레트를 바꿨다면 검증기를 라이트/다크 둘 다 돌렸다
- [ ] 명목 범주 막대를 값에 따라 더 진하게 칠하지 않았다
- [ ] 순차형은 한 색, 발산형 중앙은 회색
- [ ] 상태색을 시리즈로 쓰지 않았다
- [ ] 숫자 하나가 이야기인데 8색 차트를 그리지 않았다 → 스탯 타일 또는 강조
- [ ] 막대 하나짜리 차트, 2조각 파이가 없다
- [ ] 가까운 값 비교에 도넛을 쓰지 않았다
- [ ] 격자가 점선이 아니다
- [ ] 모든 점에 숫자를 붙이지 않았다
- [ ] 마크를 테두리로 구분하지 않았다 (2px 표면색 간격)
- [ ] 라벨이 막대에 잘리지 않는다
- [ ] 컨테이너 높이에 x축 띠가 들어간다 (내부 스크롤 없음)
- [ ] 대표 숫자에 세리프/디스플레이 글꼴, `tabular-nums` 를 쓰지 않았다
- [ ] 툴팁에만 있는 값이 없다 — 표 뷰가 있다
- [ ] 호버 히트 영역이 마크보다 크다 (≥24px)
- [ ] 필터가 차트 위 한 줄에 있고 차트 안에 없다
- [ ] 다크 모드에서 실제로 열어 봤다
