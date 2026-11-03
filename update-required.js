/*!
 * spa-update-notice — browser notice for stale SPA chunk loads.
 * Zero runtime deps.
 * Hosted: https://spa-update-notice.smt.sh/update-required.js
 */
(function (global) {
  'use strict';

  var LANG_KEY = 'spa-update-notice-lang';
  var STYLE_ID = 'spa-update-notice-styles';
  var ROOT_ID = 'spa-update-notice-root';

  var COPY = {
    en: {
      title: 'App updated',
      body: 'A newer version is available. Please refresh to continue.',
      bodyNamed: 'A newer version of {appName} is available. Please refresh to continue.',
      refresh: 'Refresh',
      langLabel: 'Language',
      zh: '中文',
      en: 'English',
    },
    zh: {
      title: '应用已更新',
      body: '检测到新版本，请刷新页面后继续使用。',
      bodyNamed: '检测到 {appName} 的新版本，请刷新页面后继续使用。',
      refresh: '刷新',
      langLabel: '语言',
      zh: '中文',
      en: 'English',
    },
  };

  var state = {
    visible: false,
    lang: 'en',
    appName: '',
    container: null,
    onRefresh: null,
    host: null,
  };

  function detectLang(explicit) {
    if (explicit === 'en' || explicit === 'zh') return explicit;
    try {
      var stored = localStorage.getItem(LANG_KEY);
      if (stored === 'en' || stored === 'zh') return stored;
    } catch (_) { /* ignore */ }
    var nav =
      (typeof navigator !== 'undefined' &&
        (navigator.language || (navigator.languages && navigator.languages[0]))) ||
      '';
    if (/^zh/i.test(nav)) return 'zh';
    return 'en';
  }

  function persistLang(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (_) { /* ignore */ }
  }

  function resolveContainer(container) {
    if (!container) return document.body;
    if (typeof container === 'string') {
      return document.querySelector(container) || document.body;
    }
    return container;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + ROOT_ID + ',#' + ROOT_ID + ' *{box-sizing:border-box;margin:0;padding:0}',
      '#' + ROOT_ID + '{',
      '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
      '  -webkit-font-smoothing:antialiased;',
      '  -moz-osx-font-smoothing:grayscale;',
      '  min-height:100vh;min-height:100dvh;',
      '  display:flex;align-items:center;justify-content:center;',
      '  padding:24px 20px;',
      '  background:#f6f7f9;',
      '  color:#1a1d23;',
      '}',
      '#' + ROOT_ID + ' .sun-card{',
      '  width:100%;max-width:420px;',
      '  text-align:center;',
      '}',
      '#' + ROOT_ID + ' .sun-title{',
      '  font-size:1.5rem;font-weight:650;letter-spacing:-0.02em;',
      '  line-height:1.3;margin-bottom:12px;',
      '}',
      '#' + ROOT_ID + ' .sun-body{',
      '  font-size:1rem;line-height:1.55;color:#4a5160;',
      '  margin-bottom:28px;',
      '}',
      '#' + ROOT_ID + ' .sun-refresh{',
      '  display:inline-flex;align-items:center;justify-content:center;',
      '  min-height:48px;min-width:160px;padding:12px 28px;',
      '  font:inherit;font-size:1.0625rem;font-weight:600;',
      '  color:#fff;background:#1a1d23;border:none;border-radius:10px;',
      '  cursor:pointer;-webkit-tap-highlight-color:transparent;',
      '  transition:background .15s ease,transform .1s ease;',
      '}',
      '#' + ROOT_ID + ' .sun-refresh:hover{background:#2d3340}',
      '#' + ROOT_ID + ' .sun-refresh:active{transform:scale(.98)}',
      '#' + ROOT_ID + ' .sun-refresh:focus-visible{outline:2px solid #3b82f6;outline-offset:3px}',
      '#' + ROOT_ID + ' .sun-langs{',
      '  margin-top:28px;display:flex;align-items:center;justify-content:center;gap:8px;',
      '  font-size:.875rem;color:#6b7280;',
      '}',
      '#' + ROOT_ID + ' .sun-lang{',
      '  font:inherit;font-size:.875rem;background:none;border:none;',
      '  color:#6b7280;cursor:pointer;padding:6px 4px;',
      '  text-decoration:underline;text-underline-offset:3px;',
      '  -webkit-tap-highlight-color:transparent;',
      '}',
      '#' + ROOT_ID + ' .sun-lang[aria-current="true"]{',
      '  color:#1a1d23;font-weight:600;text-decoration:none;cursor:default;',
      '}',
      '#' + ROOT_ID + ' .sun-lang:focus-visible{outline:2px solid #3b82f6;outline-offset:2px;border-radius:4px}',
      '#' + ROOT_ID + ' .sun-sep{color:#c4c9d2;user-select:none}',
      '@media (prefers-color-scheme:dark){',
      '  #' + ROOT_ID + '{background:#12141a;color:#f0f2f5}',
      '  #' + ROOT_ID + ' .sun-body{color:#a8b0c0}',
      '  #' + ROOT_ID + ' .sun-refresh{background:#eef1f6;color:#12141a}',
      '  #' + ROOT_ID + ' .sun-refresh:hover{background:#fff}',
      '  #' + ROOT_ID + ' .sun-langs{color:#8b93a3}',
      '  #' + ROOT_ID + ' .sun-lang{color:#8b93a3}',
      '  #' + ROOT_ID + ' .sun-lang[aria-current="true"]{color:#f0f2f5}',
      '  #' + ROOT_ID + ' .sun-sep{color:#3d4452}',
      '}',
    ].join('');
    document.head.appendChild(style);
  }

  function bodyText(copy) {
    if (state.appName) {
      return copy.bodyNamed.replace('{appName}', state.appName);
    }
    return copy.body;
  }

  function render() {
    if (!state.host) return;
    var copy = COPY[state.lang] || COPY.en;

    state.host.innerHTML =
      '<div class="sun-card" role="alert" aria-live="assertive">' +
      '<h1 class="sun-title">' +
      escapeHtml(copy.title) +
      '</h1>' +
      '<p class="sun-body">' +
      escapeHtml(bodyText(copy)) +
      '</p>' +
      '<button type="button" class="sun-refresh" data-action="refresh">' +
      escapeHtml(copy.refresh) +
      '</button>' +
      '<div class="sun-langs" role="group" aria-label="' +
      escapeHtml(copy.langLabel) +
      '">' +
      '<button type="button" class="sun-lang" data-lang="zh" aria-current="' +
      (state.lang === 'zh' ? 'true' : 'false') +
      '">' +
      escapeHtml(copy.zh) +
      '</button>' +
      '<span class="sun-sep" aria-hidden="true">·</span>' +
      '<button type="button" class="sun-lang" data-lang="en" aria-current="' +
      (state.lang === 'en' ? 'true' : 'false') +
      '">' +
      escapeHtml(copy.en) +
      '</button>' +
      '</div>' +
      '</div>';

    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function onClick(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var action = t.getAttribute('data-action');
    if (action === 'refresh') {
      var fn = state.onRefresh || defaultRefresh;
      fn();
      return;
    }
    var lang = t.getAttribute('data-lang');
    if (lang === 'en' || lang === 'zh') {
      if (lang === state.lang) return;
      state.lang = lang;
      persistLang(lang);
      render();
    }
  }

  function defaultRefresh() {
    global.location.reload();
  }

  function show(options) {
    options = options || {};
    ensureStyles();

    state.lang = detectLang(options.lang);
    if (options.lang === 'en' || options.lang === 'zh') {
      persistLang(options.lang);
    }
    state.appName = options.appName ? String(options.appName) : '';
    state.onRefresh =
      typeof options.onRefresh === 'function' ? options.onRefresh : null;
    state.container = resolveContainer(options.container);

    var host = document.getElementById(ROOT_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = ROOT_ID;
    }

    // Clear / cover the target container and show the notice.
    state.container.innerHTML = '';
    state.container.appendChild(host);
    state.host = host;
    state.visible = true;

    if (!host._sunBound) {
      host.addEventListener('click', onClick);
      host._sunBound = true;
    }

    render();
    return api;
  }

  function hide() {
    var host = document.getElementById(ROOT_ID);
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    state.host = null;
    state.visible = false;
    return api;
  }

  var api = {
    show: show,
    hide: hide,
    version: '1.0.0',
  };

  global.SpaUpdateNotice = api;
})(typeof window !== 'undefined' ? window : this);
