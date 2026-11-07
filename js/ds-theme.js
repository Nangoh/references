/* ds-theme.js — 테마(라이트/다크/시스템) 전환.
   <head> 안에서 tokens.css 다음에 동기 로드하면 깜빡임이 없다.
   API: DSTheme.get() | set(mode) | toggle() | effective() | onChange(cb)
   저장: localStorage 'ds-theme' ('light'|'dark'|'system'), 실패해도 동작.
   이벤트: window 'ds-themechange' { detail: { effective, mode } } */
(function (global) {
  var KEY = 'ds-theme';
  var root = document.documentElement;
  var mq = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;
  var listeners = [];
  var mode = 'system';

  function read() {
    try { var v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark' || v === 'system') return v; } catch (e) {}
    return 'system';
  }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function effective() {
    if (mode === 'light' || mode === 'dark') return mode;
    return mq && mq.matches ? 'dark' : 'light';
  }
  function apply(fire) {
    if (mode === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    var eff = effective();
    root.style.colorScheme = eff;
    if (fire !== false) {
      var detail = { effective: eff, mode: mode };
      listeners.forEach(function (cb) { try { cb(detail); } catch (e) {} });
      try { global.dispatchEvent(new CustomEvent('ds-themechange', { detail: detail })); } catch (e) {}
    }
    // 토글 버튼 라벨 동기화
    var btns = document.querySelectorAll ? document.querySelectorAll('.ds-theme-toggle') : [];
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-label', eff === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
      btns[i].setAttribute('data-effective', eff);
    }
  }
  function set(v) {
    if (v !== 'light' && v !== 'dark' && v !== 'system') v = 'system';
    mode = v; write(v); apply(true);
  }
  function toggle() { set(effective() === 'dark' ? 'light' : 'dark'); }
  function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); return function () { listeners = listeners.filter(function (f) { return f !== cb; }); }; }

  mode = read();
  apply(false);
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (mode === 'system') apply(true); });

  // data-ds-theme-toggle 속성이 있는 요소는 자동으로 토글 버튼이 된다.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('.ds-theme-toggle, [data-ds-theme-toggle]') : null;
    if (t) { e.preventDefault(); toggle(); }
  });
  document.addEventListener('DOMContentLoaded', function () { apply(false); });

  global.DSTheme = { get: function () { return mode; }, set: set, toggle: toggle, effective: effective, onChange: onChange };
})(window);
