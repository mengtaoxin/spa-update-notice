# SPA Update Notice

A tiny, almost-never-updated static page for **browser-side lazy-load failures** after an SPA deploy.

When a Vite/React (or similar) app ships a new build, old hashed JS chunks disappear. Tabs that were left open can hit errors such as:

- `Failed to fetch dynamically imported module`
- `Loading chunk ... failed`
- Vite `vite:preloadError`

Your apps load the hosted script and call `SpaUpdateNotice.show()` to show a friendly “please refresh” UI instead of a raw browser error.

**Scope:** client-side chunk / dynamic-import failures only. No server 404 HTML fallback, no CDN/gateway changes, no Service Worker, no hard refresh / cache clearing.

## Hosted URL (use this)

No need to deploy this repo yourself. Use the fixed public endpoint:

| Asset | URL |
|-------|-----|
| Script | https://spa-update-notice.smt.sh/update-required.js |
| Preview | https://spa-update-notice.smt.sh/ |

## Script API

```js
window.SpaUpdateNotice.show({
  lang?: 'en' | 'zh',              // default: auto (see below)
  appName?: string,                // optional, shown in copy
  container?: HTMLElement | string, // default document.body; e.g. '#root'
  onRefresh?: () => void,          // default: () => location.reload()
});

window.SpaUpdateNotice.hide();     // optional
```

Language resolution order:

1. `show({ lang })`
2. `localStorage` key `spa-update-notice-lang`
3. `navigator.language` (`zh*` → Chinese, otherwise English)
4. Default `'en'`

Switching language in the UI writes back to `localStorage`.

The refresh button always uses a normal reload (`location.reload()`). It does **not** clear Service Workers or Cache Storage.

## Integrate in a Vite + React app

Register early in `main.tsx` (or equivalent):

```js
// main.tsx — register as early as practical
const NOTICE_JS = 'https://spa-update-notice.smt.sh/update-required.js';

function isChunkError(err) {
  const msg = String(err?.message ?? err);
  return /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|ChunkLoadError/i.test(
    msg,
  );
}

async function ensureNotice() {
  if (window.SpaUpdateNotice) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = NOTICE_JS;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function showUpdateNotice() {
  try {
    await ensureNotice();
    window.SpaUpdateNotice.show({
      /* lang optional — auto-detect */
      // appName: 'My App',
      // container: '#root',
    });
  } catch {
    // Minimal fallback if the notice CDN fails
    if (confirm('App updated. Refresh now?')) location.reload();
  }
}

window.addEventListener('vite:preloadError', (e) => {
  const key = 'chunk-reload-at';
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(key, String(Date.now()));
    e.preventDefault();
    location.reload();
    return;
  }
  e.preventDefault();
  showUpdateNotice();
});

// Also call showUpdateNotice() from a React Error Boundary when isChunkError(error)
```

**Behavior notes**

- On first chunk failure within a short window, auto-`reload()` once (`sessionStorage` prevents a reload loop).
- If it still fails, show the notice page.
- Refresh button = `location.reload()` only.

### Error Boundary sketch

```jsx
class ChunkErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    if (isChunkError(error)) return { hasError: true };
    throw error;
  }

  componentDidCatch(error) {
    if (isChunkError(error)) showUpdateNotice();
  }

  render() {
    if (this.state.hasError) return null; // notice UI takes over
    return this.props.children;
  }
}
```

## Caching suggestions

| Asset | Suggested cache | Why |
|-------|-----------------|-----|
| Hosted `update-required.js` / preview page | Long-lived (already served from a stable URL) | Filename is fixed and content rarely changes |
| Your SPA’s `index.html` | `no-cache` / short revalidate | So users pick up new chunk hashes after deploy |

CORS: a classic `<script src="...">` load does not need CORS. If you ever fetch the file via `fetch()`, ensure the host allows it.

## Files (this repo)

| File | Purpose |
|------|---------|
| `update-required.js` | Main deliverable — IIFE, zero deps, stable filename (no content hash) |
| `index.html` | Standalone preview of the same UI (language switch + refresh) |

This repo is a **pure static** site (no build step). The public site at https://spa-update-notice.smt.sh is the shared deployment; self-hosting is optional and only needed if you want a private copy.

## Local preview

Open `index.html` in a browser, or serve the folder:

```bash
npx --yes serve .
# or: python3 -m http.server 8080
```

In DevTools console after loading the script:

```js
SpaUpdateNotice.show({ appName: 'Demo' });
SpaUpdateNotice.hide();
```

Or load the hosted script directly:

```js
// https://spa-update-notice.smt.sh/update-required.js
SpaUpdateNotice.show({ appName: 'Demo' });
```

## Non-goals

- Server-side 404 HTML fallback for missing chunks
- Hard refresh / clearing SW or Cache Storage
- React/Vue runtime for the notice itself
- Content-hashed notice filenames
- Languages beyond English and Chinese
