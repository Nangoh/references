/* ============================================================
   Mosaic(vgplot) + DuckDB-WASM 초기화 보일러플레이트  (integrations/mosaic-setup.js, ESM)
   -------------------------------------------------------------
   import { initMosaic, dsVgplotTheme } from '../integrations/mosaic-setup.js';
   const { vg, db, conn, query, coordinator } = await initMosaic({
     csvUrl: '../examples/data/sales.csv', table: 'sales',
     vendorBase: '../vendor',           // vendor/ 위치 (duckdb wasm/worker, mosaic.mjs)
   });
   const rows = await query('select region, sum(revenue) r from sales group by 1');

   - DuckDB 는 Web Worker 에서 돈다 (UI 스레드 차단 없음). http(s) 로 서빙되어야 함(file:// 불가).
   - Mosaic coordinator 가 같은 커넥션을 쓰므로 vgplot 차트와 직접 SQL(ECharts 등)이 한 DB를 공유한다.
   - 번들: scripts/vendor.js 가 esbuild 로 만든 vendor/mosaic/mosaic.mjs ( export { vg, duckdb } ).
   ============================================================ */
export async function initMosaic({ csvUrl, table = 'data', vendorBase = '../vendor', bundle = 'auto', log = false } = {}) {
  const mod = await import(`${vendorBase}/mosaic/mosaic.mjs`);
  const { vg, duckdb } = mod;
  const base = new URL(`${vendorBase}/duckdb/`, import.meta.url).href;
  const bundles = {
    mvp: { mainModule: base + 'duckdb-mvp.wasm', mainWorker: base + 'duckdb-browser-mvp.worker.js' },
    eh:  { mainModule: base + 'duckdb-eh.wasm',  mainWorker: base + 'duckdb-browser-eh.worker.js' },
  };
  const picked = bundle === 'auto' ? await duckdb.selectBundle(bundles) : bundles[bundle];
  const worker = new Worker(picked.mainWorker);
  const logger = log ? new duckdb.ConsoleLogger() : new duckdb.VoidLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(picked.mainModule, picked.pthreadWorker);
  const conn = await db.connect();

  if (csvUrl) {
    const text = await (await fetch(csvUrl)).text();
    await db.registerFileText(`${table}.csv`, text);
    await conn.query(`CREATE OR REPLACE TABLE ${table} AS SELECT * FROM read_csv_auto('${table}.csv', header=true)`);
  }

  // Mosaic coordinator 에 같은 DuckDB 인스턴스를 연결
  const connector = vg.wasmConnector({ duckdb: db, connection: conn });
  const coordinator = vg.coordinator();
  coordinator.databaseConnector(connector);

  /** Arrow → plain object rows */
  const plain = (v) => {
    if (typeof v === 'bigint') return Number(v);
    if (v && typeof v === 'object') {
      if (typeof v.toArray === 'function') return Array.from(v.toArray(), plain);   // Arrow Vector / List
      if (v instanceof Date) return v;
      if (typeof v.toJSON === 'function' && !Array.isArray(v)) { const o = v.toJSON(); return o === v ? o : plain(o); }
      if (Array.isArray(v)) return v.map(plain);
      const o = {}; for (const k in v) o[k] = plain(v[k]); return o;
    }
    return v;
  };
  async function query(sql) {
    const t = await conn.query(sql);
    return t.toArray().map(r => plain(r.toJSON ? r.toJSON() : { ...r }));
  }
  async function arrow(sql) { return conn.query(sql); }

  return { vg, duckdb, db, conn, coordinator, connector, query, arrow, table };
}

/** 토큰을 읽어 vgplot(Observable Plot) 속성 배열로 돌려준다 — vg.plot(...dsVgplotTheme(vg), ...marks) */
export function dsVgplotTheme(vg) {
  const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const series = [1, 2, 3, 4, 5, 6, 7, 8].map(i => v(`--series-${i}`));
  return [
    vg.colorRange(series),
    vg.style({ fontFamily: v('--font-sans'), fontSize: '12px', color: v('--chart-ink-2'), background: 'transparent' }),
    vg.margins({ top: 24, right: 16, bottom: 32, left: 48 }),
  ];
}
