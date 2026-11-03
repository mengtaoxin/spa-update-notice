# SPA Update Notice

A tiny, almost-never-updated static page for **browser-side lazy-load failures** after an SPA deploy.

When a Vite/React (or similar) app ships a new build, old hashed JS chunks disappear. Tabs that were left open can hit errors such as:

- `Failed to fetch dynamically imported module`
- `Loading chunk ... failed`
- Vite `vite:preloadError`

Your apps load the hosted script once. The library owns the flow: **auto-reload once**, then show a friendly “please refresh” UI if it still fails.

**Scope:** client-side chunk / dynamic-import failures only. No server 404 HTML fallback, no CDN/gateway changes, no Service Worker, no hard refresh / cache clearing.

## Hosted URL (use this)

No need to deploy this repo yourself. Use the fixed public endpoint:

| Asset | URL |
|-------|-----|
| Script | https://spa-update-notice.smt.sh/update-required.js |
| Preview | https://spa-update-notice.smt.sh/ |

## Script API

```js
// Preferred for apps: reload once, then show notice if still broken
window.SpaUpdateNotice.handle({
  lang?: 'en' | 'zh',
  appName?: string,
  container?: HTMLElement | string,
  onRefresh?: () => void,
  autoReload?: boolean,            // default true
});

// Register Vite's vite:preloadError → handle()
window.SpaUpdateNotice.install({ /* same options as handle */ });

window.SpaUpdateNotice.isChunkError(err); // shared detector for Error Boundaries

// Always show the UI (preview / no auto-reload)
window.SpaUpdateNotice.show({ /* same options minus autoReload */ });

window.SpaUpdateNotice.hide();
```

Language resolution order:

1. `show` / `handle` / `install` `{ lang }`
2. `localStorage` key `spa-update-notice-lang`
3. `navigator.language` (`zh*` → Chinese, otherwise English)
4. Default `'en'`

Switching language in the UI writes back to `localStorage`.

The refresh button always uses a normal reload (`location.reload()`). It does **not** clear Service Workers or Cache Storage.

**Behavior (inside this library)**

- First chunk failure within ~10s → silent `location.reload()` once (`sessionStorage` key `spa-update-notice-reload-at`).
- If it fails again inside that window → show the notice page.
- Pass `autoReload: false` to skip the silent reload and always show.

## Integrate in a Vite + React app

> **Do not block page render.** Load `update-required.js` **asynchronously** (`script.async = true`, or `<script async src="...">`). Never put a synchronous `<script src="...">` in your app’s critical path — this notice is for rare chunk-load failures and must not delay the normal UI.

```js
// main.tsx — as early as practical
const NOTICE_JS = 'https://spa-update-notice.smt.sh/update-required.js';

async function ensureNotice() {
  if (window.SpaUpdateNotice) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = NOTICE_JS;
    s.async = true; // required: do not block page paint
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

await ensureNotice();
window.SpaUpdateNotice.install({
  // appName: 'My App',
  // container: '#root',
});
```

### Error Boundary

```jsx
class ChunkErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    if (window.SpaUpdateNotice?.isChunkError(error)) return { hasError: true };
    throw error;
  }

  componentDidCatch(error) {
    if (window.SpaUpdateNotice?.isChunkError(error)) {
      window.SpaUpdateNotice.handle({
        // appName: 'My App',
        // container: '#root',
      });
    }
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
