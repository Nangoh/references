/* ============================================================
   ds-prompt.js — "이 차트 써줘" 프롬프트 복사 버튼
   -------------------------------------------------------------
   레퍼런스 사이트에서 마음에 드는 차트를 보고, x/y/제목만 확인한 뒤
   버튼 하나로 "규칙 + 코드 + 사양"이 들어간 프롬프트를 복사해
   Claude/GPT/GLM 에 그대로 붙여넣게 한다.

   사용: ds-charts.js 다음, 차트를 만드는 스크립트 앞에 로드.
     <script src="../js/ds-charts.js"></script>
     <script src="../js/ds-prompt.js"></script>
   - DSCharts.* 로 만든 차트에는 자동으로 "프롬프트" 버튼이 붙는다.
   - ECharts 등 다른 차트는 컨테이너에 data-ds-prompt='{"title":"..","fields":{..}}'
     와 <script type="text/plain" data-ds-prompt-code> 코드 템플릿을 두면 같은 버튼이 붙는다.
     템플릿 안의 {{필드명}} 은 입력값으로 치환된다.
   ============================================================ */
(function (global) {
  'use strict';
  const SCRIPT_URL = (document.currentScript && document.currentScript.src) || location.href;
  const REPO = 'https://github.com/Nangoh/references';
  const HOME = 'https://nangoh.github.io/references/';
  // 사이트 베이스: 이 스크립트가 어디서 로드됐든(github.io, 사내 미러, 로컬 서버) 그 서버 기준. file:// 면 공개 주소.
  const BASE = (() => { try { const u = new URL(SCRIPT_URL); if (u.protocol === 'file:') return HOME; const m = u.pathname.match(/^(.*\/)(?:js|api\/dist)\/[^/]*$/); return u.origin + (m ? m[1] : u.pathname.replace(/[^/]*$/, '')); } catch (e) { return HOME; } })();
  const KIND_KO = { bar: '막대 차트', line: '선 차트', stat: 'KPI 타일', segmented: '분할 막대', sparkline: '스파크라인', heatmap: '히트맵', diverging: '발산형 막대' };
  const FIELD_LABEL = { x: 'x (범주/시간 필드)', y: 'y (값 필드, 여러 개면 쉼표)', series: 'series (시리즈 필드)', value: 'value (값 필드)', title: '제목' };

  const FALLBACK_RULES = [
    '규칙 (references 디자인 시스템 요약)',
    '1. 색은 var(--토큰)만. hex/rgb 금지. 차트 색 옵션(color:)을 직접 넘기지 않는다.',
    '2. 클래스는 ds- 만: .ds-card .ds-card__body .ds-table .ds-num .ds-badge .ds-filter-row .ds-kpi-row .ds-stat',
    '3. 헤더는 항상 .ds-shell__header. 글자 14px, 컨트롤 32px, 반경 6px, 그림자 없음.',
    '4. 차트는 DSCharts.bar/line/stat/segmented/heatmap/diverging(el, {data, x, y, title, tableView:true}). 파이·도넛·이중축 금지.',
    '5. 상태는 아이콘+텍스트+색. 이모지 장식, 그라데이션, 중앙정렬 레이아웃 금지.',
    '6. 다크 모드는 토큰이 처리. 라이트/다크 둘 다 확인.',
    '파일: tokens/tokens.css, css/ds.css, js/ds-theme.js, js/ds-charts.js — ' + REPO,
  ].join('\n');

  let rulesCache = null;
  async function loadRules() {
    if (rulesCache) return rulesCache;
    try {
      const r = await fetch(new URL('../prompts/system-prompt-short.md', SCRIPT_URL));
      if (r.ok) { rulesCache = (await r.text()).trim(); return rulesCache; }
    } catch (e) { /* file:// 등 — 아래 폴백 */ }
    rulesCache = FALLBACK_RULES; return rulesCache;
  }

  /* ---------- 라이브러리 소스 포함 (네트워크 없는 사내 세션용) ---------- */
  const SRC_CORE = ['tokens/tokens.css', 'css/ds.css', 'js/ds-theme.js', 'js/ds-charts.js'];
  const SRC_ECHARTS = ['integrations/echarts-theme.js'];
  const srcCache = {};
  async function loadSources(spec) {
    const list = SRC_CORE.concat(spec.kind in KIND_KO ? [] : SRC_ECHARTS);
    const outp = [];
    for (const p of list) {
      if (!(p in srcCache)) { try { const r = await fetch(new URL('../' + p, SCRIPT_URL)); srcCache[p] = r.ok ? await r.text() : null; } catch (e) { srcCache[p] = null; } }
      outp.push({ path: p, text: srcCache[p] });
    }
    return outp;
  }
  const pref = { get embed() { try { return localStorage.getItem('ds-prompt-embed') === '1'; } catch (e) { return false; } }, set embed(v) { try { localStorage.setItem('ds-prompt-embed', v ? '1' : '0'); } catch (e) { /* noop */ } } };
  function sourcesSection(sources) {
    const L = ['', '■ 라이브러리 소스 (세션에서 URL 을 못 받을 때용 — 아래 파일을 프로젝트에 같은 경로로 저장하고, 위 코드의 ../ 경로로 링크해라. 내용은 수정하지 말 것)'];
    for (const f of sources) {
      if (!f.text) { L.push('--- ' + f.path + ' --- (가져오지 못함: ' + BASE + f.path + ' 에서 직접 받기)'); continue; }
      const lang = f.path.endsWith('.css') ? 'css' : 'js';
      L.push('--- ' + f.path + ' ---'); L.push('```' + lang); L.push(f.text.trim()); L.push('```');
    }
    return L.join('\n');
  }

  /* ---------- 스타일 (토큰만) ---------- */
  function ensureStyle() {
    if (document.getElementById('ds-prompt-style')) return;
    const s = document.createElement('style'); s.id = 'ds-prompt-style';
    s.textContent = `
.ds-prompt-host{position:relative}
.ds-prompt__group{display:inline-flex;gap:0}
.ds-prompt__group>.ds-prompt__btn:first-child{border-top-right-radius:0;border-bottom-right-radius:0}
.ds-prompt__group>.ds-prompt__more{border-top-left-radius:0;border-bottom-left-radius:0;margin-left:-1px;padding-left:6px;padding-right:6px}
.ds-prompt__fab{position:absolute;top:var(--sp-2,8px);right:var(--sp-2,8px);z-index:3}
.ds-prompt__fabbtn{height:24px;padding:0 var(--sp-2,8px);font:inherit;font-size:var(--text-xs,12px);line-height:22px;color:var(--fg-2);background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm,4px);cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.ds-prompt__btn:hover{background:var(--accent-soft);color:var(--accent-text);border-color:var(--accent-soft-2)}
.ds-prompt__btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.ds-prompt__toasts{z-index:var(--z-toast,500)}
.ds-prompt__ico{width:12px;height:12px;flex:0 0 auto}
.ds-prompt-pop{position:absolute;top:36px;right:var(--sp-2,8px);z-index:var(--z-dropdown,200);width:min(380px,calc(100% - 16px));padding:var(--sp-3,12px) var(--sp-4,16px) var(--sp-4,16px);background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--r-md,6px);box-shadow:var(--shadow-2);font-size:var(--text-sm,13px);color:var(--fg);text-align:left}
.ds-prompt-pop[hidden]{display:none}
.ds-prompt-pop__head{display:flex;align-items:center;justify-content:space-between;gap:var(--sp-2);margin-bottom:var(--sp-2)}
.ds-prompt-pop__title{font-weight:var(--weight-semibold,600);font-size:var(--text-sm)}
.ds-prompt-pop__kind{font-size:var(--text-xs);color:var(--fg-muted);font-family:var(--font-mono)}
.ds-prompt-pop__grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2) var(--sp-3)}
.ds-prompt-pop__grid .ds-field{gap:2px;margin:0}
.ds-prompt-pop__grid .ds-field--wide{grid-column:1 / -1}
.ds-prompt-pop .ds-field__label{font-size:var(--text-xs);color:var(--fg-muted)}
.ds-prompt-pop .ds-input,.ds-prompt-pop .ds-textarea{width:100%;height:28px;font-size:var(--text-sm);font-family:var(--font-mono)}
.ds-prompt-pop .ds-textarea{height:auto;min-height:52px;font-family:var(--font-sans);resize:vertical}
.ds-prompt-pop__opts{display:flex;flex-wrap:wrap;align-items:center;gap:var(--sp-2) var(--sp-3);margin-top:var(--sp-3);font-size:var(--text-xs);color:var(--fg-2)}
.ds-prompt-pop__opts label{display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.ds-prompt-pop__actions{display:flex;flex-wrap:wrap;align-items:center;gap:var(--sp-2);margin-top:var(--sp-3)}
.ds-prompt-pop__actions .ds-prompt-pop__status{font-size:var(--text-xs);color:var(--ok-text);margin-left:auto}
.ds-prompt-pop details{margin-top:var(--sp-3);font-size:var(--text-xs);color:var(--fg-2)}
.ds-prompt-pop details summary{cursor:pointer;user-select:none}
.ds-prompt-pop__preview{width:100%;min-height:160px;margin-top:var(--sp-2);font-family:var(--font-mono);font-size:11px;line-height:1.45;white-space:pre;overflow:auto;background:var(--surface-2);color:var(--fg);border:1px solid var(--border);border-radius:var(--r-sm);padding:var(--sp-2)}
@media (max-width:480px){.ds-prompt-pop__grid{grid-template-columns:1fr}.ds-prompt-pop{right:0;left:0;width:auto}}
`;
    document.head.appendChild(s);
  }

  /* ---------- 유틸 ---------- */
  const el = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; if (parent) parent.appendChild(n); return n; };
  const icon = () => { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('class', 'ds-prompt__ico'); svg.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M5 2h6a1 1 0 0 1 1 1v1h1.5A1.5 1.5 0 0 1 15 5.5v8A1.5 1.5 0 0 1 13.5 15h-7A1.5 1.5 0 0 1 5 13.5V12H3.5A1.5 1.5 0 0 1 2 10.5v-7A1.5 1.5 0 0 1 3.5 2H5zm1 2h4V3H6v1zm6 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5h-.5v5.5h1.5V12h8.5V5H12z'); p.setAttribute('fill', 'currentColor'); svg.appendChild(p); return svg; };
  const q = v => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const lit = v => {
    if (v == null) return 'null';
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (typeof v === 'string') return q(v);
    if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
    if (typeof v === 'object') return '{ ' + Object.keys(v).map(k => key(k) + ': ' + lit(v[k])).join(', ') + ' }';
    return String(v);
  };
  const key = k => /^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k);
  const splitList = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
  const listOrOne = s => { const a = splitList(s); return a.length > 1 ? a : (a[0] || ''); };
  const sampleRows = (rows, n) => (rows || []).slice(0, n).map(r => { const o = {}; Object.keys(r).slice(0, 8).forEach(k => { const v = r[k]; o[k] = (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') ? v : String(v); }); return o; });
  const pageUrl = () => location.href.split('#')[0];

  /* ---------- 사양 → 코드 ---------- */
  const SKIP = new Set(['data', 'parts', 'values', 'onSelect', 'seriesOrder', 'subtitle']);
  function codeForDS(spec, form) {
    const o = {}; const src = spec.opts || {};
    // 순서: 데이터 → 축 → 나머지
    const front = ['x', 'y', 'series', 'value'];
    front.forEach(k => { if (form[k] !== undefined && form[k] !== '') o[k] = k === 'y' ? listOrOne(form[k]) : form[k]; else if (src[k] !== undefined && form[k] === undefined) o[k] = src[k]; });
    Object.keys(src).forEach(k => { if (SKIP.has(k) || front.includes(k) || typeof src[k] === 'function') return; o[k] = src[k]; });
    const titleKey = spec.kind === 'stat' ? 'label' : 'title';
    if (form.title !== undefined) { if (form.title) o[titleKey] = form.title; else delete o[titleKey]; }
    if (src.tableView === undefined && spec.kind !== 'stat' && spec.kind !== 'sparkline') o.tableView = true;
    const id = 'chart-' + (spec.kind);
    const lines = [];
    let dataDecl = '';
    if (spec.kind === 'segmented') {
      const parts = (src.parts || []).slice(0, 4).map(p => ({ name: p.name, value: p.value }));
      dataDecl = 'const parts = ' + lit(parts.length ? parts : [{ name: '항목 A', value: 120 }, { name: '항목 B', value: 80 }]) + '; // 실제 데이터로 교체';
      o.parts = '__PARTS__';
    } else if (spec.kind === 'sparkline') {
      dataDecl = 'const values = ' + lit((src.values || []).slice(0, 12)) + '; // 실제 데이터로 교체';
      o.values = '__VALUES__';
    } else if (spec.kind === 'stat') {
      // value/trend 는 그대로 숫자 — 설명만
    } else {
      const rows = sampleRows(src.data, 2);
      const cols = rows[0] ? Object.keys(rows[0]) : [String(o.x || 'x'), ...(Array.isArray(o.y) ? o.y : [o.y || 'y'])];
      dataDecl = 'const rows = ' + lit(rows.length ? rows : [Object.fromEntries(cols.map((c, i) => [c, i ? 0 : '값']))]) + '; // 실제 데이터(객체 배열)로 교체. 컬럼: ' + cols.join(', ');
      o.data = '__ROWS__';
    }
    const ordered = ['data', 'parts', 'values'].filter(k => k in o).concat(Object.keys(o).filter(k => !['data', 'parts', 'values'].includes(k)));
    const body = ordered.map(k => '  ' + key(k) + ': ' + (o[k] === '__ROWS__' ? 'rows' : o[k] === '__PARTS__' ? 'parts' : o[k] === '__VALUES__' ? 'values' : lit(o[k])) + ',').join('\n');
    lines.push('<!-- head: tokens/tokens.css, css/ds.css, js/ds-theme.js 가 링크되어 있어야 한다 -->');
    lines.push('<div class="ds-card"><div class="ds-card__body"><div id="' + id + '"></div></div></div>');
    lines.push('<script src="../js/ds-charts.js"><\/script>');
    lines.push('<script>');
    if (dataDecl) lines.push(dataDecl);
    lines.push('DSCharts.' + spec.kind + '(document.getElementById(' + q(id) + '), {');
    lines.push(body);
    lines.push('});');
    lines.push('<\/script>');
    return lines.join('\n');
  }
  function codeForTemplate(spec, form) {
    return (spec.code || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => form[k] !== undefined ? form[k] : (spec.fields && spec.fields[k] && spec.fields[k].value) || '');
  }

  /* ---------- 사양 + 폼 → 프롬프트 ---------- */
  function buildPrompt(spec, form, code, rules, sources) {
    const kindKo = spec.kind in KIND_KO ? KIND_KO[spec.kind] : (spec.kindLabel || spec.kind);
    const how = spec.kind in KIND_KO ? 'DSCharts.' + spec.kind : (spec.lib || 'ECharts + integrations/echarts-theme.js');
    const L = [];
    L.push('[references 디자인 시스템 — 이 차트를 내 화면에 적용해줘]');
    L.push('');
    L.push('지금 작업 중인 프로젝트/화면에 아래 차트를 추가해줘. 사내 디자인 시스템(references)의 차트라서 디자인을 새로 만들지 말고, 아래 코드와 규칙을 그대로 따라. 색·글꼴·간격은 토큰이 처리하니 색 옵션을 직접 넣지 마.');
    L.push('순서: ① 프로젝트에 디자인 시스템 파일이 없으면 "파일 가져오기"대로 먼저 가져온다 ② 아래 코드의 x/y 필드명은 레퍼런스 샘플 데이터 기준이니 내 데이터의 컬럼명으로 바꾼다. 컬럼명을 모르면 추측하지 말고 질문 하나로 물어본다 ③ 라이트/다크 모두 확인하고 표 뷰를 유지한다.');
    L.push('');
    L.push('■ 차트');
    L.push('- 종류: ' + kindKo + ' (' + how + ')');
    if (spec.title || form.title) L.push('- 제목: ' + (form.title || spec.title));
    Object.keys(form).forEach(k => { if (['title', 'desc', 'extra', 'rules'].includes(k)) return; if (form[k] === '' || form[k] == null) return; L.push('- ' + k + ': ' + form[k]); });
    if (form.desc) L.push('- 데이터: ' + form.desc);
    if (spec.note) L.push('- 메모: ' + spec.note);
    L.push('- 참고 (실제 렌더 예시): ' + pageUrl() + (spec.anchor ? '#' + spec.anchor : ''));
    if (form.extra) { L.push(''); L.push('■ 추가 요청'); L.push(form.extra); }
    L.push('');
    L.push('■ 코드 (이 호출을 그대로 쓰고, 데이터만 실제 값으로 바꿔)');
    L.push(code);
    L.push('');
    L.push('■ 파일 가져오기 — 손으로 복사하지 말고 아래 중 하나로 자동으로');
    L.push('1) 가장 간단: 호스팅된 번들을 그대로 링크 (복사 없음)');
    L.push('   <link rel="stylesheet" href="' + BASE + 'api/dist/ds.css">');
    L.push('   <script src="' + BASE + 'api/dist/ds.js"><\/script>');
    L.push('2) 프로젝트에 내려받기 (셸을 쓸 수 있는 에이전트): curl -fsSL ' + BASE + 'api/install.sh | sh -s -- ./public/ds');
    L.push('   그 뒤 ../tokens/tokens.css ../css/ds.css ../js/ds-theme.js ../js/ds-charts.js 를 받은 경로로 링크');
    L.push('3) 목록과 카탈로그(JSON, CORS 허용): ' + BASE + 'api/manifest.json · ' + BASE + 'api/charts.json · 규칙 전문 ' + BASE + 'api/agents.md');
    if (!(spec.kind in KIND_KO)) L.push('4) ECharts 는 vendor/echarts/echarts.min.js(npm run vendor) 또는 CDN, 테마는 ' + BASE + 'integrations/echarts-theme.js');
    L.push('리포: ' + REPO + ' · 사내망에서 위 주소가 막히면 install.sh 로 받아 사내 서버에 두고 같은 경로를 쓴다.');
    if (form.rules !== false && rules) { L.push(''); L.push('■ 디자인 규칙'); L.push(rules); }
    if (sources && sources.length) L.push(sourcesSection(sources));
    L.push('');
    L.push('■ 결과물');
    L.push('- 완성된 HTML 조각(또는 단일 HTML 페이지). 라이트/다크 둘 다 깨지지 않게. 표 뷰(tableView) 유지. 숫자 단위는 제목/라벨에.');
    return L.join('\n');
  }

  /* ---------- 토스트 (팝오버 없이 바로 복사했을 때 피드백) ---------- */
  function toast(msg, kind) {
    let stack = document.querySelector('.ds-toast-stack.ds-prompt__toasts');
    if (!stack) { stack = el('div', 'ds-toast-stack ds-prompt__toasts', document.body); stack.setAttribute('aria-live', 'polite'); }
    const t = el('div', 'ds-toast ds-toast--' + (kind || 'ok'), stack);
    const b = el('div', 'ds-toast__body', t); el('strong', null, b, kind === 'warn' ? '복사가 막혔습니다' : '복사됨'); el('div', 'ds-toast__msg', b, msg);
    setTimeout(() => { t.remove(); if (!stack.childElementCount) stack.remove(); }, 2800);
  }
  const defaultForm = (spec) => { const f = {}; fieldsFor(spec).forEach(x => { f[x.k] = x.v; }); f.desc = descFor(spec); f.extra = ''; f.rules = true; return f; };
  async function quickCopy(mount, spec) {
    const form = defaultForm(spec);
    const code = (spec.kind in KIND_KO ? codeForDS : codeForTemplate)(spec, form);
    const embed = pref.embed;
    const text = buildPrompt(spec, form, code, await loadRules(), embed ? await loadSources(spec) : null);
    let ok = false; try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
    if (ok) { toast('사내 LLM 세션에 Ctrl+V 하면 이 차트를 적용해 만듭니다.' + (embed ? ' (라이브러리 소스 ' + Math.round(text.length / 1024) + 'KB 포함)' : ' 세션이 외부 URL 을 못 받으면 ▾ 에서 "소스 포함"을 켜세요.')); return; }
    // 클립보드가 막힌 환경: 팝오버를 열고 미리보기에서 직접 복사
    const pop = openPopover(mount, spec); const det = pop.querySelector('details'); if (det) det.open = true;
    toast('아래 미리보기에서 직접 복사하세요.', 'warn');
  }

  /* ---------- 팝오버 ---------- */
  let openPop = null;
  function closeOpen() { if (openPop) { openPop.remove(); openPop = null; } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOpen(); });
  document.addEventListener('pointerdown', e => { if (openPop && !openPop.contains(e.target) && !e.target.closest('.ds-prompt__btn,.ds-prompt__fab')) closeOpen(); });

  function fieldsFor(spec) {
    const f = [];
    if (spec.kind in KIND_KO) {
      const o = spec.opts || {};
      if (['bar', 'line', 'heatmap', 'diverging'].includes(spec.kind)) f.push({ k: 'x', v: o.x || '' });
      if (['bar', 'line', 'diverging'].includes(spec.kind)) f.push({ k: 'y', v: Array.isArray(o.y) ? o.y.join(', ') : (o.y || '') });
      if (spec.kind === 'heatmap') { f.push({ k: 'y', v: o.y || '' }); f.push({ k: 'value', v: o.value || '' }); }
      if (spec.kind === 'bar' && (o.series || o.stacked)) f.push({ k: 'series', v: o.series || '' });
      f.push({ k: 'title', v: o.title || o.label || '', wide: true, label: spec.kind === 'stat' ? '라벨' : undefined });
    } else {
      Object.keys(spec.fields || {}).forEach(k => f.push({ k, v: spec.fields[k].value || '', label: spec.fields[k].label, wide: !!spec.fields[k].wide }));
      f.push({ k: 'title', v: spec.title || '', wide: true });
    }
    return f;
  }
  function descFor(spec) {
    const o = spec.opts || {};
    if (spec.desc) return spec.desc;
    if (o.data && o.data[0]) return '객체 배열. 컬럼: ' + Object.keys(o.data[0]).slice(0, 10).join(', ') + ' (' + o.data.length.toLocaleString('ko-KR') + '행)';
    if (o.parts) return '부분: ' + o.parts.map(p => p.name).join(', ');
    if (spec.kind === 'stat') return '값 ' + (o.value != null ? o.value : '') + (o.delta != null ? ', 증감 ' + o.delta : '') + (o.trend ? ', 추세 12점' : '');
    return '';
  }

  async function copyText(text, statusEl, preview) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
    if (!ok) {
      try { preview.hidden = false; preview.focus(); preview.select(); ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
    }
    statusEl.textContent = ok ? '복사됨 — Claude/GPT 입력창에 붙여넣으세요' : '자동 복사가 막혔습니다. 아래 미리보기에서 직접 복사하세요';
    statusEl.style.color = ok ? '' : 'var(--warn-text)';
    if (!ok) { const d = preview.closest('details'); if (d) d.open = true; }
    clearTimeout(statusEl._t); statusEl._t = setTimeout(() => { statusEl.textContent = ''; }, 4000);
  }

  function openPopover(host, spec) {
    closeOpen();
    const pop = el('div', 'ds-popover ds-prompt-pop', host); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '프롬프트 만들기');
    const head = el('div', 'ds-prompt-pop__head', pop);
    el('div', 'ds-prompt-pop__title', head, '고쳐서 복사');
    el('span', 'ds-prompt-pop__kind', head, spec.kind in KIND_KO ? 'DSCharts.' + spec.kind : (spec.lib || 'ECharts'));
    const grid = el('div', 'ds-prompt-pop__grid', pop);
    const inputs = {};
    fieldsFor(spec).forEach(f => {
      const fld = el('div', 'ds-field' + (f.wide ? ' ds-field--wide' : ''), grid);
      const id = 'dsp-' + Math.random().toString(36).slice(2, 8);
      const lab = el('label', 'ds-field__label', fld, f.label || FIELD_LABEL[f.k] || f.k); lab.htmlFor = id;
      const inp = el('input', 'ds-input', fld); inp.id = id; inp.type = 'text'; inp.value = f.v; inp.setAttribute('autocomplete', 'off');
      inputs[f.k] = inp;
    });
    const dfld = el('div', 'ds-field ds-field--wide', grid);
    const did = 'dsp-desc-' + Math.random().toString(36).slice(2, 8);
    const dlab = el('label', 'ds-field__label', dfld, '데이터 설명 (어디서 오는 어떤 데이터인지)'); dlab.htmlFor = did;
    const desc = el('textarea', 'ds-textarea', dfld); desc.id = did; desc.value = descFor(spec); desc.rows = 2;
    const efld = el('div', 'ds-field ds-field--wide', grid);
    const eid = 'dsp-extra-' + Math.random().toString(36).slice(2, 8);
    const elab = el('label', 'ds-field__label', efld, '추가 요청 (선택)'); elab.htmlFor = eid;
    const extra = el('textarea', 'ds-textarea', efld); extra.id = eid; extra.rows = 2; extra.placeholder = '예: 최근 12개월만, 금액은 백만원 단위, 카드 제목은 "월별 매출 추이"';

    const opts = el('div', 'ds-prompt-pop__opts', pop);
    const rl = el('label', null, opts); const rules = el('input', 'ds-checkbox', rl); rules.type = 'checkbox'; rules.checked = true; rl.appendChild(document.createTextNode('규칙 요약 포함'));
    const sl = el('label', null, opts); const embed = el('input', 'ds-checkbox', sl); embed.type = 'checkbox'; embed.checked = pref.embed; sl.appendChild(document.createTextNode('라이브러리 소스 포함 (외부 URL 못 받는 세션용, 기억됨)'));
    sl.title = 'tokens.css, ds.css, ds-theme.js, ds-charts.js 원문을 프롬프트 끝에 붙입니다. 켜두면 한 번 클릭 복사에도 적용됩니다.';
    embed.addEventListener('change', () => { pref.embed = embed.checked; if (det.open) refresh(); });

    const acts = el('div', 'ds-prompt-pop__actions', pop);
    const bPrompt = el('button', 'ds-btn ds-btn--primary ds-btn--sm', acts, '프롬프트 복사'); bPrompt.type = 'button';
    const bCode = el('button', 'ds-btn ds-btn--sm', acts, '코드만 복사'); bCode.type = 'button';
    const bGet = el('button', 'ds-btn ds-btn--sm', acts, '파일 받기 명령'); bGet.type = 'button'; bGet.title = 'curl 한 줄로 디자인 시스템 파일을 프로젝트에 내려받는 명령을 복사합니다';
    const bClose = el('button', 'ds-btn ds-btn--ghost ds-btn--sm', acts, '닫기'); bClose.type = 'button';
    const status = el('span', 'ds-prompt-pop__status', acts); status.setAttribute('aria-live', 'polite');
    const det = el('details', null, pop); el('summary', null, det, '미리보기 / 직접 복사');
    const preview = el('textarea', 'ds-prompt-pop__preview', det); preview.readOnly = true; preview.setAttribute('aria-label', '프롬프트 미리보기');

    const readForm = () => { const f = {}; Object.keys(inputs).forEach(k => f[k] = inputs[k].value.trim()); f.desc = desc.value.trim(); f.extra = extra.value.trim(); f.rules = rules.checked; return f; };
    const code = () => (spec.kind in KIND_KO ? codeForDS : codeForTemplate)(spec, readForm());
    const prompt = async () => buildPrompt(spec, readForm(), code(), rules.checked ? await loadRules() : '', embed.checked ? await loadSources(spec) : null);
    const refresh = async () => { preview.value = await prompt(); };
    pop.addEventListener('input', () => { if (det.open) refresh(); });
    det.addEventListener('toggle', () => { if (det.open) refresh(); });
    bPrompt.addEventListener('click', async () => { const t = await prompt(); preview.value = t; copyText(t, status, preview); });
    bCode.addEventListener('click', async () => { const t = code(); preview.value = t; copyText(t, status, preview); });
    bGet.addEventListener('click', () => { const t = 'curl -fsSL ' + BASE + 'api/install.sh | sh -s -- ./public/ds'; preview.value = t + '\n\n# 또는 복사 없이 링크만:\n<link rel="stylesheet" href="' + BASE + 'api/dist/ds.css">\n<script src="' + BASE + 'api/dist/ds.js"><\/script>'; copyText(t, status, preview); });
    bClose.addEventListener('click', closeOpen);
    openPop = pop;
    const first = Object.values(inputs)[0]; if (first) first.focus();
    loadRules();
    return pop;
  }

  /* ---------- 버튼 부착 ---------- */
  function attach(host, spec) {
    ensureStyle();
    if (!spec.anchor && host.id) spec.anchor = host.id;
    host.__dsPrompt = spec;
    spec.host = host;
    return ensureButton(host, spec);
  }
  // ECharts(zrender)는 init 할 때 컨테이너 내용을 비우므로, 템플릿형 호스트는 부모(카드 본문)에 버튼을 단다.
  function mountOf(host, spec) { return (spec.kind in KIND_KO || spec.mount === 'self') ? host : (host.parentElement || host); }
  function ensureButton(host, spec) {
    const mount = mountOf(host, spec);
    mount.classList.add('ds-prompt-host');
    const existing = mount.querySelector(':scope > .ds-prompt__fab .ds-prompt__btn, :scope > .ds-chart__head .ds-chart__tools > .ds-prompt__group > .ds-prompt__btn');
    if (existing) return existing;
    const tools = mount.querySelector(':scope > .ds-chart__head .ds-chart__tools');
    const inTools = !!tools;
    const group = el('span', inTools ? 'ds-prompt__group' : 'ds-prompt__group ds-prompt__fab', inTools ? tools : mount);
    const btn = el('button', inTools ? 'ds-chart__tool ds-prompt__btn' : 'ds-prompt__fabbtn ds-prompt__btn', group); btn.type = 'button';
    btn.appendChild(icon()); btn.appendChild(document.createTextNode('복사'));
    btn.title = '클릭 한 번: 이 차트를 적용하라는 프롬프트(사양+코드+규칙)를 복사합니다. 사내 LLM 세션에 Ctrl+V.';
    const more = el('button', inTools ? 'ds-chart__tool ds-prompt__btn ds-prompt__more' : 'ds-prompt__fabbtn ds-prompt__btn ds-prompt__more', group, '▾'); more.type = 'button';
    more.title = 'x/y/제목/데이터 설명을 고쳐서 복사'; more.setAttribute('aria-label', '프롬프트 옵션'); more.setAttribute('aria-haspopup', 'dialog');
    if (inTools) { const head = tools.closest('.ds-chart__head'); if (head && head.hidden) head.hidden = false; }
    btn.addEventListener('click', e => { e.stopPropagation(); closeOpen(); quickCopy(mount, spec); });
    more.addEventListener('click', e => { e.stopPropagation(); if (openPop && openPop.parentElement === mount) { closeOpen(); return; } openPopover(mount, spec); });
    return btn;
  }

  /* DSCharts 래핑: 만들 때 사양을 기억하고 버튼을 붙인다 */
  function wrapDSCharts(DS) {
    if (!DS || DS.__dsPromptWrapped) return;
    Object.keys(KIND_KO).forEach(kind => {
      const orig = DS[kind]; if (typeof orig !== 'function') return;
      DS[kind] = function (host, opts) {
        const inst = orig.call(this, host, opts);
        try {
          const spec = { kind, opts: Object.assign({}, opts), title: opts && opts.title };
          attach(host, spec);
          if (inst && typeof inst.update === 'function') { const u = inst.update; inst.update = function (n) { Object.assign(spec.opts, n || {}); const r = u.call(inst, n); try { ensureButton(host, spec); } catch (e) { /* noop */ } return r; }; }
        } catch (e) { /* 레퍼런스 보조 기능 — 차트 자체는 영향 없음 */ }
        return inst;
      };
    });
    DS.__dsPromptWrapped = true;
  }

  /* data-ds-prompt 컨테이너 (ECharts 등) */
  function scanTemplates(root) {
    (root || document).querySelectorAll('[data-ds-prompt]').forEach(host => {
      if (host.__dsPrompt) return;
      let spec = {};
      try { spec = JSON.parse(host.getAttribute('data-ds-prompt') || '{}'); } catch (e) { spec = { title: host.getAttribute('data-ds-prompt') }; }
      const sel = host.getAttribute('data-ds-prompt-code');
      const tpl = sel ? document.querySelector(sel) : host.querySelector('script[type="text/plain"][data-ds-prompt-code]');
      spec.code = tpl ? tpl.textContent.trim().replace(/<\\\//g, '</') : (spec.code || '');
      spec.kind = spec.kind || 'echarts';
      attach(host, spec);
    });
  }

  const DSPrompt = { attach, scan: scanTemplates, buildPrompt, loadRules, version: '0.1.0' };
  global.DSPrompt = DSPrompt;
  if (global.DSCharts) wrapDSCharts(global.DSCharts);
  else document.addEventListener('DOMContentLoaded', () => wrapDSCharts(global.DSCharts));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scanTemplates()); else scanTemplates();
})(window);
