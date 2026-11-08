# references — 사내 공용 디자인 시스템 + 차트 레퍼런스

운영 중인 모든 사내 시스템의 화면을 **한 사람이 만든 것처럼** 보이게 하는 레퍼런스 저장소입니다.
사람이 읽는 가이드가 아니라, **그대로 가져다 쓰는 파일**(토큰 CSS, 컴포넌트 CSS, 차트 JS, LLM 프롬프트) 중심으로 구성했습니다.
GPT 6.1 sol, GLM-5.3 flash 같은 모델이 화면을 생성할 때 이 저장소의 규칙을 먹이면 결과물이 흔들리지 않습니다.

핵심 정체성: 페트롤 틸 액센트, 테마와 무관하게 항상 어두운 상단 셸, IBM Plex Sans KR, 촘촘한 운영툴 밀도(기본 14px, 컨트롤 32px, 반경 6px).

## 폴더 구조

| 경로 | 내용 | 누가 쓰나 |
|---|---|---|
| `tokens/tokens.css` | 색·글꼴·간격·반경 토큰, 라이트/다크. **모든 색은 여기서만 정의** | 모든 페이지 |
| `tokens/tokens.json` | 같은 값 JSON (`npm run tokens`로 생성, 손으로 수정 금지) | Figma, 타 툴 |
| `css/ds.css` | 컴포넌트 CSS — 앱 셸, 버튼, 입력, 테이블, 카드, 배지, 탭, 토스트, 필터 행, KPI 타일 | 모든 페이지 |
| `js/ds-theme.js` | 라이트/다크 토글 (`DSTheme`) | 모든 페이지 |
| `js/ds-charts.js` | 의존성 없는 SVG 차트 (`DSCharts`) — 막대, 선, 누적, 스탯 타일, 분할 바, 스파크라인, 히트맵 | 일반 대시보드 |
| `integrations/` | ECharts 테마, Vega-Lite 설정, Perspective·AG Grid 테마, Mosaic(DuckDB-WASM) 초기화 | 탐색형 화면 |
| `examples/` | 라이브 예시 페이지 + 가짜 데이터(`data/sales.csv`) | 참고·복사용 |
| `docs/` | 원칙, 색, 타이포, 레이아웃, 컴포넌트, 차트, 금지 패턴, Spotfire 대응표 | 개발자 |
| `prompts/` | 채팅형 LLM에 붙여 넣는 시스템 프롬프트 (긴 판, 짧은 판) | LLM 사용자 |
| `AGENTS.md` / `CLAUDE.md` | 코딩 에이전트가 자동으로 읽는 규칙서 | 코딩 에이전트 |
| `scripts/` | 팔레트 검증기, 토큰 JSON 빌더, vendor 복사, 로컬 서버 | 기여자, CI |
| `tests/` | Playwright 스크린샷 테스트 (라이트/다크) | CI |

## 빠른 시작

페이지 `<head>`에 세 줄을 넣습니다. 경로는 저장소 루트 기준으로 맞춰 주세요.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="../tokens/tokens.css">
<link rel="stylesheet" href="../css/ds.css">
<script src="../js/ds-theme.js"></script>
```

다크 모드는 OS 설정을 따라 자동으로 켜지고, 버튼으로 바꿀 수도 있습니다.

```html
<button class="ds-btn ds-btn--ghost ds-theme-toggle" type="button" onclick="DSTheme.toggle()">테마</button>
<script>DSTheme.set('system'); // 'light' | 'dark' | 'system'</script>
```

차트 하나는 이렇게 그립니다.

```html
<div class="ds-card"><div class="ds-card__header"><h3 class="ds-card__title">월별 매출</h3></div>
  <div class="ds-card__body" id="rev"></div></div>
<script src="../js/ds-charts.js"></script>
<script>
  DSCharts.bar(document.getElementById('rev'), {
    data: [{ m: '1월', v: 1240 }, { m: '2월', v: 1380 }, { m: '3월', v: 1510 }],
    x: 'm', y: 'v', format: 'number', title: '월별 매출(백만원)', tableView: true
  });
</script>
```

## 라이브 예시 (GitHub Pages)

| 페이지 | 주소 | 보는 것 |
|---|---|---|
| 목차 | https://nangoh.github.io/references/ | 전체 예시 링크 |
| 컴포넌트 쇼케이스 | https://nangoh.github.io/references/examples/showcase.html | 모든 컴포넌트, 라이트/다크 |
| 차트 갤러리 | https://nangoh.github.io/references/examples/charts.html | DSCharts 전 종류, 표 뷰, 툴팁 |
| 운영 대시보드 | https://nangoh.github.io/references/examples/dashboard.html | 셸 + KPI + 차트 + 테이블 조립 예 |
| Spotfire식 탐색기 | https://nangoh.github.io/references/examples/explorer.html | 마킹, 마킹 계층(마킹 안으로 드릴), 차트별 데이터 범위, 교차 필터, 드릴다운, 상세 표, 피벗 |
| 드릴다운 | https://nangoh.github.io/references/examples/drilldown.html | 계층 드릴다운 단독 예 |

예시 데이터는 `examples/data/sales.csv`(2025–2026 지점별 판매, 약 4,300행, 합성)입니다. 실제 수치가 아닙니다.

## 개발 원칙

디자인 규칙이 "어떻게 보이나"라면, [docs/00-dev-principles.md](docs/00-dev-principles.md)는 "어떻게 만드나"다. 빌드 없이 돌아가게, 재현 가능하게(CDN 금지·버전 고정), 집계는 데이터 쪽에서, 모든 화면은 라이트/다크·720px·키보드·표 뷰, 상태는 URL에, 입력은 신뢰하지 않기. LLM과 개발할 때의 규칙과 머지 전 **완료 기준 체크리스트**가 들어 있다. 사람이 짠 코드와 모델이 짠 코드에 똑같이 적용한다.

## 가져가기 — 사람이 아니라 LLM이 받아간다

GitHub Pages 가 정적 "API" 역할을 한다. 빌드 때 `npm run api` 가 `api/` 를 생성하고 그대로 배포된다 (CORS 허용, 토큰 불필요).

| 주소 | 내용 |
|---|---|
| `https://nangoh.github.io/references/llms.txt` | LLM 진입점. 규칙·파일·차트 카탈로그 위치를 한 장에 |
| `…/api/manifest.json` | 파일 목록(경로, URL, 크기, sha256), 버전, 커밋, 설치 명령, CDN 대안 |
| `…/api/charts.json` | 차트 카탈로그: 종류별 언제 쓰나 / 옵션 / 호출 예 / 예시 페이지 |
| `…/api/components.json` | ds.css 클래스 목록(블록별) |
| `…/api/tokens.json`, `…/api/prompt.txt`, `…/api/prompt-short.txt`, `…/api/agents.md` | 토큰과 규칙 전문 |
| `…/api/dist/ds.css`, `…/api/dist/ds.js` | 한 파일 번들 (토큰+컴포넌트 / 테마+차트+프롬프트) |
| `…/api/install.sh` | 필요한 파일을 프로젝트에 내려받는 스크립트 |

세 가지 사용법:

```html
<!-- 1) 복사 없이 링크만 -->
<link rel="stylesheet" href="https://nangoh.github.io/references/api/dist/ds.css">
<script src="https://nangoh.github.io/references/api/dist/ds.js"></script>
```

```bash
# 2) 프로젝트에 내려받기 (코딩 에이전트에게 이 한 줄을 주면 된다)
curl -fsSL https://nangoh.github.io/references/api/install.sh | sh -s -- ./public/ds
```

```bash
# 3) 사내 미러: 받아서 자체 서버에 두고 DS_BASE 로 가리킨다
DS_BASE=https://design.internal.example/ sh install.sh ./public/ds
```

개별 파일은 `https://nangoh.github.io/references/js/ds-charts.js` 처럼 리포 경로 그대로, CDN 이 필요하면 `https://cdn.jsdelivr.net/gh/Nangoh/references@main/js/ds-charts.js`.


## 레퍼런스 사이트에서 클릭 한 번 → 사내 LLM 세션에 Ctrl+V

차트 갤러리(`examples/charts.html`), 대시보드, 드릴다운 페이지의 모든 차트 오른쪽 위에 **복사** 버튼이 있다.

1. 마음에 드는 차트에서 **복사** 클릭 (한 번이면 끝, 토스트로 확인)
2. 사내 LLM 세션(Claude / GPT / GLM)에 **Ctrl+V**

붙여넣은 세션은 "이 차트를 내 화면에 적용해라"는 지시와 함께 차트 사양(종류·x·y·제목·데이터), 그대로 호출할 코드, 디자인 규칙 요약, 파일을 자동으로 가져오는 방법(번들 링크 / install.sh / manifest)을 받는다. x/y 는 레퍼런스 샘플 기준이라 "내 데이터 컬럼명으로 바꾸고 모르면 질문하라"고 적혀 있다.

- **▾ (옵션)**: x/y/제목/데이터 설명을 고쳐서 복사, 코드만 복사, 파일 받기 명령 복사.
- **라이브러리 소스 포함**: 세션이 외부 URL 을 못 받는 폐쇄망이면 ▾ 에서 이 옵션을 켠다. tokens.css·ds.css·ds-theme.js·ds-charts.js 원문(약 127KB)이 프롬프트 끝에 붙는다. 한 번 켜면 기억되어 이후 한 번 클릭에도 적용된다.

구현은 `js/ds-prompt.js`. 다른 페이지의 ECharts 차트에도 `data-ds-prompt` 속성과 `<script type="text/plain" data-ds-prompt-code>` 템플릿으로 같은 버튼을 붙일 수 있다.

## LLM에 먹이는 방법

1. **코딩 에이전트(Claude Code, Codex, Cursor 등)** — 이 저장소를 작업 폴더에 두면 루트의 `AGENTS.md`(또는 `CLAUDE.md`)를 자동으로 읽습니다. 다른 저장소에서 쓸 때는 두 파일을 그 저장소 루트에 복사하고 경로만 고칩니다.
2. **채팅형(GPT, GLM 웹 UI 등)** — `prompts/system-prompt.md`를 시스템 프롬프트에 붙입니다. 컨텍스트가 작은 모델은 `prompts/system-prompt-short.md`를 씁니다. 요청할 때 "AGENTS.md 규칙으로"라고 한 줄 덧붙이면 더 안정적입니다.
3. **기존 시스템에 적용** — 순서를 지키면 중간 상태에서도 화면이 깨지지 않습니다.
   1. `tokens.css`를 추가하고 기존 색 변수를 토큰으로 매핑
   2. 상단 헤더를 `.ds-shell__header`로 교체 (여기서 "같은 회사 시스템" 인상이 생김)
   3. 버튼·입력·테이블·배지를 `ds-` 클래스로 치환
   4. 차트를 `DSCharts` 또는 `integrations/echarts-theme.js`로 교체

## 외부 라이브러리 정책

- 외부 CDN(jsDelivr, unpkg, cdnjs)을 HTML에서 직접 참조하지 않습니다. 사내망에서 막히거나 버전이 바뀌면 화면이 조용히 깨집니다.
- 대신 `npm install && npm run vendor`로 `vendor/`에 복사해 두고 `../vendor/...` 상대 경로로 참조합니다. `vendor/`는 git에 넣지 않으며 CI가 배포 전에 생성합니다.
- 글꼴만 예외로 Google Fonts를 허용합니다. 사내망에서 막히면 `docs/03-typography.md`의 셀프호스팅 방법을 따릅니다.

## 스크립트

| 명령 | 동작 |
|---|---|
| `npm run vendor` | node_modules에서 필요한 배포 파일만 `vendor/`로 복사 |
| `npm run tokens` | `tokens.css` → `tokens.json` 생성 |
| `npm run validate:palette` | 차트 8색을 라이트/다크 표면에서 색약 안전성·대비 검증 |
| `npm run test` | Playwright로 예시 페이지를 라이트/다크 스크린샷 (콘솔 에러 시 실패) |
| `npm run serve` | 로컬 정적 서버 (http://localhost:8080) |

## 기여 규칙

- 색을 바꾸면 `tokens.css`의 원시 팔레트만 수정하고 `npm run tokens`, `npm run validate:palette`를 통과시킵니다. 검증 실패 상태로 올리지 않습니다.
- 컴포넌트 CSS, 예시, 문서에 hex 값을 직접 쓰지 않습니다. 항상 `var(--토큰)`.
- 새 컴포넌트는 `css/ds.css`에 추가하고 `examples/showcase.html`과 `docs/05-components.md`에 함께 올립니다.
- 차트 종류를 늘릴 때는 `docs/06-charts.md`의 선택표에 자리를 먼저 만듭니다.

## 라이선스

이 저장소의 자체 코드는 사내 사용 기준입니다. 포함·참조하는 외부 라이브러리는 아래와 같습니다.

| 라이브러리 | 라이선스 | 역할 |
|---|---|---|
| Apache ECharts | Apache-2.0 | 트리맵·선버스트 드릴다운, 다양한 차트 |
| AG Grid Community | MIT | 상세 표(details-on-demand) |
| FINOS Perspective | Apache-2.0 | 피벗·크로스 테이블 |
| Mosaic (uwdata) | BSD-3-Clause | 마킹·교차 필터 코디네이터 |
| DuckDB-WASM | MIT | 브라우저 내 SQL 엔진 |
| Vega / Vega-Lite | BSD-3-Clause | 선언형 차트 (LLM 생성용) |
