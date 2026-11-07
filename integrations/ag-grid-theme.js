/* ============================================================
   AG Grid (v33+ Theming API) ↔ 디자인 토큰  (integrations/ag-grid-theme.js)
   -------------------------------------------------------------
   <script src="../vendor/ag-grid/ag-grid-community.min.js"></script>
   <script src="../integrations/ag-grid-theme.js"></script>
   const api = agGrid.createGrid(el, { theme: DSAgGridTheme.theme(), ...gridOptions });
   테마 토글 시: api.setGridOption('theme', DSAgGridTheme.theme())   (window 'ds-themechange')

   Theming API 는 CSS 변수를 값으로 받을 수 있다 → 'var(--surface)' 를 그대로 넘기면
   라이트/다크 토글이 재적용 없이도 따라오지만, 일부 파생값(테두리 투명도 등)은 색을 직접
   읽어야 하므로 아래는 "현재 값"을 읽어 넘기고 토글 시 재적용하는 안전한 방식.
   레거시 CSS 테마(ag-theme-quartz.css) 를 쓰는 곳은 ag-grid-theme.css 의 .ag-theme-ds 를 사용.
   ============================================================ */
(function (global) {
  'use strict';
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function params() {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark';
    return {
      browserColorScheme: dark ? 'dark' : 'light',
      fontFamily: v('--font-sans'), fontSize: 13, headerFontSize: 12, headerFontWeight: 500,
      accentColor: v('--accent'),
      backgroundColor: v('--surface'), foregroundColor: v('--fg'),
      headerBackgroundColor: v('--surface-2'), headerTextColor: v('--fg-2'),
      chromeBackgroundColor: v('--surface-2'),
      borderColor: v('--border'), rowBorder: { color: v('--border') }, columnBorder: false, headerColumnBorder: false,
      headerColumnResizeHandleColor: v('--border-strong'),
      oddRowBackgroundColor: v('--surface'),
      rowHoverColor: v('--surface-3'), columnHoverColor: 'transparent',
      selectedRowBackgroundColor: v('--accent-soft'),
      rangeSelectionBorderColor: v('--accent'), rangeSelectionBackgroundColor: 'color-mix(in srgb, ' + v('--accent') + ' 12%, transparent)',
      inputBackgroundColor: v('--surface'), inputBorder: { color: v('--border-strong') }, inputFocusBorder: { color: v('--accent') },
      menuBackgroundColor: v('--surface'), menuBorder: { color: v('--border') }, menuShadow: v('--shadow-2'),
      tooltipBackgroundColor: v('--surface'), tooltipTextColor: v('--fg'),
      borderRadius: 4, wrapperBorderRadius: 6, wrapperBorder: { color: v('--border') },
      rowHeight: 36, headerHeight: 36, listItemHeight: 28, spacing: 6, cellHorizontalPadding: 12,
      iconSize: 14, iconColor: v('--fg-muted'),
      textColor: v('--fg'), subtleTextColor: v('--fg-muted'),
      checkboxCheckedBackgroundColor: v('--accent'), checkboxCheckedBorderColor: v('--accent'), checkboxUncheckedBorderColor: v('--border-strong'),
      focusShadow: v('--focus-ring'),
    };
  }
  function theme() {
    const ag = global.agGrid;
    if (!ag || !ag.themeQuartz) throw new Error('agGrid.themeQuartz 를 찾을 수 없음 — ag-grid-community v33+ 전체 번들을 먼저 로드하세요');
    return ag.themeQuartz.withParams(params());
  }
  /** 생성한 grid api 들을 등록해두면 테마 토글 시 자동 재적용 */
  const apis = new Set();
  function track(api) { apis.add(api); return api; }
  if (typeof window !== 'undefined') window.addEventListener('ds-themechange', () => { for (const a of apis) { try { a.setGridOption('theme', theme()); } catch {} } });
  global.DSAgGridTheme = { params, theme, track };
})(typeof window !== 'undefined' ? window : globalThis);
