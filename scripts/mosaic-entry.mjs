// esbuild 번들 엔트리 (scripts/vendor.js 가 사용). 브라우저에서:
//   import { vg, duckdb } from '../vendor/mosaic/mosaic.mjs'
export * as vg from '@uwdata/vgplot';
export * as duckdb from '@duckdb/duckdb-wasm';
