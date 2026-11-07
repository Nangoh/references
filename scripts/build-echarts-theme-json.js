// tokens.css → integrations/echarts-theme.{light,dark}.json, vega-config.{light,dark}.json  (node scripts/build-echarts-theme-json.js)
// 브라우저 없이 정적 테마 파일이 필요한 곳(서버 렌더, 다른 프레임워크)용. 런타임에서는 *.js 버전이 CSS 변수를 직접 읽는다.
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'tokens/tokens.css'), 'utf8');
function block(re) { const m = css.match(re); const o = {}; if (!m) return o; for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) o[k] = v.trim(); return o; }
const light = block(/:root\s*\{([\s\S]*?)\n\}/);
const dark = { ...light, ...block(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/) };
function resolve(map, val, depth = 0) { // var(--x) 참조 풀기
  if (depth > 10) return val;
  return val.replace(/var\(--([\w-]+)\)/g, (_, k) => map[k] ? resolve(map, map[k], depth + 1) : `var(--${k})`);
}
function tokens(map) { const o = {}; for (const k in map) o[k] = resolve(map, map[k]); return o; }

function echartsTheme(t) {
  const series = [1, 2, 3, 4, 5, 6, 7, 8].map(i => t[`series-${i}`]);
  const seq = [100, 200, 300, 400, 500, 600, 700].map(s => t[`seq-${s}`]);
  const font = t['font-sans'];
  const text = (color, size, weight) => ({ color, fontFamily: font, fontSize: size || 12, fontWeight: weight || 400 });
  const axis = { axisLine: { show: true, lineStyle: { color: t['chart-axis'], width: 1 } }, axisTick: { show: false },
    axisLabel: { ...text(t['chart-muted'], 12), margin: 10 }, splitLine: { show: true, lineStyle: { color: t['chart-grid'], width: 1, type: 'solid' } }, splitArea: { show: false }, nameTextStyle: text(t['chart-muted'], 12) };
  return {
    color: series, backgroundColor: 'transparent', textStyle: text(t['chart-ink-2'], 12),
    title: { textStyle: text(t['chart-ink'], 14, 600), subtextStyle: text(t['chart-muted'], 12), left: 0, top: 0 },
    grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 12, itemGap: 16, icon: 'roundRect', textStyle: text(t['fg-2'], 12), inactiveColor: t['chart-dim'] },
    tooltip: { backgroundColor: t['chart-surface'], borderColor: t['border'], borderWidth: 1, padding: [8, 12], textStyle: text(t['chart-ink'], 12), extraCssText: `box-shadow:${t['shadow-2']};border-radius:6px;` },
    categoryAxis: { ...axis, splitLine: { show: false } }, valueAxis: { ...axis, axisLine: { show: false } }, timeAxis: { ...axis, splitLine: { show: false } }, logAxis: { ...axis, axisLine: { show: false } },
    bar: { barMaxWidth: 24, barGap: '20%', barCategoryGap: '40%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
    line: { symbol: 'circle', symbolSize: 8, showSymbol: false, lineStyle: { width: 2, cap: 'round', join: 'round' }, areaStyle: { opacity: 0.1 } },
    scatter: { symbolSize: 8, itemStyle: { borderColor: t['chart-surface'], borderWidth: 2 } },
    heatmap: { itemStyle: { borderColor: t['chart-surface'], borderWidth: 2 } },
    treemap: { itemStyle: { borderColor: t['chart-surface'], borderWidth: 2, gapWidth: 2 } },
    visualMap: { inRange: { color: seq }, textStyle: text(t['chart-muted'], 11) },
    dataZoom: { borderColor: t['border'], fillerColor: 'rgba(0,145,163,0.12)', handleStyle: { color: t['chart-surface'], borderColor: t['accent'] }, textStyle: text(t['chart-muted'], 11) },
    brush: { brushStyle: { borderWidth: 1, color: 'rgba(0,145,163,0.12)', borderColor: t['accent'] } },
    toolbox: { iconStyle: { borderColor: t['chart-muted'] } },
  };
}
function vegaConfig(t) {
  const series = [1, 2, 3, 4, 5, 6, 7, 8].map(i => t[`series-${i}`]);
  const seq = [100, 200, 300, 400, 500, 600, 700].map(s => t[`seq-${s}`]);
  const div = ['div-neg-3', 'div-neg-2', 'div-neg-1', 'div-mid', 'div-pos-1', 'div-pos-2', 'div-pos-3'].map(k => t[k]);
  const font = t['font-sans'];
  return { background: 'transparent', font, padding: 8, view: { stroke: null },
    range: { category: series, ordinal: seq, heatmap: seq, diverging: div, ramp: seq },
    axis: { domainColor: t['chart-axis'], gridColor: t['chart-grid'], gridDash: [], ticks: false, labelColor: t['chart-muted'], labelFont: font, labelFontSize: 12, titleColor: t['chart-muted'], titleFont: font, titleFontSize: 12, titleFontWeight: 400 },
    axisX: { grid: false }, axisY: { domain: false },
    legend: { labelColor: t['fg-2'], labelFont: font, labelFontSize: 12, titleColor: t['chart-muted'], titleFont: font, symbolType: 'square', orient: 'top', direction: 'horizontal' },
    title: { color: t['chart-ink'], font, fontSize: 14, fontWeight: 600, anchor: 'start', subtitleColor: t['chart-muted'] },
    bar: { cornerRadiusEnd: 4, binSpacing: 2 }, rect: { stroke: t['chart-surface'], strokeWidth: 2 }, line: { strokeWidth: 2, strokeCap: 'round' }, area: { opacity: 0.1 },
    point: { size: 64, filled: true, stroke: t['chart-surface'], strokeWidth: 2 }, rule: { color: t['chart-ink-2'] }, text: { color: t['chart-ink-2'], font, fontSize: 11 }, mark: { tooltip: true } };
}
for (const [name, map] of [['light', light], ['dark', dark]]) {
  const t = tokens(map);
  fs.writeFileSync(path.join(root, `integrations/echarts-theme.${name}.json`), JSON.stringify(echartsTheme(t), null, 2) + '\n');
  fs.writeFileSync(path.join(root, `integrations/vega-config.${name}.json`), JSON.stringify(vegaConfig(t), null, 2) + '\n');
  console.log(`integrations/echarts-theme.${name}.json, vega-config.${name}.json`);
}
