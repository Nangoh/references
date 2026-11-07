# 05. 컴포넌트

구현은 `css/ds.css`, 살아 있는 예시는 `examples/showcase.html`. 모든 컴포넌트는 토큰만 쓰므로 다크 모드가 자동이다. 여기 없는 컴포넌트가 필요하면 가장 가까운 것을 확장하고 `ds.css`·showcase·이 문서에 함께 추가한다.

표기: `✓` 올바른 예, `✗` 잘못된 예.

## 앱 셸

**용도** 모든 페이지의 바깥 뼈대. 헤더는 테마와 무관하게 `--shell-bg`.

```html
<body class="ds-shell">
  <header class="ds-shell__header">
    <a class="ds-shell__brand" href="/">정산 시스템</a>
    <nav class="ds-shell__nav"><a href="/" aria-current="page">대시보드</a><a href="/orders">주문</a></nav>
    <div class="ds-shell__user">
      <button class="ds-btn ds-btn--ghost ds-btn--sm ds-theme-toggle" type="button" onclick="DSTheme.toggle()">테마</button>
      <span>홍길동</span>
    </div>
  </header>
  <aside class="ds-sidebar">…</aside>
  <main class="ds-main">…</main>
</body>
```

- 현재 메뉴는 `aria-current="page"`. 클래스가 아니라 속성으로 표시한다.
- ✗ 헤더에 페이지 제목, 검색창, 흰 배경. ✗ 헤더를 라이트 모드에서 밝게.
- 접근성: 헤더 첫 요소로 "본문으로 건너뛰기" 링크(`.ds-skip`)를 둘 수 있다.

## 사이드바

```html
<aside class="ds-sidebar">
  <a class="ds-sidebar__item is-active" href="#">승인 대기</a>
  <a class="ds-sidebar__item" href="#">처리 완료</a>
  <div class="ds-label">관리</div>
  <a class="ds-sidebar__item" href="#">사용자</a>
</aside>
```

- 항목 32px, 활성은 `.is-active`(배경 `--accent-soft`, 글자 `--accent-text`, 좌측 2px 액센트 선).
- 그룹 제목은 `.ds-label`. 1200px 미만에서 아이콘만 남기고 접힌다.

## 페이지 헤더

```html
<div class="ds-page-header">
  <h1 class="ds-page-title">주문 목록</h1>
  <div class="ds-row">
    <button class="ds-btn" type="button">내보내기</button>
    <button class="ds-btn ds-btn--primary" type="button">신규 주문</button>
  </div>
</div>
```

주 버튼(`--primary`)은 페이지에 하나. ✗ 주 버튼 세 개.

## 버튼 `.ds-btn`

| 변형 | 용도 |
|---|---|
| (기본) | 보조 동작. 테두리 + `--surface` |
| `--primary` | 페이지의 주 동작 1개. `--accent` 배경 |
| `--ghost` | 툴바, 셸 안, 셀 안의 조용한 동작 |
| `--danger` | 삭제·반려. 확인 단계 뒤에서만 |
| `--sm` / `--lg` | 28px / 40px (기본 32px) |
| `--icon` | 정사각형 아이콘 버튼. `aria-label` 필수 |

```html
✓ <button class="ds-btn ds-btn--primary" type="button">저장</button>
✓ <button class="ds-btn ds-btn--icon" type="button" aria-label="새로 고침"><svg …></svg></button>
✗ <button class="ds-btn" style="background:#0091a3">저장</button>
✗ <a class="ds-btn ds-btn--primary">저장</a>  (동작은 button, 이동은 a)
```

상태: `:hover` 한 단계 진하게, `:focus-visible` `--focus-ring`, `:disabled` 불투명도 0.5 + `cursor: not-allowed`, 로딩은 `aria-busy="true"` + 텍스트 "저장 중…".

## 폼 컨트롤

| 클래스 | 요소 |
|---|---|
| `.ds-input` | `input[type=text|search|number|date|email|password]` |
| `.ds-select` | `select` |
| `.ds-textarea` | `textarea` (최소 3줄) |
| `.ds-checkbox` / `.ds-radio` | `label` 안에 `input` + 텍스트 |
| `.ds-switch` | `input[type=checkbox][role=switch]` |

```html
<div class="ds-field">
  <label class="ds-field__label" for="amount">금액(원)</label>
  <input class="ds-input ds-num" id="amount" type="number" inputmode="numeric" placeholder="0">
  <div class="ds-field__help">부가세 포함 금액을 입력합니다.</div>
</div>
<div class="ds-field">
  <label class="ds-field__label" for="email">이메일</label>
  <input class="ds-input is-invalid" id="email" type="email" aria-invalid="true" aria-describedby="email-err" value="hong@">
  <div class="ds-field__error" id="email-err">✕ 이메일 형식이 아닙니다. @ 뒤에 도메인을 입력하세요.</div>
</div>
```

- 라벨은 항상 보이는 `<label for>`. placeholder를 라벨 대신 쓰지 않는다.
- 오류는 `.is-invalid` + `aria-invalid` + `.ds-field__error`(아이콘+원인+해결). ✗ 테두리만 빨갛게.
- 필수 표시는 라벨 끝 `*`가 아니라 도움말에 "필수"로 적거나 `required` 속성만.
- 높이 32px. 폼 안에서 컨트롤을 키우지 않는다.

## 카드 `.ds-card`

```html
<div class="ds-card">
  <div class="ds-card__header">
    <h3 class="ds-card__title">월별 매출</h3>
    <div class="ds-row"><button class="ds-btn ds-btn--ghost ds-btn--sm" type="button">표로 보기</button></div>
  </div>
  <div class="ds-card__body">…</div>
  <div class="ds-card__footer">최근 갱신 14:05</div>
</div>
```

- 테두리 1px `--border`, 배경 `--surface`, 반경 6px, **그림자 없음**. 떠 있는 것은 오버레이만.
- ✗ 카드 안에 카드. ✗ 카드 좌측 액센트 바. ✗ 카드마다 다른 패딩.

## 표 `.ds-table`

```html
<div class="ds-table-wrap">
  <table class="ds-table">
    <thead>
      <tr><th class="is-sortable" aria-sort="descending">주문일</th><th>고객</th><th class="num">금액(원)</th><th>상태</th></tr>
    </thead>
    <tbody>
      <tr class="is-selected"><td>2026-11-07</td><td>김민수</td><td class="ds-num">1,250,000</td><td><span class="ds-badge ds-badge--ok">✓ 완료</span></td></tr>
      <tr><td>2026-11-06</td><td>이서연</td><td class="ds-num">320,000</td><td><span class="ds-badge ds-badge--warn">⚠ 보류</span></td></tr>
    </tbody>
  </table>
</div>
```

- 항상 `.ds-table-wrap`으로 감싼다(좁은 화면에서 표만 가로 스크롤).
- 숫자 열은 헤더 `th.num`, 셀 `td.ds-num`. 단위는 헤더에.
- 정렬 가능 헤더는 `.is-sortable` + `aria-sort`. 선택 행은 `.is-selected`(배경 `--accent-soft`).
- 행 36px, `--compact`는 32px. 헤더 배경 `--surface-2`, 글자 `--fg-muted` 500.
- 줄무늬(zebra)는 쓰지 않는다. 호버 워시 `--surface-3`만.
- 빈 결과는 `tbody` 대신 `.ds-empty`를 보여 준다.

## 배지 `.ds-badge`

```html
✓ <span class="ds-badge ds-badge--ok">✓ 승인</span>
✓ <span class="ds-badge ds-badge--danger">✕ 반려</span>
✓ <span class="ds-badge ds-badge--neutral">대기</span>
✗ <span class="ds-badge ds-badge--ok"></span>          (아이콘·텍스트 없음)
✗ <span class="ds-badge" style="background:var(--series-3)">A안</span>  (시리즈 색을 상태처럼)
```

- 상태(`--ok|--warn|--danger|--info`)는 아이콘 + 텍스트 필수. `--neutral`은 상태 아님(태그·카테고리).
- 아이콘은 글자 모양 문자(✓ ⚠ ✕ ⓘ) 또는 16px SVG. 이모지 금지.
- 12px, 높이 20px, 반경 4px, 배경 `-soft`, 글자 `-text`.

## 탭 `.ds-tabs`

```html
<div class="ds-tabs" role="tablist">
  <button class="ds-tab is-active" role="tab" aria-selected="true" type="button">전체 <span class="ds-tab__count">128</span></button>
  <button class="ds-tab" role="tab" aria-selected="false" type="button">긴급</button>
</div>
```

활성 탭은 하단 2px `--accent` 선 + 글자 `--fg`. 비활성은 `--fg-2`. 탭이 2개 이하면 칩 필터를 쓴다.

## 필터 행과 칩

```html
<div class="ds-filter-row">
  <select class="ds-select" id="f-period"><option>최근 30일</option></select>
  <select class="ds-select" id="f-region"><option>전체 지역</option></select>
  <input class="ds-input" id="f-q" type="search" placeholder="검색">
  <span class="ds-filter-row__spacer"></span>
  <button class="ds-chip is-active" type="button">긴급 <span aria-hidden="true">×</span></button>
  <button class="ds-btn ds-btn--ghost ds-btn--sm" type="button">초기화</button>
</div>
```

콘텐츠 위 한 줄. 좁으면 줄바꿈. 적용된 필터는 `.ds-chip.is-active`로 보이고 × 로 제거.

## KPI 타일 `.ds-stat`

```html
<div class="ds-kpi-row">
  <div class="ds-stat">
    <div class="ds-stat__label">이번 달 매출</div>
    <div class="ds-stat__value">1억 2,840만</div>
    <div class="ds-stat__delta is-up">▲ 6.2% 전월 대비</div>
  </div>
</div>
```

- 라벨 12px `--fg-muted`, 값 24px 600 proportional, 델타 12px(`.is-up` `--ok-text`, `.is-down` `--danger-text`). 하락이 좋은 지표(불량률)는 클래스를 반대로 건다.
- 스파크라인은 `DSCharts.stat`을 쓰면 함께 그려진다.
- 한 행 3–5개. 타일마다 다른 높이 금지. ✗ 한 개 막대만 있는 막대 차트 대신 이걸 쓴다.

## 토스트 `.ds-toast`

```html
<div class="ds-toast-stack" aria-live="polite">
  <div class="ds-toast ds-toast--ok" role="status">✓ 저장했습니다.</div>
  <div class="ds-toast ds-toast--danger" role="alert">✕ 저장에 실패했습니다. 네트워크를 확인하고 다시 시도하세요. <button class="ds-btn ds-btn--ghost ds-btn--sm" type="button">다시 시도</button></div>
</div>
```

우하단, 360px. 성공·정보는 4초 뒤 사라지고 위험은 수동으로 닫는다. 메시지는 "무슨 일이 났고 어떻게 하면 되는지".

## 오버레이

| 클래스 | 규칙 |
|---|---|
| `.ds-modal` | `role="dialog" aria-modal="true" aria-labelledby`, 480/640px, 헤더·본문·푸터(버튼 우측 정렬, 주 버튼 맨 오른쪽). 중첩 금지 |
| `.ds-drawer` | 우측 400–560px. 뒤 화면이 보여야 하는 상세·긴 폼 |
| `.ds-dropdown` > `.ds-menu` | 트리거 아래 4px, 항목 32px, 위험 항목은 `--danger-text` |
| `.ds-tooltip` | 12px, `--n-900` 배경 + `--n-0` 글자(두 테마 공통), 400ms 지연. 필수 정보는 넣지 않는다 |

숨김은 `hidden` 속성. 열릴 때 포커스를 첫 컨트롤로, 닫힐 때 트리거로 되돌린다. Esc로 닫힌다.

## 빈 상태 · 로딩

```html
<div class="ds-empty">
  <div class="ds-empty__title">조건에 맞는 주문이 없습니다</div>
  <div class="ds-empty__hint">기간을 넓히거나 필터를 초기화해 보세요.</div>
  <button class="ds-btn" type="button">필터 초기화</button>
</div>
<div class="ds-skeleton" style="height: 120px" aria-hidden="true"></div>
```

- 빈 상태는 원인 + 다음 행동. 그림·이모지 없음.
- 스켈레톤은 **첫 로딩에만**. 재조회 때는 기존 내용을 불투명도 0.6으로 유지한다(깜빡임 금지).

## 레이아웃 유틸

| 클래스 | 동작 |
|---|---|
| `.ds-stack` | 세로 flex, gap `--sp-3` |
| `.ds-row` | 가로 flex, gap `--sp-2`, `align-items: center`, 줄바꿈 |
| `.ds-grid` | grid, `--cols`(기본 3), gap `--sp-4`, 720px 이하 1열 |
| `.ds-grid > .span-2` | 2열 차지 |

## 접근성 공통

- 모든 인터랙티브 요소는 `:focus-visible`에 `--focus-ring`.
- 아이콘만 있는 버튼은 `aria-label`. 장식 아이콘은 `aria-hidden="true"`.
- 색만으로 상태를 말하지 않는다(배지, 델타, 차트 모두).
- `prefers-reduced-motion`에서 전환 애니메이션 제거(ds.css가 처리).
- 키보드만으로 모달·드롭다운·표 정렬이 가능해야 한다.
