# 03. 타이포그래피

## 글꼴

| 토큰 | 값 | 용도 |
|---|---|---|
| `--font-sans` | IBM Plex Sans KR → IBM Plex Sans → Pretendard → 시스템 | 본문, 제목, 숫자, 차트 |
| `--font-mono` | IBM Plex Mono → ui-monospace → Menlo/Consolas | 코드, 문서번호, ID, 로그 |

Google Fonts에서 두 글꼴을 한 번에 불러온다. 굵기는 400·500·600(산세리프), 400·500(모노)만 쓴다.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

세리프·디스플레이 글꼴은 어디에도 쓰지 않는다. 대표 숫자(hero)도 같은 산세리프다.

## 스케일

| 토큰 | 크기 / 행간 | 용도 |
|---|---|---|
| `--text-xs` | 12 / 16 | 캡션, 축 눈금, 배지 |
| `--text-sm` | 13 / 18 | 표 셀(compact), 보조 설명 |
| `--text-md` | 14 / 20 | **기본 본문**, 컨트롤, 표 셀 |
| `--text-lg` | 16 / 24 | 카드 제목, 강조 본문 |
| `--text-xl` | 20 / 28 | 페이지 제목 (`.ds-page-title`) |
| `--text-2xl` | 24 / 32 | KPI 값 (`.ds-stat__value`) |
| `--text-3xl` | 32 / 40 | 큰 KPI, 섹션 대제목 |
| `--text-hero` | 48 / 56 | 대시보드 대표 숫자, 화면당 1개 |

본문을 16px로 키우지 않는다. 운영 도구는 한 화면에 많이 보여야 한다.

## 굵기

| 토큰 | 값 | 용도 |
|---|---|---|
| `--weight-regular` | 400 | 본문, 표 셀 |
| `--weight-medium` | 500 | 버튼, 탭, 표 헤더, 라벨 |
| `--weight-semibold` | 600 | 제목, KPI 값 |

700 이상은 쓰지 않는다. 강조는 굵기보다 색(`--fg` vs `--fg-2`)과 크기로 한다.

## 숫자 규칙

| 상황 | 설정 | 클래스 |
|---|---|---|
| 표 열, 축 눈금, 정렬이 필요한 숫자 | `font-variant-numeric: tabular-nums`, 우측 정렬 | `.ds-num` |
| KPI 값, 대표 숫자 | proportional(기본값) | `.ds-stat__value` |
| 통화 | 천 단위 콤마, 단위는 라벨에: "금액(원)", "매출(백만원)" | |
| 음수 | `−1,250` (U+2212), 괄호 표기 안 함 | |
| 날짜 | `2026-11-07`, 시각 `14:05` | `.ds-mono` 선택 |
| 식별자(문서번호, 코드) | 모노 | `.ds-mono` |

큰 숫자에 `tabular-nums`를 걸면 `1`이 떠 보인다. 열이 아니면 걸지 않는다.

## 라벨과 문단

- 소형 라벨(`.ds-label`, `.ds-stat__label`, 표 헤더)은 12–13px, `--fg-muted`, 자간 `--tracking-label`(0.04em). 영문이면 대문자 가능, 한국어는 대문자 개념이 없으므로 자간만.
- 문단 줄폭은 65자 안쪽(`max-width: 65ch`). 설명문이 카드 폭을 가득 채우지 않게 한다.
- 제목에 `text-wrap: balance`.
- 말줄임이 필요한 셀은 `text-overflow: ellipsis` + `title` 속성. 잘리는 글자를 그대로 두지 않는다.

## 유틸 클래스

| 클래스 | 설정 |
|---|---|
| `.ds-h1` | `--text-2xl`, 600 |
| `.ds-h2` | `--text-xl`, 600 |
| `.ds-h3` | `--text-lg`, 600 |
| `.ds-label` | `--text-xs`, 500, `--fg-muted`, 자간 |
| `.ds-mono` | `--font-mono` |
| `.ds-num` | tabular, 우측 정렬 |

## Pretendard로 바꾸기

회사 표준이 Pretendard라면 토큰 한 줄만 바꾼다.

```css
--font-sans: "Pretendard Variable", Pretendard, -apple-system, "Segoe UI", "Apple SD Gothic Neo", sans-serif;
```

사내망에서 외부 글꼴이 막히면 셀프호스팅한다. `fonts/` 폴더에 woff2를 두고 `tokens.css` 상단에 `@font-face`를 선언한 뒤 Google Fonts `<link>`를 제거한다. 이때도 `font-display: swap`과 시스템 글꼴 폴백은 유지한다.
