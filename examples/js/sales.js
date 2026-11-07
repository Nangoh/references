/* examples/js/sales.js — 예시 페이지 공용 데이터 로더/집계 헬퍼 (라이브러리 아님, 예시 전용)
   loadSales() → Promise<rows>. fetch('data/sales.csv') 를 먼저 시도하고, file:// 처럼 안 되면
   data/sales.js 가 넣어둔 window.SALES_CSV 로 대체한다. */
(function (global) {
  'use strict';
  function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
    const head = lines[0].split(',');
    const num = new Set(['units', 'revenue', 'cost', 'discount_rate', 'returned']);
    const rows = lines.slice(1).map(l => { const c = l.split(','); const r = {}; head.forEach((h, i) => { r[h] = num.has(h) ? +c[i] : c[i]; }); r.month = r.date.slice(0, 7); r.year = r.date.slice(0, 4); r.margin = r.revenue - r.cost; return r; });
    // 마지막 달이 15일 미만이면 (미완성 월) 집계가 왜곡되므로 예시에서는 제외한다
    const lastMonth = rows.reduce((m, r) => r.month > m ? r.month : m, '');
    const days = new Set(rows.filter(r => r.month === lastMonth).map(r => r.date)).size;
    return days < 15 ? rows.filter(r => r.month !== lastMonth) : rows;
  }
  async function loadSales() {
    if (location.protocol !== 'file:') { try { const res = await fetch('data/sales.csv'); if (res.ok) return parseCSV(await res.text()); } catch (e) { /* 서버가 없으면 아래로 */ } }
    if (global.SALES_CSV) return parseCSV(global.SALES_CSV);
    await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'data/sales.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
    return parseCSV(global.SALES_CSV);
  }
  // 집계: groupSum(rows, 'region', 'revenue') → [{region, revenue}]
  function groupSum(rows, key, val, extra) {
    const m = new Map();
    for (const r of rows) { const k = r[key]; let o = m.get(k); if (!o) { o = { [key]: k, [val]: 0, n: 0 }; if (extra) extra.forEach(e => o[e] = 0); m.set(k, o); } o[val] += +r[val] || 0; o.n++; if (extra) extra.forEach(e => o[e] += +r[e] || 0); }
    return Array.from(m.values());
  }
  function groupSum2(rows, k1, k2, val) {
    const m = new Map();
    for (const r of rows) { const k = r[k1] + '\u0000' + r[k2]; let o = m.get(k); if (!o) { o = { [k1]: r[k1], [k2]: r[k2], [val]: 0 }; m.set(k, o); } o[val] += +r[val] || 0; }
    return Array.from(m.values());
  }
  const monthsBetween = (rows) => Array.from(new Set(rows.map(r => r.month))).sort();
  function filterRows(rows, f) {
    return rows.filter(r => (!f.from || r.date >= f.from) && (!f.to || r.date <= f.to) && (!f.regions || !f.regions.size || f.regions.has(r.region)) && (!f.channel || r.channel === f.channel) && (!f.category || r.category === f.category));
  }
  const fmtKRW = v => DSCharts.format('compact-krw')(v);
  global.Sales = { parseCSV, loadSales, groupSum, groupSum2, monthsBetween, filterRows, fmtKRW };
})(window);
