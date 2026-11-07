/* ============================================================
   DSCharts — 사내 디자인 시스템 차트 라이브러리 (의존성 없음, SVG)
   -------------------------------------------------------------
   사용:  <script src="js/ds-charts.js"></script>
          const c = DSCharts.bar(el, { data, x:'region', y:'revenue' });
          c.update({ data: newRows });  c.toggleTable();  c.destroy();

   규칙(고정):
   - 색은 전부 tokens.css 의 CSS 변수에서 렌더 시점에 읽는다. 하드코딩 없음.
   - 시리즈 색은 --series-1..8 고정 순서. 9개 이상이면 뒤쪽을 "기타"로 접는다.
   - 막대 ≤24px, 데이터 끝 4px 라운드 + 기준선은 직각, 인접/누적 사이 2px 표면색 간격.
   - 선 2px, 끝점 마커 ≥8px + 2px 표면색 링. 격자는 1px 실선 헤어라인.
   - 2개 이상 시리즈면 범례 항상, 직접 라벨은 선택적으로(끝점/최댓값).
   - 글자는 시리즈 색을 입지 않는다 (ink 토큰만).
   - 모든 차트는 "표로 보기" 쌍둥이(table twin)를 가진다.
   - 호버 레이어 기본 제공. 히트 타깃 ≥24px. 키보드 포커스도 같은 툴팁.
   - 상태색(--ok/--warn/--danger)은 시리즈 색으로 쓰지 않는다. 델타 방향에만 쓴다.
   ============================================================ */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const SERIES_MAX = 8;
  const OTHER = '기타';

  /* ---------------- 스타일 (토큰만 참조) ---------------- */
  const STYLE = `
.ds-chart{position:relative;display:flex;flex-direction:column;gap:var(--sp-2,8px);min-width:0;font-family:var(--font-sans,system-ui,sans-serif);color:var(--fg,#111);}
.ds-chart__head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--sp-3,12px);min-width:0}
.ds-chart__titles{min-width:0}
.ds-chart__title{font-size:var(--text-md,14px);line-height:var(--lh-md,20px);font-weight:var(--weight-semibold,600);margin:0;text-wrap:balance}
.ds-chart__subtitle{font-size:var(--text-sm,13px);line-height:var(--lh-sm,18px);color:var(--fg-2,#555);margin:0}
.ds-chart__tools{display:flex;gap:var(--sp-1,4px);flex-shrink:0}
.ds-chart__tool{appearance:none;border:1px solid var(--border,#ddd);background:var(--surface,#fff);color:var(--fg-2,#555);font:inherit;font-size:var(--text-xs,12px);line-height:16px;padding:3px 8px;border-radius:var(--r-sm,4px);cursor:pointer}
.ds-chart__tool:hover{background:var(--surface-3,#eee);color:var(--fg,#111)}
.ds-chart__tool:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.ds-chart__tool[aria-pressed="true"]{background:var(--accent-soft,#eef);color:var(--accent-text,#036);border-color:var(--accent,#09a)}
.ds-chart__legend{display:flex;flex-wrap:wrap;gap:var(--sp-1,4px) var(--sp-4,16px);margin:0;padding:0;list-style:none;font-size:var(--text-xs,12px);line-height:16px;color:var(--fg-2,#555)}
.ds-chart__legend li{display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none;border-radius:var(--r-sm,4px);padding:1px 2px}
.ds-chart__legend li:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.ds-chart__legend li.is-off{opacity:.45;text-decoration:line-through}
.ds-chart__legend .sw{width:10px;height:10px;border-radius:2px;flex-shrink:0}
.ds-chart__legend .sw--line{width:14px;height:2px;border-radius:1px}
.ds-chart__plot{position:relative;min-width:0}
.ds-chart__plot svg{display:block;width:100%;height:auto;overflow:visible}
.ds-chart__plot svg text{font-family:var(--font-sans,system-ui,sans-serif)}
.ds-chart__plot .tick,.ds-chart__plot .axlabel{font-variant-numeric:tabular-nums}
.ds-chart__plot .hit{fill:transparent;cursor:pointer;outline:none}
.ds-chart__plot .hit:focus-visible{stroke:var(--accent,#09a);stroke-width:2;stroke-dasharray:none}
.ds-chart__tip{position:absolute;z-index:var(--z-tooltip,600);pointer-events:none;background:var(--surface,#fff);color:var(--fg,#111);border:1px solid var(--border-strong,#ccc);border-radius:var(--r-md,6px);box-shadow:var(--shadow-2);padding:6px 10px;font-size:var(--text-xs,12px);line-height:16px;min-width:120px;max-width:260px;opacity:0;transition:opacity var(--dur-fast,120ms)}
.ds-chart__tip.is-on{opacity:1}
.ds-chart__tip .tip-h{color:var(--fg-2,#555);margin-bottom:4px;font-weight:var(--weight-medium,500)}
.ds-chart__tip .tip-r{display:flex;align-items:center;gap:6px;white-space:nowrap}
.ds-chart__tip .tip-k{width:12px;height:2px;border-radius:1px;flex-shrink:0}
.ds-chart__tip .tip-k--sq{width:8px;height:8px;border-radius:2px}
.ds-chart__tip .tip-v{font-weight:var(--weight-semibold,600);font-variant-numeric:tabular-nums;margin-left:auto;padding-left:10px}
.ds-chart__tip .tip-n{color:var(--fg-2,#555)}
.ds-chart__table{overflow:auto;max-height:320px;border:1px solid var(--border,#ddd);border-radius:var(--r-md,6px)}
.ds-chart__table table{border-collapse:collapse;width:100%;font-size:var(--text-sm,13px);line-height:18px}
.ds-chart__table th,.ds-chart__table td{padding:5px 10px;text-align:left;border-bottom:1px solid var(--border,#ddd);white-space:nowrap}
.ds-chart__table th{background:var(--surface-2,#f4f4f4);color:var(--fg-2,#555);font-weight:var(--weight-medium,500);position:sticky;top:0}
.ds-chart__table tr:last-child td{border-bottom:none}
.ds-chart__table .num{text-align:right;font-variant-numeric:tabular-nums}
.ds-chart__table tr.is-selected td{background:var(--accent-soft,#eef)}
.ds-chart__caption{font-size:var(--text-xs,12px);line-height:16px;color:var(--fg-muted,#777);margin:0}
.ds-chart--stat .ds-chart__head{display:none}
.ds-stat-tile{display:flex;flex-direction:column;gap:2px;min-width:0}
.ds-stat-tile__label{font-size:var(--text-sm,13px);line-height:18px;color:var(--fg-2,#555)}
.ds-stat-tile__row{display:flex;align-items:flex-end;justify-content:space-between;gap:var(--sp-3,12px)}
.ds-stat-tile__value{font-size:var(--text-2xl,24px);line-height:var(--lh-2xl,32px);font-weight:var(--weight-semibold,600);letter-spacing:-.01em;white-space:nowrap}
.ds-stat-tile--hero .ds-stat-tile__value{font-size:var(--text-hero,48px);line-height:var(--lh-hero,56px)}
.ds-stat-tile__delta{display:inline-flex;align-items:center;gap:4px;font-size:var(--text-xs,12px);line-height:16px;color:var(--fg-2,#555);font-variant-numeric:tabular-nums}
.ds-stat-tile__delta .d{font-weight:var(--weight-semibold,600)}
.ds-stat-tile__delta.is-good .d{color:var(--ok-text)}
.ds-stat-tile__delta.is-bad .d{color:var(--danger-text)}
.ds-stat-tile__trend svg{display:block}
.ds-seg{display:flex;flex-direction:column;gap:var(--sp-2,8px)}
.ds-seg__bar{display:flex;gap:2px;width:100%}
.ds-seg__bar--thin{height:8px;border-radius:999px;overflow:hidden}
.ds-seg__bar--dense{height:4px;border-radius:999px;overflow:hidden}
.ds-seg__bar--tall{height:28px}
.ds-seg__part{position:relative;min-width:0;height:100%;outline:none;cursor:default}
.ds-seg__bar--tall .ds-seg__part{border-radius:4px;display:flex;align-items:center;padding:0 8px;font-size:var(--text-xs,12px);line-height:16px;font-weight:var(--weight-semibold,600);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden}
.ds-seg__part:focus-visible{box-shadow:var(--focus-ring)}
.ds-seg__part .lbl{visibility:hidden}
.ds-seg__part.has-label .lbl{visibility:visible}
.ds-chart__scale{display:flex;align-items:center;gap:8px;font-size:var(--text-xs,12px);line-height:16px;color:var(--fg-2,#555);font-variant-numeric:tabular-nums}
.ds-chart__scale .ramp{display:flex;height:8px;border-radius:2px;overflow:hidden;flex:0 0 112px}
.ds-chart__scale .ramp span{flex:1}
@media (prefers-reduced-motion:reduce){.ds-chart__tip{transition:none}}
`;
  function ensureStyle() {
    if (document.getElementById('ds-charts-style')) return;
    const s = document.createElement('style'); s.id = 'ds-charts-style'; s.textContent = STYLE; document.head.appendChild(s);
  }

  /* ---------------- 토큰 읽기 ---------------- */
  function readTokens(el) {
    const cs = getComputedStyle(el);
    const g = (n, fb) => (cs.getPropertyValue(n) || '').trim() || fb;
    return {
      series: [1, 2, 3, 4, 5, 6, 7, 8].map(i => g('--series-' + i, '#888')),
      other: g('--series-other', '#aaa'),
      surface: g('--chart-surface', g('--surface', '#fff')),
      grid: g('--chart-grid', '#e5e5e5'), axis: g('--chart-axis', '#ccc'),
      ink: g('--chart-ink', '#111'), ink2: g('--chart-ink-2', '#555'), muted: g('--chart-muted', '#777'),
      dim: g('--chart-dim', '#ddd'), mark: g('--chart-mark', '#09a'), accent: g('--accent', '#09a'),
      seq: [100, 200, 300, 400, 500, 600, 700].map(i => g('--seq-' + i, '#999')),
      divNeg: [g('--div-neg-1'), g('--div-neg-2'), g('--div-neg-3')], divMid: g('--div-mid', '#ddd'), divPos: [g('--div-pos-1'), g('--div-pos-2'), g('--div-pos-3')],
      fontSans: g('--font-sans', 'system-ui, sans-serif'),
    };
  }
  // 채움 위 글자색: 밝은 채움(옐로 계열)만 near-black
  function inkOn(hex, T) {
    const c = hex.replace('#', ''); if (c.length < 6) return '#ffffff';
    const r = parseInt(c.slice(0, 2), 16), gg = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const lum = (0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255;
    return lum > 0.6 ? '#0b0b0b' : '#ffffff';
  }

  /* ---------------- 포맷 ---------------- */
  const nf = new Intl.NumberFormat('ko-KR');
  const nf1 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1 });
  function compactKRW(v) {
    const a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e12) return s + nf1.format(a / 1e12) + '조';
    if (a >= 1e8) return s + nf1.format(a / 1e8) + '억';
    if (a >= 1e4) return s + nf.format(Math.round(a / 1e4)) + '만';
    return s + nf.format(Math.round(a));
  }
  function compactNum(v) {
    const a = Math.abs(v), s = v < 0 ? '-' : '';
    if (a >= 1e8) return s + nf1.format(a / 1e8) + '억';
    if (a >= 1e4) return s + nf1.format(a / 1e4) + '만';
    if (a >= 1e3) return s + nf1.format(a / 1e3) + 'K';
    return s + nf.format(a);
  }
  function formatter(f) {
    if (typeof f === 'function') return f;
    switch (f) {
      case 'currency': return v => '₩' + nf.format(Math.round(v));
      case 'compact-krw': return v => compactKRW(v);
      case 'compact': return v => compactNum(v);
      case 'percent': return v => nf1.format(v * 100) + '%';
      case 'percent-point': return v => (v > 0 ? '+' : '') + nf1.format(v) + '%';
      case 'integer': return v => nf.format(Math.round(v));
      default: return v => (Number.isInteger(v) ? nf.format(v) : nf1.format(v));
    }
  }
  // 축 눈금 포맷: 축마다 한 스타일. 최댓값이 1만 이상이면 압축 표기.
  function axisFormatter(f, maxAbs) {
    if (typeof f === 'function') return f;
    if (f === 'percent') return v => nf1.format(v * 100) + '%';
    if (f === 'percent-point') return v => nf1.format(v) + '%';
    if (f === 'currency' || f === 'compact-krw') return v => compactKRW(v);
    if (maxAbs >= 10000) return v => compactNum(v);
    return v => nf.format(v);
  }
  // 글자폭 근사 (한글 1.0em, 그 외 0.58em)
  function textW(str, size) {
    let w = 0; for (const ch of String(str)) w += /[ᄀ-ᇿ㄰-㆏가-힯　-〿＀-￯]/.test(ch) ? size : size * 0.58; return w;
  }
  function niceTicks(min, max, count) {
    if (min === max) { max = min === 0 ? 1 : min * 1.1; min = min === 0 ? 0 : min * 0.9; }
    const span = max - min, raw = span / Math.max(1, count), mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag; const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step; const t = [];
    for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
    return { ticks: t, lo, hi: t[t.length - 1] };
  }
  const sum = a => a.reduce((s, v) => s + (+v || 0), 0);

  /* ---------------- SVG 헬퍼 ---------------- */
  function S(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function H(tag, cls, parent, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  // 데이터 끝만 둥근 막대. side: 'top'|'right'|'bottom'|'left'|'none'
  function barPath(x, y, w, h, r, side) {
    if (w <= 0 || h <= 0) return '';
    r = Math.min(r, w / 2, h / 2);
    const X = x + w, Y = y + h;
    if (side === 'top') return `M${x},${Y}V${y + r}a${r},${r} 0 0 1 ${r},-${r}H${X - r}a${r},${r} 0 0 1 ${r},${r}V${Y}Z`;
    if (side === 'bottom') return `M${x},${y}H${X}V${Y - r}a${r},${r} 0 0 1 -${r},${r}H${x + r}a${r},${r} 0 0 1 -${r},-${r}Z`;
    if (side === 'right') return `M${x},${y}H${X - r}a${r},${r} 0 0 1 ${r},${r}V${Y - r}a${r},${r} 0 0 1 -${r},${r}H${x}Z`;
    if (side === 'left') return `M${X},${y}V${Y}H${x + r}a${r},${r} 0 0 1 -${r},-${r}V${y + r}a${r},${r} 0 0 1 ${r},-${r}Z`;
    return `M${x},${y}h${w}v${h}h${-w}Z`;
  }

  /* ---------------- 프레임 (헤더/범례/플롯/표/툴팁) ---------------- */
  function frame(el, opts, kind) {
    ensureStyle();
    el.innerHTML = '';
    el.classList.add('ds-chart', 'ds-chart--' + kind);
    const head = H('div', 'ds-chart__head', el);
    const titles = H('div', 'ds-chart__titles', head);
    if (opts.title) H('h3', 'ds-chart__title', titles, opts.title);
    if (opts.subtitle) H('p', 'ds-chart__subtitle', titles, opts.subtitle);
    const tools = H('div', 'ds-chart__tools', head);
    const legend = H('ul', 'ds-chart__legend', el); legend.hidden = true;
    const plot = H('div', 'ds-chart__plot', el);
    const tip = H('div', 'ds-chart__tip', plot); tip.setAttribute('role', 'tooltip');
    const table = H('div', 'ds-chart__table', el); table.hidden = true;
    let tableBtn = null;
    if (opts.tableView !== false) {
      tableBtn = H('button', 'ds-chart__tool', tools, '표로 보기'); tableBtn.type = 'button'; tableBtn.setAttribute('aria-pressed', 'false');
    }
    if (!opts.title && !opts.subtitle && !tableBtn) head.hidden = true;
    const f = { el, head, tools, legend, plot, tip, table, tableBtn, showTable: false };
    if (tableBtn) tableBtn.addEventListener('click', () => toggleTable(f));
    return f;
  }
  function toggleTable(f, force) {
    f.showTable = force == null ? !f.showTable : !!force;
    f.table.hidden = !f.showTable; f.plot.hidden = f.showTable; f.legend.hidden = f.showTable || f.legend.childElementCount === 0;
    if (f.tableBtn) { f.tableBtn.setAttribute('aria-pressed', String(f.showTable)); f.tableBtn.textContent = f.showTable ? '차트로 보기' : '표로 보기'; }
  }
  function buildTable(f, cols, rows, numCols) {
    f.table.innerHTML = '';
    const t = H('table', 'ds-table ds-table--compact', f.table);
    const thead = H('thead', null, t), tr = H('tr', null, thead);
    cols.forEach((c, i) => { const th = H('th', numCols.has(i) ? 'num' : null, tr, c); th.scope = 'col'; });
    const tb = H('tbody', null, t);
    rows.forEach(r => { const tr2 = H('tr', null, tb); r.forEach((v, i) => H('td', numCols.has(i) ? 'num' : null, tr2, v)); });
  }
  function tipShow(f, x, y, header, rows) {
    const tip = f.tip; tip.innerHTML = '';
    if (header) H('div', 'tip-h', tip, header);
    rows.forEach(r => {
      const row = H('div', 'tip-r', tip);
      if (r.color) { const k = H('span', 'tip-k' + (r.square ? ' tip-k--sq' : ''), row); k.style.background = r.color; }
      H('span', 'tip-n', row, r.name);
      H('span', 'tip-v', row, r.value);
    });
    tip.classList.add('is-on');
    const pw = f.plot.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = x + 12, top = y - th - 8;
    if (left + tw > pw) left = x - tw - 12; if (left < 0) left = 0;
    if (top < 0) top = y + 12;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function tipHide(f) { f.tip.classList.remove('is-on'); }
  function legendBuild(f, items, shape, onToggle) {
    f.legend.innerHTML = '';
    if (items.length < 2) { f.legend.hidden = true; return; }
    f.legend.hidden = f.showTable;
    items.forEach((it, i) => {
      const li = H('li', it.off ? 'is-off' : null, f.legend); li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-pressed', String(!it.off));
      const sw = H('span', 'sw' + (shape === 'line' ? ' sw--line' : ''), li); sw.style.background = it.color;
      H('span', null, li, it.name);
      const tog = () => onToggle && onToggle(i);
      li.addEventListener('click', tog); li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    });
  }

  /* ---------------- 데이터 정규화 (와이드/롱 → 카테고리×시리즈) ---------------- */
  function normalize(opts) {
    const data = opts.data || [];
    const xk = opts.x; const cats = []; const catIdx = new Map(); const seriesNames = []; const sIdx = new Map();
    const vals = []; // vals[s][c]
    const rowsByCat = new Map();
    const addCat = c => { const k = String(c); if (!catIdx.has(k)) { catIdx.set(k, cats.length); cats.push(k); rowsByCat.set(k, []); } return catIdx.get(k); };
    const addSer = n => { if (!sIdx.has(n)) { sIdx.set(n, seriesNames.length); seriesNames.push(n); vals.push([]); } return sIdx.get(n); };
    if (opts.series) { // 롱 포맷
      const yk = Array.isArray(opts.y) ? opts.y[0] : opts.y;
      for (const r of data) { const ci = addCat(r[xk]); const si = addSer(String(r[opts.series])); vals[si][ci] = (vals[si][ci] || 0) + (+r[yk] || 0); rowsByCat.get(String(r[xk])).push(r); }
    } else {
      const ys = Array.isArray(opts.y) ? opts.y : [opts.y];
      ys.forEach(addSer);
      for (const r of data) { const ci = addCat(r[xk]); ys.forEach((yk, si) => { vals[si][ci] = (vals[si][ci] || 0) + (+r[yk] || 0); }); rowsByCat.get(String(r[xk])).push(r); }
    }
    for (const v of vals) for (let i = 0; i < cats.length; i++) if (v[i] == null) v[i] = 0;
    let series = seriesNames.map((name, i) => ({ name, values: vals[i] }));
    // 9개 이상 → 합계 작은 것부터 "기타"로 접기 (순서는 유지)
    let folded = false;
    if (series.length > SERIES_MAX) {
      const ranked = series.map((s, i) => ({ i, t: sum(s.values) })).sort((a, b) => b.t - a.t);
      const keep = new Set(ranked.slice(0, SERIES_MAX - 1).map(r => r.i));
      const other = { name: OTHER, values: cats.map(() => 0), other: true };
      series.forEach((s, i) => { if (!keep.has(i)) s.values.forEach((v, c) => other.values[c] += v); });
      series = series.filter((s, i) => keep.has(i)).concat([other]); folded = true;
    }
    // 카테고리 정렬
    let order = cats.map((_, i) => i);
    if (opts.sort === 'asc' || opts.sort === 'desc') {
      const tot = cats.map((_, c) => sum(series.map(s => s.values[c])));
      order.sort((a, b) => opts.sort === 'asc' ? tot[a] - tot[b] : tot[b] - tot[a]);
    }
    if (opts.limit) order = order.slice(0, opts.limit);
    const cats2 = order.map(i => cats[i]);
    series.forEach(s => { s.values = order.map(i => s.values[i]); });
    return { cats: cats2, series, rowsByCat, folded };
  }

  /* ---------------- 공통: 리사이즈/테마 재렌더 ---------------- */
  function bindRerender(f, render) {
    let w = 0; let raf = 0;
    const ro = new ResizeObserver(entries => { const nw = Math.round(entries[0].contentRect.width); if (nw && nw !== w) { w = nw; cancelAnimationFrame(raf); raf = requestAnimationFrame(render); } });
    ro.observe(f.plot);
    const onTheme = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(render); };
    window.addEventListener('ds-themechange', onTheme);
    const mo = new MutationObserver(onTheme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null; if (mq) mq.addEventListener('change', onTheme);
    return () => { ro.disconnect(); mo.disconnect(); window.removeEventListener('ds-themechange', onTheme); if (mq) mq.removeEventListener('change', onTheme); };
  }
  function instance(f, state, render, unbind) {
    return {
      el: f.el,
      update(next) { Object.assign(state.opts, next || {}); state.dirty = true; render(); },
      destroy() { unbind(); f.el.innerHTML = ''; f.el.classList.remove('ds-chart'); },
      toggleTable(force) { toggleTable(f, force); },
      setSelection(keys) { state.sel = new Set(keys || []); render(); },
      clearSelection() { state.sel = new Set(); render(); },
      get selection() { return Array.from(state.sel || []); },
    };
  }
  function selectionRows(state, norm) { const out = []; for (const k of state.sel) { const rows = norm.rowsByCat.get(k); if (rows) out.push(...rows); } return out; }
  function handleSelect(state, key, shift, norm, opts) {
    if (!opts.onSelect) return;
    if (shift) { if (state.sel.has(key)) state.sel.delete(key); else state.sel.add(key); }
    else { if (state.sel.size === 1 && state.sel.has(key)) state.sel.clear(); else { state.sel.clear(); state.sel.add(key); } }
    opts.onSelect(selectionRows(state, norm), Array.from(state.sel));
  }

  /* ================= BAR ================= */
  function bar(el, opts) {
    opts = Object.assign({ labels: 'auto', legend: true, height: 260 }, opts);
    const f = frame(el, opts, 'bar');
    const state = { opts, sel: new Set(), off: new Set(), dirty: true, norm: null };
    const render = () => {
      const o = state.opts; const T = readTokens(el);
      if (state.dirty) { state.norm = normalize(o); state.dirty = false; }
      const { cats, series } = state.norm;
      const fmt = formatter(o.format);
      const W = f.plot.clientWidth || 600; if (W < 40) return;
      const horizontal = !!o.horizontal, stacked = !!o.stacked && series.length > 1;
      const visible = series.map((s, i) => !state.off.has(i));
      const colorOf = (s, i) => s.other ? T.other : T.series[i % SERIES_MAX];
      const fillOf = (s, i) => (o.emphasis && s.name !== o.emphasis) ? T.dim : colorOf(s, i);
      // 범례
      legendBuild(f, series.map((s, i) => ({ name: s.name, color: colorOf(s, i), off: state.off.has(i) })), 'rect',
        o.legend === false ? null : i => { if (state.off.has(i)) state.off.delete(i); else if (state.off.size < series.length - 1) state.off.add(i); render(); });
      if (o.legend === false) f.legend.hidden = true;
      // 값 범위
      let vmax = 0, vmin = 0;
      cats.forEach((_, c) => { let pos = 0, neg = 0; series.forEach((s, i) => { if (!visible[i]) return; const v = s.values[c]; if (stacked) { if (v >= 0) pos += v; else neg += v; } else { vmax = Math.max(vmax, v); vmin = Math.min(vmin, v); } }); if (stacked) { vmax = Math.max(vmax, pos); vmin = Math.min(vmin, neg); } });
      const nt = niceTicks(Math.min(0, vmin), Math.max(0, vmax), 5); const ticks = nt.ticks; const lo = nt.lo, hi = nt.hi;
      const afmt = axisFormatter(o.format, Math.max(Math.abs(lo), Math.abs(hi)));
      const fs = 11;
      // 여백
      const tickLabels = ticks.map(afmt); const tickW = Math.max(...tickLabels.map(t => textW(t, fs)));
      const catW = Math.max(...cats.map(c => textW(c, fs)));
      let mL, mR = 12, mT = 10, mB;
      let rotate = false, skip = 1;
      let H0 = o.height;
      if (horizontal) { mL = Math.min(Math.ceil(catW) + 12, Math.floor(W * 0.4)); mB = 24; H0 = Math.max(o.height, cats.length * 28 + mT + mB); }
      else {
        mL = Math.ceil(tickW) + 12; mB = 24;
        const band = (W - mL - mR) / Math.max(1, cats.length);
        if (catW + 6 > band) { if (cats.length > 12 && catW + 6 > band * 2) { skip = Math.ceil((catW + 6) / band); } else { rotate = true; mB = Math.min(Math.ceil(catW * 0.72) + 16, 90); } }
      }
      const H = H0, pw = W - mL - mR, ph = H - mT - mB;
      f.plot.querySelectorAll('svg').forEach(n => n.remove());
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }, null); f.plot.insertBefore(svg, f.tip);
      if (o.title) { const t = S('title', null, svg); t.textContent = o.title; }
      const g = S('g', { transform: `translate(${mL},${mT})` }, svg);
      const scale = v => horizontal ? (v - lo) / (hi - lo) * pw : ph - (v - lo) / (hi - lo) * ph;
      // 격자 + 눈금 (값 축)
      ticks.forEach((t, i) => {
        if (horizontal) { const x = scale(t); S('line', { x1: x, x2: x, y1: 0, y2: ph, stroke: t === 0 ? T.axis : T.grid, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g); const tx = S('text', { x, y: ph + 16, 'text-anchor': 'middle', 'font-size': fs, fill: T.muted, class: 'tick' }, g); tx.textContent = tickLabels[i]; }
        else { const y = scale(t); S('line', { x1: 0, x2: pw, y1: y, y2: y, stroke: t === 0 ? T.axis : T.grid, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g); const tx = S('text', { x: -8, y: y + 4, 'text-anchor': 'end', 'font-size': fs, fill: T.muted, class: 'tick' }, g); tx.textContent = tickLabels[i]; }
      });
      // 막대
      const n = cats.length; const visIdx = series.map((s, i) => i).filter(i => visible[i]);
      const groups = stacked ? 1 : visIdx.length;
      const band = (horizontal ? ph : pw) / Math.max(1, n);
      const inner = band * 0.72; const thick = Math.min(24, (inner - 2 * (groups - 1)) / groups);
      const groupW = thick * groups + 2 * (groups - 1); const pad = (band - groupW) / 2;
      const marks = S('g', null, g); const hits = S('g', null, g); const labels = S('g', null, g);
      const hasSel = state.sel.size > 0;
      // 극값 라벨 선택
      let extremeC = -1, extremeV = -Infinity;
      cats.forEach((_, c) => { const tot = stacked ? sum(visIdx.map(i => series[i].values[c])) : Math.max(...visIdx.map(i => series[i].values[c])); if (tot > extremeV) { extremeV = tot; extremeC = c; } });
      cats.forEach((cat, c) => {
        const base0 = band * c + pad; let posAcc = 0, negAcc = 0;
        const selected = state.sel.has(cat);
        visIdx.forEach((i, gi) => {
          const s = series[i]; const v = s.values[c]; if (v === 0 && !stacked) { /* 0은 그리지 않음 */ }
          let a0, a1; // 값 축 범위
          if (stacked) { if (v >= 0) { a0 = posAcc; posAcc += v; a1 = posAcc; } else { a1 = negAcc; negAcc += v; a0 = negAcc; } } else { a0 = Math.min(0, v); a1 = Math.max(0, v); }
          const p0 = scale(a0), p1 = scale(a1);
          const off = stacked ? base0 : base0 + gi * (thick + 2);
          const isTop = stacked ? (v >= 0 ? posAcc === sum(visIdx.map(j => Math.max(0, series[j].values[c]))) : negAcc === sum(visIdx.map(j => Math.min(0, series[j].values[c])))) : true;
          const gap = stacked && !isTop ? 2 : 0;
          let x, y, w, h, side;
          if (horizontal) { x = Math.min(p0, p1); w = Math.abs(p1 - p0) - gap; y = off; h = thick; side = v >= 0 ? (isTop ? 'right' : 'none') : (isTop ? 'left' : 'none'); if (v < 0 && gap) x += gap; }
          else { y = Math.min(p0, p1) + (v >= 0 ? gap : 0); h = Math.abs(p1 - p0) - gap; x = off; w = thick; side = v >= 0 ? (isTop ? 'top' : 'none') : (isTop ? 'bottom' : 'none'); }
          if (h > 0 && w > 0) {
            const path = S('path', { d: barPath(x, y, w, h, 4, side), fill: fillOf(s, i) }, marks);
            if (hasSel) path.setAttribute('opacity', selected ? 1 : 0.3);
            if (selected) { path.setAttribute('stroke', T.mark); path.setAttribute('stroke-width', 2); path.setAttribute('paint-order', 'stroke'); }
            path.dataset.c = c; path.dataset.s = i;
          }
          // 직접 라벨: auto=최댓값 하나(단일 시리즈/누적 합계), all-ends=모든 끝
          const labelThis = o.labels === 'all-ends' ? (!stacked || isTop) : (o.labels === 'auto' && c === extremeC && (!stacked ? gi === visIdx.length - 1 && visIdx.length === 1 : isTop && v >= 0));
          if (labelThis && o.labels !== 'none') {
            const txt = fmt(stacked ? sum(visIdx.map(j => series[j].values[c])) : v);
            const lx = horizontal ? Math.max(p0, p1) + 6 : off + thick / 2; const ly = horizontal ? off + thick / 2 + 4 : Math.min(p0, p1) - 5;
            if (horizontal ? lx + textW(txt, fs) <= pw + mR : true) { const t = S('text', { x: lx, y: ly, 'font-size': fs, fill: T.ink2, 'text-anchor': horizontal ? 'start' : 'middle', class: 'axlabel' }, labels); t.textContent = txt; }
          }
        });
        // 히트 영역(카테고리 밴드 전체, ≥24px)
        const hb = Math.max(band, 24);
        const hit = horizontal ? S('rect', { x: 0, y: band * c + band / 2 - hb / 2, width: pw, height: hb, class: 'hit' }, hits) : S('rect', { x: band * c + band / 2 - hb / 2, y: 0, width: hb, height: ph, class: 'hit' }, hits);
        hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button');
        hit.setAttribute('aria-label', cat + ': ' + visIdx.map(i => series[i].name + ' ' + fmt(series[i].values[c])).join(', '));
        const show = (ev) => {
          marks.querySelectorAll(`[data-c="${c}"]`).forEach(p => p.setAttribute('filter', 'brightness(1.08)'));
          const rows = visIdx.map(i => ({ name: series[i].name, value: fmt(series[i].values[c]), color: fillOf(series[i], i), square: true }));
          if (stacked && visIdx.length > 1) rows.push({ name: '합계', value: fmt(sum(visIdx.map(i => series[i].values[c]))) });
          const r = f.plot.getBoundingClientRect(); let px, py;
          if (ev && ev.clientX != null) { px = ev.clientX - r.left; py = ev.clientY - r.top; } else { const b = hit.getBoundingClientRect(); px = b.left - r.left + b.width / 2; py = b.top - r.top + b.height / 2; }
          tipShow(f, px, py, series.length === 1 ? null : cat, series.length === 1 ? [{ name: cat, value: fmt(series[visIdx[0]].values[c]), color: fillOf(series[visIdx[0]], visIdx[0]), square: true }] : rows);
        };
        const hide = () => { marks.querySelectorAll(`[data-c="${c}"]`).forEach(p => p.removeAttribute('filter')); tipHide(f); };
        hit.addEventListener('pointerenter', show); hit.addEventListener('pointermove', show); hit.addEventListener('pointerleave', hide);
        hit.addEventListener('focus', show); hit.addEventListener('blur', hide);
        hit.addEventListener('click', ev => { handleSelect(state, cat, ev.shiftKey, state.norm, o); render(); });
        hit.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handleSelect(state, cat, ev.shiftKey, state.norm, o); render(); } });
      });
      // 카테고리 축 라벨
      cats.forEach((cat, c) => {
        if (c % skip !== 0) return;
        if (horizontal) { const t = S('text', { x: -8, y: band * c + band / 2 + 4, 'text-anchor': 'end', 'font-size': fs, fill: T.ink2 }, g); t.textContent = cat.length * fs > mL ? truncate(cat, Math.floor((mL - 12) / (fs * 0.9))) : cat; }
        else { const x = band * c + band / 2; const t = S('text', { x, y: ph + 16, 'text-anchor': rotate ? 'end' : 'middle', 'font-size': fs, fill: T.ink2, transform: rotate ? `rotate(-40 ${x} ${ph + 16})` : null }, g); t.textContent = cat; }
      });
      // 기준선
      if (horizontal) S('line', { x1: scale(0), x2: scale(0), y1: 0, y2: ph, stroke: T.axis, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
      else S('line', { x1: 0, x2: pw, y1: scale(0), y2: scale(0), stroke: T.axis, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g);
      // 표 쌍둥이
      const cols = [o.xLabel || o.x].concat(series.map(s => s.name)); if (stacked && series.length > 1) cols.push('합계');
      buildTable(f, cols, cats.map((cat, c) => { const r = [cat].concat(series.map(s => fmt(s.values[c]))); if (stacked && series.length > 1) r.push(fmt(sum(series.map(s => s.values[c])))); return r; }), new Set(cols.map((_, i) => i).filter(i => i > 0)));
      f.table.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('is-selected', state.sel.has(cats[i])));
    };
    const unbind = bindRerender(f, render);
    render();
    return instance(f, state, render, unbind);
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s; }

  /* ================= LINE ================= */
  function parseX(v) { if (v instanceof Date) return v.getTime(); if (typeof v === 'number') return null; const d = Date.parse(String(v)); return isNaN(d) ? null : d; }
  function fmtDate(ms, spanMs) { const d = new Date(ms); const y = d.getFullYear(), m = d.getMonth() + 1, da = d.getDate(); if (spanMs > 400 * 86400000) return `${y}.${String(m).padStart(2, '0')}`; if (spanMs > 60 * 86400000) return `${String(m)}월`; return `${m}/${da}`; }
  function line(el, opts) {
    opts = Object.assign({ markers: 'auto', legend: true, height: 260 }, opts);
    const f = frame(el, opts, 'line');
    const state = { opts, sel: new Set(), off: new Set(), dirty: true, norm: null };
    const render = () => {
      const o = state.opts; const T = readTokens(el);
      if (state.dirty) { state.norm = normalize(o); state.dirty = false; }
      const { cats, series } = state.norm; const fmt = formatter(o.format);
      const W = f.plot.clientWidth || 600; if (W < 40) return;
      const visible = series.map((s, i) => !state.off.has(i)); const visIdx = series.map((s, i) => i).filter(i => visible[i]);
      const colorOf = (s, i) => s.other ? T.other : T.series[i % SERIES_MAX];
      const strokeOf = (s, i) => (o.emphasis && s.name !== o.emphasis) ? T.dim : colorOf(s, i);
      legendBuild(f, series.map((s, i) => ({ name: s.name, color: colorOf(s, i), off: state.off.has(i) })), 'line', o.legend === false ? null : i => { if (state.off.has(i)) state.off.delete(i); else if (state.off.size < series.length - 1) state.off.add(i); render(); });
      if (o.legend === false) f.legend.hidden = true;
      // x 스케일: 날짜면 시간축, 아니면 순서축
      const xs = cats.map(parseX); const isTime = xs.every(v => v != null) && cats.length > 1;
      const xpos = isTime ? xs : cats.map((_, i) => i);
      const xmin = Math.min(...xpos), xmax = Math.max(...xpos); const span = xmax - xmin || 1;
      let vmin = Infinity, vmax = -Infinity; visIdx.forEach(i => series[i].values.forEach(v => { vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }));
      if (!isFinite(vmin)) { vmin = 0; vmax = 1; }
      const nt = niceTicks(Math.min(0, vmin), vmax, 5); const ticks = nt.ticks, lo = nt.lo, hi = nt.hi;
      const afmt = axisFormatter(o.format, Math.max(Math.abs(lo), Math.abs(hi))); const fs = 11;
      const tickLabels = ticks.map(afmt); const tickW = Math.max(...tickLabels.map(t => textW(t, fs)));
      // 끝 라벨 공간
      const endLabel = o.labels !== 'none' && visIdx.length <= 4;
      const endTexts = endLabel ? visIdx.map(i => fmt(series[i].values[series[i].values.length - 1])) : [];
      const mR = endLabel ? Math.min(Math.ceil(Math.max(0, ...endTexts.map(t => textW(t, fs)))) + 14, Math.floor(W * 0.3)) : 12;
      const mL = Math.ceil(tickW) + 12, mT = 10, mB = 24; const H = o.height, pw = W - mL - mR, ph = H - mT - mB;
      f.plot.querySelectorAll('svg').forEach(n => n.remove());
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }, null); f.plot.insertBefore(svg, f.tip);
      if (o.title) { const t = S('title', null, svg); t.textContent = o.title; }
      const g = S('g', { transform: `translate(${mL},${mT})` }, svg);
      const sx = i => (xpos[i] - xmin) / span * pw; const sy = v => ph - (v - lo) / (hi - lo) * ph;
      ticks.forEach((t, i) => { const y = sy(t); S('line', { x1: 0, x2: pw, y1: y, y2: y, stroke: t === 0 ? T.axis : T.grid, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g); const tx = S('text', { x: -8, y: y + 4, 'text-anchor': 'end', 'font-size': fs, fill: T.muted, class: 'tick' }, g); tx.textContent = tickLabels[i]; });
      // x 라벨: 겹치지 않게 건너뛰기
      const xl = cats.map((c, i) => isTime ? fmtDate(xs[i], span) : c); const maxLw = Math.max(...xl.map(t => textW(t, fs))) + 10;
      const every = Math.max(1, Math.ceil(maxLw / (pw / Math.max(1, cats.length - 1))));
      cats.forEach((c, i) => { if (i % every !== 0 && i !== cats.length - 1) return; if (i === cats.length - 1 && (cats.length - 1) % every !== 0 && (cats.length - 1 - Math.floor((cats.length - 1) / every) * every) * (pw / (cats.length - 1)) < maxLw) return; const t = S('text', { x: sx(i), y: ph + 16, 'text-anchor': i === 0 ? 'start' : i === cats.length - 1 ? 'end' : 'middle', 'font-size': fs, fill: T.ink2, class: 'tick' }, g); t.textContent = xl[i]; });
      // 시리즈
      const showMarkers = o.markers === 'always' || (o.markers === 'auto' && cats.length <= 30);
      const emphasisOrder = visIdx.slice().sort((a, b) => (series[a].name === o.emphasis) - (series[b].name === o.emphasis));
      emphasisOrder.forEach(i => {
        const s = series[i]; const col = strokeOf(s, i);
        const pts = s.values.map((v, k) => [sx(k), sy(v)]);
        const d = pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
        if (o.area) { S('path', { d: d + `L${pts[pts.length - 1][0].toFixed(1)},${sy(Math.max(0, lo))}L${pts[0][0].toFixed(1)},${sy(Math.max(0, lo))}Z`, fill: col, 'fill-opacity': 0.1 }, g); }
        S('path', { d, fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
        if (showMarkers) pts.forEach(p => { S('circle', { cx: p[0], cy: p[1], r: 4, fill: col, stroke: T.surface, 'stroke-width': 2 }, g); });
        else { const p = pts[pts.length - 1]; S('circle', { cx: p[0], cy: p[1], r: 4, fill: col, stroke: T.surface, 'stroke-width': 2 }, g); }
      });
      // 끝 라벨 (충돌 시 범례+툴팁으로 후퇴)
      if (endLabel) {
        const ends = visIdx.map(i => ({ i, y: sy(series[i].values[series[i].values.length - 1]) })).sort((a, b) => a.y - b.y);
        let collide = false; for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 14) collide = true;
        if (!collide) ends.forEach(e => { const t = S('text', { x: pw + 8, y: e.y + 4, 'font-size': fs, fill: T.ink2, class: 'axlabel' }, g); t.textContent = fmt(series[e.i].values[series[e.i].values.length - 1]); });
      }
      // 크로스헤어 + 툴팁 (가장 가까운 x에 스냅)
      const cross = S('line', { x1: 0, x2: 0, y1: 0, y2: ph, stroke: T.axis, 'stroke-width': 1, opacity: 0, 'shape-rendering': 'crispEdges' }, g);
      const dots = S('g', { opacity: 0 }, g);
      const hit = S('rect', { x: 0, y: 0, width: pw, height: ph, class: 'hit' }, g); hit.setAttribute('tabindex', '0'); hit.setAttribute('role', 'button');
      hit.setAttribute('aria-label', (o.title || '선 차트') + ' — 포커스 후 화살표로 탐색');
      let cur = cats.length - 1;
      const showAt = (k, px, py) => {
        cur = k; const x = sx(k); cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', 1); dots.innerHTML = ''; dots.setAttribute('opacity', 1);
        visIdx.forEach(i => S('circle', { cx: x, cy: sy(series[i].values[k]), r: 5, fill: strokeOf(series[i], i), stroke: T.surface, 'stroke-width': 2 }, dots));
        const rows = visIdx.map(i => ({ name: series[i].name, value: fmt(series[i].values[k]), color: strokeOf(series[i], i) }));
        tipShow(f, px != null ? px : x + mL, py != null ? py : mT + 10, cats[k] + (isTime ? '' : ''), rows);
      };
      const nearest = clientX => { const r = svg.getBoundingClientRect(); const px = (clientX - r.left) * (W / r.width) - mL; let best = 0, bd = Infinity; for (let k = 0; k < cats.length; k++) { const d = Math.abs(sx(k) - px); if (d < bd) { bd = d; best = k; } } return best; };
      const hide = () => { cross.setAttribute('opacity', 0); dots.setAttribute('opacity', 0); tipHide(f); };
      hit.addEventListener('pointermove', ev => { const r = f.plot.getBoundingClientRect(); showAt(nearest(ev.clientX), ev.clientX - r.left, ev.clientY - r.top); });
      hit.addEventListener('pointerleave', hide);
      hit.addEventListener('focus', () => showAt(cur)); hit.addEventListener('blur', hide);
      hit.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft') { ev.preventDefault(); showAt(Math.max(0, cur - 1)); } else if (ev.key === 'ArrowRight') { ev.preventDefault(); showAt(Math.min(cats.length - 1, cur + 1)); } else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); handleSelect(state, cats[cur], ev.shiftKey, state.norm, o); render(); } });
      hit.addEventListener('click', ev => { const k = nearest(ev.clientX); handleSelect(state, cats[k], ev.shiftKey, state.norm, o); render(); });
      // 선택 표시
      if (state.sel.size) cats.forEach((c, k) => { if (state.sel.has(c)) S('line', { x1: sx(k), x2: sx(k), y1: 0, y2: ph, stroke: T.mark, 'stroke-width': 2, opacity: .6 }, g); });
      const cols = [o.xLabel || o.x].concat(series.map(s => s.name));
      buildTable(f, cols, cats.map((c, k) => [c].concat(series.map(s => fmt(s.values[k])))), new Set(cols.map((_, i) => i).filter(i => i > 0)));
    };
    const unbind = bindRerender(f, render); render();
    return instance(f, state, render, unbind);
  }

  /* ================= SPARKLINE ================= */
  function sparkPath(values, w, h, pad) {
    const min = Math.min(...values), max = Math.max(...values); const span = max - min || 1;
    return values.map((v, i) => [pad + i / Math.max(1, values.length - 1) * (w - 2 * pad), pad + (1 - (v - min) / span) * (h - 2 * pad)]);
  }
  function sparkline(el, opts) {
    ensureStyle(); opts = Object.assign({ width: 96, height: 28 }, opts);
    const state = { opts };
    const render = () => {
      const T = readTokens(el); const { values, width: w, height: h } = state.opts; el.innerHTML = '';
      if (!values || values.length < 2) return;
      const pts = sparkPath(values, w, h, 4);
      const svg = S('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: 'img', 'aria-label': '추세 ' + values.length + '개 지점' }, el);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
      S('path', { d, fill: 'none', stroke: state.opts.color || T.muted, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      S('path', { d: `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`, fill: 'none', stroke: T.accent, 'stroke-width': 2, 'stroke-linecap': 'round' }, svg);
      S('circle', { cx: b[0], cy: b[1], r: 3, fill: T.accent, stroke: T.surface, 'stroke-width': 2 }, svg);
    };
    render();
    const onTheme = () => render(); window.addEventListener('ds-themechange', onTheme);
    const mo = new MutationObserver(onTheme); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return { el, update(n) { Object.assign(state.opts, n); render(); }, destroy() { window.removeEventListener('ds-themechange', onTheme); mo.disconnect(); el.innerHTML = ''; }, toggleTable() {} };
  }

  /* ================= STAT TILE ================= */
  function stat(el, opts) {
    ensureStyle(); opts = Object.assign({ upIsGood: true, deltaFormat: 'percent-point' }, opts);
    el.classList.add('ds-chart', 'ds-chart--stat');
    const state = { opts }; let spark = null;
    const render = () => {
      const o = state.opts; const fmt = formatter(o.format); el.innerHTML = '';
      const tile = H('div', 'ds-stat-tile' + (o.hero ? ' ds-stat-tile--hero' : ''), el);
      H('div', 'ds-stat-tile__label', tile, o.label);
      const row = H('div', 'ds-stat-tile__row', tile);
      const left = H('div', null, row);
      H('div', 'ds-stat-tile__value', left, fmt(o.value));
      if (o.delta != null) {
        const up = o.delta > 0, good = o.delta === 0 ? null : (up === !!o.upIsGood);
        const d = H('div', 'ds-stat-tile__delta' + (good == null ? '' : good ? ' is-good' : ' is-bad'), left);
        const df = formatter(o.deltaFormat);
        H('span', 'd', d, (o.delta > 0 ? '▲ ' : o.delta < 0 ? '▼ ' : '– ') + df(Math.abs(o.delta)).replace(/^\+/, ''));
        if (o.deltaLabel) H('span', null, d, o.deltaLabel);
      }
      if (o.trend && o.trend.length > 1) { const tr = H('div', 'ds-stat-tile__trend', row); spark = sparkline(tr, { values: o.trend, width: 96, height: 32 }); }
      el.setAttribute('role', 'group'); el.setAttribute('aria-label', o.label + ' ' + fmt(o.value));
    };
    render();
    const onTheme = () => render(); window.addEventListener('ds-themechange', onTheme);
    return { el, update(n) { Object.assign(state.opts, n); render(); }, destroy() { window.removeEventListener('ds-themechange', onTheme); if (spark) spark.destroy(); el.innerHTML = ''; }, toggleTable() {} };
  }

  /* ================= SEGMENTED BAR ================= */
  function segmented(el, opts) {
    opts = Object.assign({ size: 'thin', legend: true }, opts);
    const f = frame(el, opts, 'segmented');
    const state = { opts, sel: new Set() };
    const render = () => {
      const o = state.opts; const T = readTokens(el); const fmt = formatter(o.format);
      let parts = (o.parts || []).filter(p => +p.value > 0).map(p => ({ name: String(p.name), value: +p.value }));
      if (parts.length > 6) { const sorted = parts.slice().sort((a, b) => b.value - a.value); const keep = new Set(sorted.slice(0, 5).map(p => p.name)); const other = { name: OTHER, value: 0, other: true }; parts.forEach(p => { if (!keep.has(p.name)) other.value += p.value; }); parts = parts.filter(p => keep.has(p.name)).concat([other]); }
      const total = sum(parts.map(p => p.value)) || 1;
      const colorOf = (p, i) => p.other ? T.other : T.series[i % SERIES_MAX];
      f.plot.querySelectorAll('.ds-seg').forEach(n => n.remove());
      const wrap = H('div', 'ds-seg', null); f.plot.insertBefore(wrap, f.tip);
      const bar = H('div', 'ds-seg__bar ds-seg__bar--' + (o.size === 'tall' ? 'tall' : o.size === 'dense' ? 'dense' : 'thin'), wrap);
      bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', (o.title || '구성') + ': ' + parts.map(p => `${p.name} ${fmt(p.value)} (${nf1.format(p.value / total * 100)}%)`).join(', '));
      const W = f.plot.clientWidth || 400;
      parts.forEach((p, i) => {
        const share = p.value / total; const part = H('div', 'ds-seg__part', bar); part.style.flex = `${share} 1 0`; part.style.background = colorOf(p, i); part.tabIndex = 0;
        if (o.size === 'tall') { const txt = nf1.format(share * 100) + '%'; const lbl = H('span', 'lbl', part, txt); lbl.style.color = inkOn(colorOf(p, i), T); const pxW = share * (W - 2 * (parts.length - 1)); if (textW(txt, 12) + 16 <= pxW) part.classList.add('has-label'); }
        const show = ev => { const r = f.plot.getBoundingClientRect(); const b = part.getBoundingClientRect(); tipShow(f, ev && ev.clientX != null ? ev.clientX - r.left : b.left - r.left + b.width / 2, b.top - r.top, null, [{ name: p.name, value: fmt(p.value), color: colorOf(p, i), square: true }, { name: '비중', value: nf1.format(share * 100) + '%' }]); };
        part.addEventListener('pointerenter', show); part.addEventListener('pointermove', show); part.addEventListener('pointerleave', () => tipHide(f)); part.addEventListener('focus', show); part.addEventListener('blur', () => tipHide(f));
        part.setAttribute('aria-label', `${p.name} ${fmt(p.value)}, ${nf1.format(share * 100)}%`);
      });
      if (o.legend !== false) legendBuild(f, parts.map((p, i) => ({ name: p.name, color: colorOf(p, i) })), 'rect', null); else f.legend.hidden = true;
      buildTable(f, ['항목', '값', '비중'], parts.map(p => [p.name, fmt(p.value), nf1.format(p.value / total * 100) + '%']), new Set([1, 2]));
    };
    const unbind = bindRerender(f, render); render();
    return instance(f, state, render, unbind);
  }

  /* ================= HEATMAP ================= */
  function heatmap(el, opts) {
    opts = Object.assign({ cell: 28 }, opts);
    const f = frame(el, opts, 'heatmap');
    const state = { opts, sel: new Set() };
    const render = () => {
      const o = state.opts; const T = readTokens(el); const fmt = formatter(o.format);
      const xs = [], ys = [], xi = new Map(), yi = new Map(); const grid = new Map();
      for (const r of o.data || []) { const x = String(r[o.x]), y = String(r[o.y]); if (!xi.has(x)) { xi.set(x, xs.length); xs.push(x); } if (!yi.has(y)) { yi.set(y, ys.length); ys.push(y); } const k = x + '\u0000' + y; grid.set(k, (grid.get(k) || 0) + (+r[o.value] || 0)); }
      if (o.xOrder) xs.sort((a, b) => o.xOrder.indexOf(a) - o.xOrder.indexOf(b)); if (o.yOrder) ys.sort((a, b) => o.yOrder.indexOf(a) - o.yOrder.indexOf(b));
      const vals = Array.from(grid.values()); const vmin = Math.min(...vals), vmax = Math.max(...vals); const span = vmax - vmin || 1;
      const W = f.plot.clientWidth || 600; const fs = 11;
      const yW = Math.ceil(Math.max(...ys.map(t => textW(t, fs)))) + 12; const mT = 4, mB = 22;
      const cw = Math.max(16, Math.min(o.cell * 1.6, (W - yW - 8) / Math.max(1, xs.length))); const ch = o.cell;
      const H = mT + ys.length * ch + mB;
      f.plot.querySelectorAll('svg').forEach(n => n.remove());
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }, null); f.plot.insertBefore(svg, f.tip);
      if (o.title) { const t = S('title', null, svg); t.textContent = o.title; }
      const g = S('g', { transform: `translate(${yW},${mT})` }, svg);
      const step = v => T.seq[Math.min(6, Math.floor((v - vmin) / span * 7))];
      ys.forEach((y, j) => { const t = S('text', { x: -8, y: j * ch + ch / 2 + 4, 'text-anchor': 'end', 'font-size': fs, fill: T.ink2 }, g); t.textContent = y; });
      const every = Math.max(1, Math.ceil((Math.max(...xs.map(t => textW(t, fs))) + 8) / cw));
      xs.forEach((x, i) => { if (i % every) return; const t = S('text', { x: i * cw + cw / 2, y: ys.length * ch + 15, 'text-anchor': 'middle', 'font-size': fs, fill: T.ink2, class: 'tick' }, g); t.textContent = x; });
      xs.forEach((x, i) => ys.forEach((y, j) => {
        const k = x + '\u0000' + y; const has = grid.has(k); const v = grid.get(k) || 0;
        const rect = S('rect', { x: i * cw + 1, y: j * ch + 1, width: cw - 2, height: ch - 2, rx: 2, fill: has ? step(v) : 'none', stroke: has ? 'none' : T.grid, class: 'hit', tabindex: 0, role: 'img' }, g);
        rect.setAttribute('aria-label', `${y} / ${x}: ${has ? fmt(v) : '데이터 없음'}`);
        rect.style.fill = has ? step(v) : 'transparent';
        const show = ev => { const r = f.plot.getBoundingClientRect(); const b = rect.getBoundingClientRect(); rect.setAttribute('stroke', T.ink); rect.setAttribute('stroke-width', 1.5); tipShow(f, ev && ev.clientX != null ? ev.clientX - r.left : b.left - r.left + b.width / 2, b.top - r.top, `${y} · ${x}`, [{ name: o.valueLabel || o.value, value: has ? fmt(v) : '—' }]); };
        const hide = () => { rect.setAttribute('stroke', has ? 'none' : T.grid); rect.setAttribute('stroke-width', 1); tipHide(f); };
        rect.addEventListener('pointerenter', show); rect.addEventListener('pointermove', show); rect.addEventListener('pointerleave', hide); rect.addEventListener('focus', show); rect.addEventListener('blur', hide);
      }));
      // 스케일 범례
      f.el.querySelectorAll('.ds-chart__scale').forEach(n => n.remove());
      const sc = H('div', 'ds-chart__scale', f.el); H('span', null, sc, fmt(vmin)); const ramp = H('div', 'ramp', sc); T.seq.forEach(c => { const s = H('span', null, ramp); s.style.background = c; }); H('span', null, sc, fmt(vmax));
      if (f.showTable) sc.hidden = true;
      buildTable(f, [o.yLabel || o.y].concat(xs), ys.map(y => [y].concat(xs.map(x => grid.has(x + '\u0000' + y) ? fmt(grid.get(x + '\u0000' + y)) : '—'))), new Set(xs.map((_, i) => i + 1)));
    };
    const unbind = bindRerender(f, render); render();
    return instance(f, state, render, unbind);
  }

  /* ================= DIVERGING BAR ================= */
  function diverging(el, opts) {
    opts = Object.assign({ labels: 'auto' }, opts);
    const f = frame(el, opts, 'diverging');
    const state = { opts, sel: new Set() };
    const render = () => {
      const o = state.opts; const T = readTokens(el); const fmt = formatter(o.format);
      const agg = new Map(); const rowsBy = new Map(); for (const r of o.data || []) { const k = String(r[o.x]); agg.set(k, (agg.get(k) || 0) + (+r[o.y] || 0)); (rowsBy.get(k) || rowsBy.set(k, []).get(k)).push(r); }
      let cats = Array.from(agg.keys()); if (o.sort === 'desc') cats.sort((a, b) => agg.get(b) - agg.get(a)); else if (o.sort === 'asc') cats.sort((a, b) => agg.get(a) - agg.get(b));
      const vals = cats.map(c => agg.get(c)); const amax = Math.max(1e-9, ...vals.map(Math.abs));
      const W = f.plot.clientWidth || 600; const fs = 11; const rowH = 26;
      const catW = Math.ceil(Math.max(...cats.map(c => textW(c, fs)))) + 12; const mL = Math.min(catW, Math.floor(W * .35)), mR = 12, mT = 8, mB = 24;
      const H = mT + cats.length * rowH + mB; const pw = W - mL - mR;
      const nt = niceTicks(-amax, amax, 6); const ticks = nt.ticks.filter(t => Math.abs(t) <= amax * 1.0001 || t === 0); const lim = Math.max(Math.abs(nt.lo), Math.abs(nt.hi));
      const afmt = axisFormatter(o.format, lim);
      f.plot.querySelectorAll('svg').forEach(n => n.remove());
      const svg = S('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }, null); f.plot.insertBefore(svg, f.tip);
      const g = S('g', { transform: `translate(${mL},${mT})` }, svg);
      const sx = v => (v + lim) / (2 * lim) * pw; const ph = cats.length * rowH;
      nt.ticks.forEach(t => { const x = sx(t); S('line', { x1: x, x2: x, y1: 0, y2: ph, stroke: t === 0 ? T.axis : T.grid, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, g); const tx = S('text', { x, y: ph + 16, 'text-anchor': 'middle', 'font-size': fs, fill: T.muted, class: 'tick' }, g); tx.textContent = (t > 0 ? '+' : '') + afmt(t); });
      const thick = Math.min(24, rowH - 6);
      const stepColor = v => { const m = Math.abs(v) / amax; const idx = m > 2 / 3 ? 2 : m > 1 / 3 ? 1 : 0; return v < 0 ? T.divNeg[idx] : T.divPos[idx]; };
      let iMax = vals.indexOf(Math.max(...vals)), iMin = vals.indexOf(Math.min(...vals));
      cats.forEach((c, i) => {
        const v = vals[i]; const y = i * rowH + (rowH - thick) / 2; const x0 = sx(0), x1 = sx(v);
        const t = S('text', { x: -8, y: i * rowH + rowH / 2 + 4, 'text-anchor': 'end', 'font-size': fs, fill: T.ink2 }, g); t.textContent = truncate(c, Math.floor((mL - 12) / (fs * .9)));
        if (v !== 0) { const p = S('path', { d: barPath(Math.min(x0, x1), y, Math.abs(x1 - x0), thick, 4, v >= 0 ? 'right' : 'left'), fill: stepColor(v) }, g); if (state.sel.size) p.setAttribute('opacity', state.sel.has(c) ? 1 : .3); }
        if (o.labels !== 'none' && (o.labels === 'all-ends' || i === iMax || i === iMin)) { const lx = v >= 0 ? x1 + 6 : x1 - 6; const tt = S('text', { x: lx, y: y + thick / 2 + 4, 'text-anchor': v >= 0 ? 'start' : 'end', 'font-size': fs, fill: T.ink2, class: 'axlabel' }, g); tt.textContent = (v > 0 ? '+' : '') + fmt(v); }
        const hit = S('rect', { x: 0, y: i * rowH, width: pw, height: rowH, class: 'hit', tabindex: 0, role: 'button' }, g); hit.setAttribute('aria-label', `${c}: ${(v > 0 ? '+' : '') + fmt(v)}`);
        const show = ev => { const r = f.plot.getBoundingClientRect(); const b = hit.getBoundingClientRect(); tipShow(f, ev && ev.clientX != null ? ev.clientX - r.left : b.left - r.left + b.width / 2, b.top - r.top + 4, null, [{ name: c, value: (v > 0 ? '+' : '') + fmt(v), color: stepColor(v), square: true }]); };
        hit.addEventListener('pointerenter', show); hit.addEventListener('pointermove', show); hit.addEventListener('pointerleave', () => tipHide(f)); hit.addEventListener('focus', show); hit.addEventListener('blur', () => tipHide(f));
        hit.addEventListener('click', ev => { if (!o.onSelect) return; if (ev.shiftKey) { state.sel.has(c) ? state.sel.delete(c) : state.sel.add(c); } else { state.sel.size === 1 && state.sel.has(c) ? state.sel.clear() : (state.sel.clear(), state.sel.add(c)); } o.onSelect([].concat(...Array.from(state.sel).map(k => rowsBy.get(k) || [])), Array.from(state.sel)); render(); });
      });
      buildTable(f, [o.xLabel || o.x, o.yLabel || o.y], cats.map((c, i) => [c, (vals[i] > 0 ? '+' : '') + fmt(vals[i])]), new Set([1]));
    };
    const unbind = bindRerender(f, render); render();
    return instance(f, state, render, unbind);
  }

  /* ---------------- 공개 API ---------------- */
  global.DSCharts = { bar, line, stat, segmented, sparkline, heatmap, diverging, format: formatter, version: '0.1.0', SERIES_MAX };
})(typeof window !== 'undefined' ? window : this);
