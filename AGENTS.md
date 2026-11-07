# AGENTS.md — 화면 생성 규칙서 (코딩 에이전트용)

이 저장소는 사내 모든 시스템의 UI를 통일하는 디자인 시스템이다. 화면(HTML/CSS/JS)을 만들거나 고칠 때 아래 규칙을 **예외 없이** 따른다. 판단이 필요하면 `docs/`를 읽고, 그래도 모호하면 `examples/`의 가장 비슷한 페이지를 복사해서 시작한다.

## 절대 규칙 10개

1. **색은 토큰만.** `var(--fg)`, `var(--accent)`처럼 `tokens/tokens.css`의 변수만 쓴다. hex, rgb, 색 이름을 직접 쓰지 않는다.
2. **컴포넌트는 `css/ds.css`의 `ds-` 클래스 우선.** 없는 컴포넌트만 토큰으로 새로 만들고, 만든 뒤 `ds.css`에 추가한다.
3. **새 색을 만들지 않는다.** 그라데이션, 투명도 조합으로 색을 발명하지 않는다. 시리즈 색은 `--series-1`~`--series-8` 순서대로, 9번째는 `--series-other`.
4. **차트는 `DSCharts` 먼저, 부족하면 ECharts + `integrations/echarts-theme.js`.** 다른 차트 라이브러리를 새로 끌어오지 않는다. 파이·도넛·이중축 금지.
5. **상태(성공/경고/위험)는 색 + 아이콘 + 텍스트 셋 다.** 색만으로 의미를 전달하지 않는다. 상태색을 시리즈 색으로 재사용하지 않는다.
6. **다크 모드 필수.** 토큰만 쓰면 자동으로 된다. 토글은 `DSTheme.toggle()`. 두 테마를 모두 확인한다.
7. **상단 헤더는 항상 `.ds-shell__header`(배경 `--shell-bg`).** 라이트/다크 무관하게 어둡다. 이것이 시그니처다.
8. **밀도: 기본 글자 14px, 컨트롤 높이 32px, 반경 6px, 카드에 그림자 없음(테두리만).** 크게·둥글게·떠 있게 만들지 않는다.
9. **AI 티 나는 디자인 금지.** 이모지 섹션 마커, 보라-파랑 그라데이션 히어로, 모두 중앙 정렬, 카드마다 액센트 바, 크림 배경+세리프, 검정+형광색 금지.
10. **숫자 열은 `.ds-num`(우측 정렬, tabular).** 큰 대표 숫자는 `.ds-stat__value`(proportional). 숫자 단위는 라벨에 쓴다: "매출(백만원)".

## 페이지 뼈대 (여기서 시작한다)

```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>승인 관리 · 시스템명</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../tokens/tokens.css">
<link rel="stylesheet" href="../css/ds.css">
<script src="../js/ds-theme.js"></script>
</head>
<body class="ds-shell">
  <header class="ds-shell__header">
    <a class="ds-shell__brand" href="#">시스템명</a>
    <nav class="ds-shell__nav"><a href="#" aria-current="page">대시보드</a><a href="#">승인</a><a href="#">설정</a></nav>
    <div class="ds-shell__user">
      <button class="ds-btn ds-btn--ghost ds-btn--sm ds-theme-toggle" type="button" onclick="DSTheme.toggle()">테마</button>
      <span>홍길동</span>
    </div>
  </header>
  <aside class="ds-sidebar">
    <a class="ds-sidebar__item is-active" href="#">승인 대기</a>
    <a class="ds-sidebar__item" href="#">처리 완료</a>
  </aside>
  <main class="ds-main">
    <div class="ds-page-header">
      <h1 class="ds-page-title">승인 대기</h1>
      <div class="ds-row"><button class="ds-btn">내보내기</button><button class="ds-btn ds-btn--primary">신규 요청</button></div>
    </div>
    <div class="ds-filter-row">
      <select class="ds-select" id="f-period"><option>최근 30일</option><option>최근 90일</option></select>
      <input class="ds-input" id="f-q" type="search" placeholder="요청자, 문서번호">
      <button class="ds-chip is-active" type="button">전체</button><button class="ds-chip" type="button">긴급</button>
    </div>
    <div class="ds-kpi-row">
      <div class="ds-stat"><div class="ds-stat__label">대기</div><div class="ds-stat__value">128</div><div class="ds-stat__delta is-up">+12 전주 대비</div></div>
      <div class="ds-stat"><div class="ds-stat__label">평균 처리 시간</div><div class="ds-stat__value">1.8일</div></div>
    </div>
    <div class="ds-card">
      <div class="ds-card__header"><h3 class="ds-card__title">일별 요청 건수</h3></div>
      <div class="ds-card__body" id="chart-daily"></div>
    </div>
    <div class="ds-card">
      <div class="ds-table-wrap">
        <table class="ds-table">
          <thead><tr><th>문서번호</th><th>요청자</th><th class="num">금액(원)</th><th>상태</th></tr></thead>
          <tbody>
            <tr><td class="ds-mono">AP-2026-0142</td><td>김민수</td><td class="ds-num">1,250,000</td><td><span class="ds-badge ds-badge--warn">⚠ 검토 중</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
  <script src="../js/ds-charts.js"></script>
  <script>
    DSCharts.line(document.getElementById('chart-daily'), {
      data: [{ d: '11-01', v: 14 }, { d: '11-02', v: 22 }, { d: '11-03', v: 19 }],
      x: 'd', y: 'v', title: '일별 요청 건수', tableView: true
    });
  </script>
</body>
</html>
```

## 컴포넌트 치트시트

| 클래스 | 용도 | 변형·상태 |
|---|---|---|
| `.ds-shell` (body), `.ds-shell__header/__brand/__nav/__user` | 앱 셸, 48px 고정 헤더 | `aria-current="page"` |
| `.ds-sidebar`, `.ds-sidebar__item` | 좌측 240px 메뉴 | `.is-active` |
| `.ds-main`, `.ds-page-header`, `.ds-page-title` | 본문, 페이지 제목 행 | |
| `.ds-btn` | 버튼 (기본 = secondary) | `--primary` `--ghost` `--danger` `--sm` `--lg` `--icon` `:disabled` |
| `.ds-input` `.ds-select` `.ds-textarea` `.ds-checkbox` `.ds-radio` `.ds-switch` | 폼 컨트롤 32px | `.is-invalid` `:disabled` |
| `.ds-field`, `.ds-field__label/__help/__error` | 라벨+컨트롤+도움말 묶음 | |
| `.ds-card`, `.ds-card__header/__title/__body/__footer` | 테두리 카드 (그림자 없음) | |
| `.ds-table-wrap` > `.ds-table` | 표. 숫자 셀 `.ds-num`, 헤더 `th.num` | `--compact` `th.is-sortable` `tr.is-selected` |
| `.ds-badge` | 상태 배지, 아이콘+텍스트 | `--ok` `--warn` `--danger` `--info` `--neutral` |
| `.ds-tabs` > `.ds-tab` | 탭 | `.is-active` |
| `.ds-filter-row`, `.ds-chip` | 콘텐츠 위 한 줄 필터 | `.is-active` |
| `.ds-kpi-row` > `.ds-stat`, `.ds-stat__label/__value/__delta` | KPI 타일 | `.is-up` `.is-down` |
| `.ds-toast-stack` > `.ds-toast` | 알림 | `--ok` `--warn` `--danger` `--info` |
| `.ds-modal` `.ds-drawer` `.ds-dropdown` `.ds-menu` `.ds-tooltip` | 오버레이 | `[hidden]`로 숨김 |
| `.ds-empty` `.ds-skeleton` | 빈 상태, 로딩 | |
| `.ds-grid` (`style="--cols:3"`) `.ds-stack` `.ds-row` | 레이아웃 (gap 기반) | |
| `.ds-h1` `.ds-h2` `.ds-h3` `.ds-label` `.ds-mono` `.ds-num` | 타이포 유틸 | |

## 차트 선택표

| 데이터의 일 | 쓸 것 | 호출 |
|---|---|---|
| 현재 값 하나(+추세) | KPI 타일 | `DSCharts.stat` |
| 시간에 따른 변화 | 선 (단일 시리즈면 area 가능) | `DSCharts.line` |
| 범주 간 크기 비교 | 막대, 많으면 가로 막대 | `DSCharts.bar` |
| 여러 시리즈 비교 | 그룹/누적 막대, 다중 선 (최대 8) | `DSCharts.bar({stacked:true})` |
| 전체 대비 비율 (≤6) | 분할 바 (파이 금지) | `DSCharts.segmented` |
| 격자형 크기 | 히트맵 (한 색 램프) | `DSCharts.heatmap` |
| 계층 드릴다운, 지도, 생키 | ECharts + ds 테마 | `integrations/echarts-theme.js` |
| 마킹·교차 필터 | Mosaic | `integrations/mosaic-setup.js` |

```js
DSCharts.stat(el, { label: '이번 달 매출', value: 128400000, format: 'currency', delta: 0.062, deltaLabel: '전월 대비', trend: [3,4,4,5,6,5,7,8,8,9,10,11] });
DSCharts.bar(el, { data: rows, x: 'branch', y: 'revenue', horizontal: true, format: 'number', title: '지점별 매출(원)', tableView: true });
DSCharts.line(el, { data: rows, x: 'month', y: ['revenue', 'cost'], legend: true, title: '매출·원가 추이', tableView: true, onSelect: items => console.log(items) });
```
반환값 `{ update(data), destroy(), toggleTable() }`. 데이터는 객체 배열. 범례는 시리즈 2개 이상일 때 자동.

## ECharts를 쓸 때

```html
<script src="../vendor/echarts/echarts.min.js"></script>
<script src="../integrations/echarts-theme.js"></script>
<script>
  // bind: 'ds' 테마로 init + option 적용 + 테마 토글 시 자동 재구성(ECharts는 테마 핫스왑이 안 됨)
  const ref = DSEchartsTheme.bind(echarts, document.getElementById('tree'), () => ({
    series: [{ type: 'treemap', data, leafDepth: 1 }],
  }));
  ref.chart.on('click', p => console.log(p.name));   // 이벤트는 ref.chart 에 건다
  // 단순 사용: echarts.init(el, DSEchartsTheme.register(echarts)) 후 setOption
</script>
```
축·그리드·툴팁·시리즈 색은 테마가 넣는다. `option`에 `color:`를 직접 쓰지 않는다.

## 하지 말 것

- hex/rgb 직접 지정, `color: #333`, 인라인 `style="color:..."`
- 파이, 도넛, 이중 y축, 3D, 모든 점에 숫자 라벨, 점선 그리드
- 상태색을 시리즈 색으로, 시리즈 색을 글자색으로
- 툴팁에만 있는 값 (표 뷰 또는 직접 라벨 필수)
- 차트 카드 안에 필터 (필터는 `.ds-filter-row`에 한 줄로)
- 외부 CDN 스크립트 참조 (`vendor/` 상대 경로만)
- 카드 그림자, 반경 10px 초과, 글자 16px 초과 본문, 이모지 아이콘
- 라이트 모드만 확인하고 끝내기

## 제출 전 셀프 리뷰 (8항목, 전부 "예"여야 함)

1. hex/rgb를 한 번도 안 썼는가? (`grep -n "#[0-9a-fA-F]\{3,6\}"`가 비어 있나)
2. `.ds-shell__header`가 있고 배경이 `--shell-bg`인가?
3. 모든 버튼·입력·표·배지가 `ds-` 클래스인가?
4. 상태 배지에 아이콘과 텍스트가 모두 있는가?
5. 차트에 표 뷰 또는 직접 라벨이 있는가? 파이·이중축이 없는가?
6. 숫자 열에 `.ds-num`, 단위가 라벨에 있는가?
7. `DSTheme.toggle()`로 다크 모드를 눌러 봤을 때 읽히지 않는 글자가 없는가?
8. 720px 폭에서 가로 스크롤이 생기지 않는가?
