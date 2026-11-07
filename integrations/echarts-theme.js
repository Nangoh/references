/* ============================================================
   ECharts ↔ 디자인 토큰 연동  (integrations/echarts-theme.js)
   -------------------------------------------------------------
   <script src="../vendor/echarts/echarts.min.js"></script>
   <script src="../integrations/echarts-theme.js"></script>
   DSEchartsTheme.register(echarts);                 // 테마 'ds' 등록 (현재 라이트/다크 기준)
   const chart = echarts.init(el, 'ds');             // 사용
   // 테마 토글 시: ECharts 는 테마 핫스왑이 안 되므로 dispose 후 재생성
   DSEchartsTheme.bind(chart, () => option);         // 'ds-themechange' 를 받아 자동 재구성

   모든 색은 tokens.css 의 CSS 변수에서 "호출 시점"에 읽는다 → 라이트/다크 모두 한 코드.
   정적 JSON 이 필요하면 echarts-theme.light.json / .dark.json (scripts/build-echarts-theme-json.js 생성).
   ============================================================ */
(function (global) {
  'use strict';
  const cssVar = (name, el) => getComputedStyle(el || document.documentElement).getPropertyValue(name).trim();

  function colors(el) {
    const v = (n) => cssVar(n, el);
    return {
      series: [1, 2, 3, 4, 5, 6, 7, 8].map(i => v(`--series-${i}`)),
      other: v('--series-other'),
      seq: [100, 200, 300, 400, 500, 600, 700].map(s => v(`--seq-${s}`)),
      div: ['--div-neg-3', '--div-neg-2', '--div-neg-1', '--div-mid', '--div-pos-1', '--div-pos-2', '--div-pos-3'].map(v),
      surface: v('--chart-surface'), grid: v('--chart-grid'), axis: v('--chart-axis'),
      ink: v('--chart-ink'), ink2: v('--chart-ink-2'), muted: v('--chart-muted'), dim: v('--chart-dim'), mark: v('--chart-mark'),
      accent: v('--accent'), accentSoft: v('--accent-soft'), border: v('--border'), fg: v('--fg'), fg2: v('--fg-2'),
      font: v('--font-sans') || 'system-ui, sans-serif', mono: v('--font-mono') || 'monospace',
      shadow: v('--shadow-2'),
    };
  }

  /** 토큰 → ECharts 테마 객체 */
  function build(el) {
    const c = colors(el);
    const text = (color, size, weight) => ({ color, fontFamily: c.font, fontSize: size || 12, fontWeight: weight || 400 });
    const axis = {
      axisLine: { show: true, lineStyle: { color: c.axis, width: 1 } },
      axisTick: { show: false },
      axisLabel: { ...text(c.muted, 12), margin: 10, hideOverlap: true },
      splitLine: { show: true, lineStyle: { color: c.grid, width: 1, type: 'solid' } },
      splitArea: { show: false },
      nameTextStyle: text(c.muted, 12),
    };
    return {
      color: c.series,
      backgroundColor: 'transparent',
      textStyle: text(c.ink2, 12),
      title: { textStyle: text(c.ink, 14, 600), subtextStyle: text(c.muted, 12), left: 0, top: 0, itemGap: 4 },
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      legend: {
        top: 0, right: 0, itemWidth: 12, itemHeight: 12, itemGap: 16, icon: 'roundRect',
        textStyle: text(c.fg2, 12), inactiveColor: c.dim, pageTextStyle: text(c.muted, 12), pageIconColor: c.fg2, pageIconInactiveColor: c.dim,
      },
      tooltip: {
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, padding: [8, 12], extraCssText: `box-shadow:${c.shadow};border-radius:6px;`,
        textStyle: text(c.ink, 12),
        axisPointer: { type: 'line', lineStyle: { color: c.axis, width: 1 }, crossStyle: { color: c.axis }, shadowStyle: { color: 'rgba(0,0,0,0.04)' } },
      },
      categoryAxis: { ...axis, splitLine: { show: false }, boundaryGap: true },
      valueAxis: { ...axis, axisLine: { show: false } },
      timeAxis: { ...axis, splitLine: { show: false } },
      logAxis: { ...axis, axisLine: { show: false } },
      bar: { barMaxWidth: 24, barGap: '20%', barCategoryGap: '40%', itemStyle: { borderRadius: [4, 4, 0, 0], borderColor: c.surface, borderWidth: 0 }, label: text(c.ink2, 11) },
      line: { smooth: false, symbol: 'circle', symbolSize: 8, showSymbol: false, lineStyle: { width: 2, cap: 'round', join: 'round' }, areaStyle: { opacity: 0.1 }, emphasis: { focus: 'series', scale: 1.2 }, label: text(c.ink2, 11) },
      scatter: { symbolSize: 8, itemStyle: { borderColor: c.surface, borderWidth: 2 } },
      heatmap: { itemStyle: { borderColor: c.surface, borderWidth: 2, borderRadius: 2 }, label: text(c.ink2, 11) },
      treemap: { breadcrumb: { itemStyle: { color: c.accentSoft, textStyle: text(c.fg, 12) } }, itemStyle: { borderColor: c.surface, borderWidth: 2, gapWidth: 2 }, label: text('#fff', 12) },
      sunburst: { itemStyle: { borderColor: c.surface, borderWidth: 2 } },
      pie: { itemStyle: { borderColor: c.surface, borderWidth: 2 } },
      visualMap: { inRange: { color: c.seq }, textStyle: text(c.muted, 11), itemWidth: 12, itemHeight: 96, calculable: true, handleStyle: { borderColor: c.border } },
      dataZoom: {
        borderColor: c.border, fillerColor: hexToRgba(c.accent, 0.12), backgroundColor: 'transparent', height: 20, bottom: 0,
        handleStyle: { color: c.surface, borderColor: c.accent }, moveHandleStyle: { color: c.accent, opacity: .6 },
        dataBackground: { lineStyle: { color: c.axis }, areaStyle: { color: c.grid } },
        selectedDataBackground: { lineStyle: { color: c.accent }, areaStyle: { color: hexToRgba(c.accent, .25) } },
        textStyle: text(c.muted, 11), brushStyle: { color: hexToRgba(c.accent, .15) },
      },
      brush: { brushStyle: { borderWidth: 1, color: hexToRgba(c.accent, .12), borderColor: c.accent }, outOfBrush: { colorAlpha: 0.25 } },
      toolbox: { iconStyle: { borderColor: c.muted }, emphasis: { iconStyle: { borderColor: c.accent } } },
      markLine: { lineStyle: { color: c.ink2, width: 1, type: 'dashed' }, label: text(c.ink2, 11) },
      markPoint: { label: text('#fff', 11) },
      axisPointer: { lineStyle: { color: c.axis }, label: { ...text(c.ink, 11), backgroundColor: c.surface, borderColor: c.border } },
      /* 커스텀 확장 — ECharts 테마 스키마 외 필드. 사용자가 option 작성 시 참고 */
      _ds: c,
    };
  }

  function hexToRgba(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }

  const bound = new Set();

  const DSEchartsTheme = {
    name: 'ds',
    colors,
    build,
    /** 현재 테마 기준으로 'ds' 등록(재등록). 테마 토글 후 다시 호출해야 새 색이 반영된다. */
    register(echarts, el) {
      echarts.registerTheme('ds', build(el));
      return 'ds';
    },
    /**
     * 테마 토글(ds-themechange) 시 차트를 dispose → 재init → optionFn() 재적용.
     * chart 의 DOM/크기/이벤트 바인딩이 유지되도록 handlers 를 돌려준다.
     * 반환: { chart() , dispose() }  (chart() 는 항상 최신 인스턴스)
     */
    bind(echarts, el, optionFn, { onInit } = {}) {
      let chart = echarts.init(el, DSEchartsTheme.register(echarts), { renderer: 'canvas' });
      const ref = {
        get chart() { return chart; },
        setOption(o, opts) { chart.setOption(o, opts); },
        resize() { chart.resize(); },
        dispose() { bound.delete(ref); chart.dispose(); },
        rebuild() {
          const opt = optionFn();
          chart.dispose();
          chart = echarts.init(el, DSEchartsTheme.register(echarts), { renderer: 'canvas' });
          if (onInit) onInit(chart);
          chart.setOption(opt, true);
        },
      };
      if (onInit) onInit(chart);
      chart.setOption(optionFn(), true);
      bound.add(ref);
      return ref;
    },
    /** 모든 bind 된 차트 재구성 (ds-theme.js 가 'ds-themechange' 를 window 에 dispatch) */
    rebuildAll() { for (const r of bound) r.rebuild(); },
    hexToRgba,
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('ds-themechange', () => DSEchartsTheme.rebuildAll());
  }
  global.DSEchartsTheme = DSEchartsTheme;
  if (typeof module !== 'undefined' && module.exports) module.exports = DSEchartsTheme;
})(typeof window !== 'undefined' ? window : globalThis);
