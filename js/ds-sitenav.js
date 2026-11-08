/* ============================================================
   ds-sitenav.js — 레퍼런스 사이트 공통 사이드바 트리
   -------------------------------------------------------------
   "지금 어디에 있나"를 항상 보여 주는 한 가지 장치.
   섹션 › 페이지 › (현재 페이지의) 안쪽 목차 를 왼쪽에 펼치고,
   현재 페이지와 현재 섹션을 강조한다. 사이트맵은 아래 SITE 하나가 원본이다.

   사용:
     <aside class="ds-sidebar" data-sitenav="charts"></aside>      ← 전체 트리 (레퍼런스 페이지)
     <aside class="ds-sidebar" data-sitenav-compact="dashboard">…</aside>  ← 예시 시스템: 위에 "레퍼런스" 그룹만 끼움
     <script src="../js/ds-sitenav.js"></script>   (body 끝)
   좁은 폭(≤960px)에서는 헤더의 ☰ 버튼(.ds-shell__menu)이 사이드바를 드로어로 연다. 버튼은 자동으로 붙는다.
   ============================================================ */
(function (global) {
  'use strict';
  const REPO = 'https://github.com/Nangoh/references/blob/main/';
  const doc = (id, title, file, note) => ({ id, title, doc: file, href: 'doc.html?f=' + encodeURIComponent(file), note });   // 문서는 사이트 안 뷰어로 본다
  const SITE = [
    { group: '시작하기', items: [
      { id: 'home', title: '홈 · 무엇인가', href: 'index.html' },
      { id: 'get', title: '가져가기 · API', href: 'index.html#get', note: 'llms.txt, manifest, 번들, install.sh' },
      doc('readme', 'README', 'README.md'),
      doc('principles', '개발 원칙', 'docs/00-dev-principles.md'),
    ] },
    { group: '디자인', items: [
      { id: 'showcase', title: '컴포넌트 쇼케이스', href: 'showcase.html', sections: [
        ['tokens', '토큰'], ['type', '타이포그래피'], ['shell', '앱 셸'], ['buttons', '버튼'], ['forms', '폼'], ['filters', '필터 · 칩'],
        ['cards', '카드'], ['tables', '테이블'], ['badges', '배지 · 상태'], ['tabs', '탭'], ['kpi', 'KPI · 스탯'], ['chart-chrome', '차트 크롬'],
        ['overlays', '오버레이'], ['feedback', '알림 · 상태'], ['marking', '마킹'],
      ] },
      doc('design-doc', '디자인 원칙', 'docs/01-principles.md'),
      doc('tokens-doc', '색 · 토큰', 'docs/02-color.md'),
      doc('type-doc', '타이포그래피', 'docs/03-typography.md'),
      doc('layout-doc', '레이아웃 · 페이지 템플릿', 'docs/04-layout.md'),
      doc('components-doc', '컴포넌트 문서', 'docs/05-components.md'),
    ] },
    { group: '차트', items: [
      { id: 'charts', title: '차트 갤러리', href: 'charts.html', sections: [
        ['s1', '1. 숫자가 주인공'], ['s2', '2. 시간 추이'], ['s3', '3. 크기 · 구성'], ['s4', '4. 그리드 · 극성'], ['s5', '5. 마킹'], ['s6', '6. 팔레트'], ['s7', '7. 하지 말 것'],
      ] },
      { id: 'drilldown', title: '드릴다운 패턴', href: 'drilldown.html', sections: [
        ['sec-treemap', '① 트리맵'], ['sec-sunburst', '② 선버스트'], ['sec-bar', '③ 막대 수동 드릴'], ['sec-code', '핵심 코드'],
      ] },
      doc('charts-doc', '차트 규칙 · DSCharts API', 'docs/06-charts.md'),
    ] },
    { group: '예시 시스템', items: [
      { id: 'dashboard', title: '운영 대시보드', href: 'dashboard.html', note: '조립 예시' },
      { id: 'explorer', title: '판매 분석 탐색기', href: 'explorer.html', note: 'Spotfire 대체: 마킹 · 드릴 · 피벗' },
      doc('spotfire-doc', 'Spotfire 기능 대응표', 'docs/08-spotfire-mapping.md'),
    ] },
    { group: 'LLM에 먹이기', items: [
      doc('agents', 'AGENTS.md (코딩 에이전트 규칙)', 'AGENTS.md'),
      doc('prompt', '시스템 프롬프트 (채팅형)', 'prompts/system-prompt.md'),
      doc('prompt-short', '시스템 프롬프트 (짧은 판)', 'prompts/system-prompt-short.md'),
      doc('anti', '금지 패턴 · 리뷰 체크리스트', 'docs/07-anti-patterns.md'),
      doc('docs', '문서 목차', 'docs/README.md'),
    ] },
  ];
  /* 문서 목록(순서대로): doc.html 의 이전/다음과 제목에 쓴다 */
  function docs() { const out = []; for (const g of SITE) for (const it of g.items) if (it.doc) out.push({ ...it, group: g.group }); return out; }

  const el = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; if (parent) parent.appendChild(n); return n; };
  const extIcon = () => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('class', 'ds-sidebar__ext'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M6 3h7v7M13 3 7 9M11 9v4H3V5h4'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.5'); s.appendChild(p); return s; };

  function findCurrent(id) { for (const g of SITE) for (const it of g.items) if (it.id === id) return { group: g, item: it }; return null; }

  /* 전체 트리 */
  function mount(aside, currentId, opts = {}) {
    aside.innerHTML = '';
    aside.setAttribute('aria-label', '사이트 구조');
    const head = el('div', 'ds-sidebar__site', aside);
    el('span', 'ds-sidebar__site-name', head, 'references');
    el('span', 'ds-sidebar__site-sub', head, '사이트 구조 · 현재 위치 강조');
    for (const g of SITE) {
      const isHere = g.items.some(it => it.id === currentId);
      const grp = el('div', 'ds-sidebar__group' + (isHere ? ' is-here' : ''), aside, g.group);
      if (isHere) { const b = el('span', 'ds-sidebar__here', grp, '현재'); b.setAttribute('aria-hidden', 'true'); }
      for (const it of g.items) {
        const a = el('a', 'ds-sidebar__item', aside); a.href = it.href; a.textContent = it.title;
        if (it.ext) { a.target = '_blank'; a.rel = 'noopener'; a.appendChild(extIcon()); a.title = '문서 (GitHub, 새 탭)'; }
        if (it.id === currentId) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
        const secs = it.id === currentId ? (opts.sections || it.sections) : null;
        if (secs && secs.length) {
          const tree = el('div', 'ds-sidebar__tree', aside); tree.setAttribute('aria-label', '이 페이지의 목차');
          for (const [sid, title] of secs) {
            if (!document.getElementById(sid)) continue;
            const s = el('a', 'ds-sidebar__item ds-sidebar__item--sub', tree, title); s.href = '#' + sid; s.dataset.section = sid;
          }
          spy(tree);
        }
      }
    }
    el('div', 'ds-sidebar__footer', aside).append('references v0.1 · ', Object.assign(el('a', 'ds-link'), { href: 'https://github.com/Nangoh/references', target: '_blank', rel: 'noopener', textContent: 'GitHub' }));
    drawer(aside);
  }

  /* 예시 시스템 페이지: 자기 메뉴 위에 "레퍼런스" 그룹만 */
  function mountCompact(aside, currentId) {
    const cur = findCurrent(currentId);
    const frag = document.createDocumentFragment();
    const grp = el('div', 'ds-sidebar__group is-here', frag, '레퍼런스 › 예시 시스템');
    const back = el('a', 'ds-sidebar__item ds-sidebar__item--back', frag, '← 레퍼런스 홈'); back.href = 'index.html';
    if (cur) for (const it of cur.group.items) {
      if (it.ext) continue;
      const a = el('a', 'ds-sidebar__item ds-sidebar__item--sub', frag, it.title); a.href = it.href;
      if (it.id === currentId) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
    }
    const hr = el('div', 'ds-sidebar__divider', frag);
    aside.insertBefore(frag, aside.firstChild);
    drawer(aside);
  }

  /* 현재 섹션 강조 (스크롤 스파이): 화면 위 35% 선을 지난 마지막 제목이 현재 섹션 */
  function spy(tree) {
    const links = Array.from(tree.querySelectorAll('a[data-section]'));
    const targets = links.map(a => document.getElementById(a.dataset.section)).filter(Boolean);
    if (!targets.length) return;
    const set = id => links.forEach(a => { const on = a.dataset.section === id; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    let raf = 0, pinned = null;
    const compute = () => {
      raf = 0;
      if (pinned) { set(pinned); return; }
      const line = window.innerHeight * 0.35; let cur = targets[0].id;
      for (const t of targets) { if (t.getBoundingClientRect().top <= line) cur = t.id; else break; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = targets[targets.length - 1].id;   // 맨 아래면 마지막 섹션
      set(cur);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(compute); };
    window.addEventListener('scroll', schedule, { passive: true }); window.addEventListener('resize', schedule);
    links.forEach(a => a.addEventListener('click', () => { pinned = a.dataset.section; set(pinned); setTimeout(() => { pinned = null; schedule(); }, 800); }));
    compute();
  }

  /* 좁은 폭: 헤더 ☰ 로 사이드바 드로어 열고 닫기 */
  function drawer(aside) {
    const header = document.querySelector('.ds-shell__header'); if (!header || header.querySelector('.ds-shell__menu')) return;
    const btn = el('button', 'ds-btn ds-btn--icon ds-shell__menu'); btn.type = 'button'; btn.setAttribute('aria-label', '사이트 메뉴 열기'); btn.setAttribute('aria-expanded', 'false');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('class', 'ds-icon'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M2 4h12M2 8h12M2 12h12'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.6'); p.setAttribute('stroke-linecap', 'round'); svg.appendChild(p); btn.appendChild(svg);
    header.insertBefore(btn, header.firstChild);
    let backdrop = null;
    const close = () => { aside.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); if (backdrop) { backdrop.remove(); backdrop = null; } };
    const open = () => { aside.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); backdrop = el('div', 'ds-sidebar__backdrop', document.body); backdrop.addEventListener('click', close); };
    btn.addEventListener('click', () => aside.classList.contains('is-open') ? close() : open());
    aside.addEventListener('click', e => { if (e.target.closest('a') && aside.classList.contains('is-open')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  function boot() {
    document.querySelectorAll('[data-sitenav]').forEach(a => { const id = a.getAttribute('data-sitenav'); if (id !== 'manual') mount(a, id); });
    document.querySelectorAll('[data-sitenav-compact]').forEach(a => mountCompact(a, a.getAttribute('data-sitenav-compact')));
  }
  global.DSSiteNav = { SITE, docs, mount, mountCompact, boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
