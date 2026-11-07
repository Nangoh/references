/* ============================================================
   Vega-Lite ↔ 디자인 토큰  (integrations/vega-config.js)
   -------------------------------------------------------------
   <script src="../vendor/vega/vega.min.js"></script>
   <script src="../vendor/vega/vega-lite.min.js"></script>
   <script src="../vendor/vega/vega-embed.min.js"></script>
   <script src="../integrations/vega-config.js"></script>
   vegaEmbed(el, spec, { config: DSVegaConfig.build(), actions: false, renderer: 'svg' });
   테마 토글 시 다시 embed 하면 된다 (window 'ds-themechange').
   정적 JSON: vega-config.light.json / .dark.json
   ============================================================ */
(function (global) {
  'use strict';
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function build() {
    const series = [1, 2, 3, 4, 5, 6, 7, 8].map(i => v(`--series-${i}`));
    const seq = [100, 200, 300, 400, 500, 600, 700].map(s => v(`--seq-${s}`));
    const div = ['--div-neg-3', '--div-neg-2', '--div-neg-1', '--div-mid', '--div-pos-1', '--div-pos-2', '--div-pos-3'].map(v);
    const font = v('--font-sans'), ink = v('--chart-ink'), ink2 = v('--chart-ink-2'), muted = v('--chart-muted'), grid = v('--chart-grid'), axis = v('--chart-axis');
    return {
      background: 'transparent',
      font,
      padding: 8,
      view: { stroke: null },
      range: { category: series, ordinal: { scheme: 'ds-seq' }, heatmap: { scheme: 'ds-seq' }, diverging: { scheme: 'ds-div' }, ramp: { scheme: 'ds-seq' } },
      axis: { domain: true, domainColor: axis, domainWidth: 1, grid: true, gridColor: grid, gridWidth: 1, gridDash: [], ticks: false,
        labelColor: muted, labelFont: font, labelFontSize: 12, labelPadding: 8, titleColor: muted, titleFont: font, titleFontSize: 12, titleFontWeight: 400, titlePadding: 10 },
      axisX: { grid: false }, axisY: { domain: false },
      legend: { labelColor: ink2, labelFont: font, labelFontSize: 12, titleColor: muted, titleFont: font, titleFontSize: 12, titleFontWeight: 500, symbolType: 'square', symbolSize: 100, orient: 'top', direction: 'horizontal' },
      title: { color: ink, font, fontSize: 14, fontWeight: 600, anchor: 'start', subtitleColor: muted, subtitleFont: font, subtitleFontSize: 12, offset: 12 },
      bar: { cornerRadiusEnd: 4, binSpacing: 2 },
      rect: { stroke: v('--chart-surface'), strokeWidth: 2 },
      line: { strokeWidth: 2, strokeCap: 'round', strokeJoin: 'round' },
      area: { opacity: 0.1, line: { strokeWidth: 2 } },
      point: { size: 64, filled: true, stroke: v('--chart-surface'), strokeWidth: 2 },
      circle: { size: 64, stroke: v('--chart-surface'), strokeWidth: 2 },
      rule: { color: ink2, strokeWidth: 1 },
      text: { color: ink2, font, fontSize: 11 },
      mark: { tooltip: true },
      header: { labelColor: ink2, labelFont: font, titleColor: ink, titleFont: font },
      _schemes: { 'ds-seq': seq, 'ds-div': div },
    };
  }
  /** vega 전역이 있으면 커스텀 스킴 등록 (ordinal/heatmap/diverging 용) */
  function registerSchemes(vega) {
    const c = build();
    vega.scheme('ds-seq', c._schemes['ds-seq']);
    vega.scheme('ds-div', c._schemes['ds-div']);
    return c;
  }
  global.DSVegaConfig = { build, registerSchemes };
})(typeof window !== 'undefined' ? window : globalThis);
