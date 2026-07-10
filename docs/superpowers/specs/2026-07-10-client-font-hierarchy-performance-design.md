# Client Font Hierarchy & Performance — Design Spec

**Date:** 2026-07-10
**Scope:** `client/` (participant app)
**Approach:** B — Font imports fix + PixelBlast lazy-loading + preconnect hints

---

## Problem Summary

Three independent issues were found during codebase audit:

1. **Broken font imports** — `Space Grotesk` (assigned to `--font-h2`) and `Fira Code` (assigned to `--font-mono`) are never imported from Google Fonts. Every `h2`–`h6` element and all code blocks silently fall back to system fonts. Additionally, `Exo 2` and `Work Sans` are imported but never referenced in any CSS variable, wasting two network requests.

2. **Three.js in initial bundle** — `PixelBlast` (uses `three` + `postprocessing`, ~500KB) is imported statically in `ErrorBoundary.jsx`, which itself is imported synchronously in `main.jsx` and wraps the entire app. This forces the `three-vendor` chunk into the critical path for every user on every page, even though PixelBlast only renders when an error boundary triggers or on the Login/NotFound/ClaimUsername pages.

3. **No font server preconnect** — Google Fonts connections are not pre-established, adding TCP/TLS round-trip latency before font CSS can be fetched.

---

## Design

### Section 1 — Fix font imports (`client/src/index.css`)

**Remove:** Line 21 — the `@import` for `Exo 2` and `Work Sans` (unused).

**Merge:** The two existing Google Fonts `@import` lines (lines 10 and 21) into a single consolidated `@import` that retains all currently-used families and adds the two missing ones:
- `Michroma` (already used for `--font-h1`) — retained
- `Orbitron` wght 400–900 (already used) — retained
- `Space Grotesk` wght 300–700 — **added, fixes `--font-h2`**
- `Fira Code` wght 300–600 — **added, fixes `--font-mono`**

All four families in one `fonts.googleapis.com` request using `&display=swap`.

**Constraint:** Existing font variable assignments in `:root` are not changed. Font choices are preserved exactly as-is.

**Result:** `h2`–`h6` elements and `.font-h2` / `.text-section-title` utility classes will render in Space Grotesk as designed. `code`, `pre`, `kbd`, `samp`, and `.font-mono` elements will render in Fira Code.

---

### Section 2 — Lazy-load PixelBlast (4 files)

**Files:** `ErrorBoundary.jsx`, `Login.jsx`, `NotFound.jsx`, `ClaimUsername.jsx`

**Change:** In each file, replace the static `import PixelBlast from '../components/PixelBlast'` with `React.lazy(() => import('../components/PixelBlast'))` and wrap the `<PixelBlast>` usage in a `<Suspense fallback={null}>`.

- For `Login.jsx`, `NotFound.jsx`, `ClaimUsername.jsx`: these are already lazy-loaded page routes wrapped by the global `<Suspense>` in `App.jsx`, but PixelBlast itself still loads eagerly within those chunks. Making PixelBlast itself lazy creates a separate split point.
- For `ErrorBoundary.jsx`: this is the critical case. It must get its own local `<Suspense fallback={null}>` around `<PixelBlast>` since it sits outside `App.jsx`'s `Suspense`. The PixelBlast canvas is decorative — a `null` fallback is appropriate while the chunk loads.

**Result:** `three-vendor` chunk is excluded from the initial bundle. It is only fetched when the user lands on Login, NotFound, ClaimUsername, or triggers an error boundary.

**Constraint:** The PixelBlast visual effect itself is not modified.

---

### Section 3 — Preconnect hints (`client/index.html`)

**Add to `<head>`**, before any `<link rel="stylesheet">`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
```

This pre-establishes TCP+TLS connections to Google's font servers so that when the browser parses `index.css` and finds the `@import`, the connection is already open.

---

## Files Changed

| File | Change |
|------|--------|
| `client/index.html` | Add 2 preconnect `<link>` tags |
| `client/src/index.css` | Fix font imports (remove 2 unused, add Space Grotesk + Fira Code) |
| `client/src/components/ErrorBoundary.jsx` | Lazy-load PixelBlast with local Suspense |
| `client/src/pages/Login.jsx` | Lazy-load PixelBlast |
| `client/src/pages/NotFound.jsx` | Lazy-load PixelBlast |
| `client/src/pages/ClaimUsername.jsx` | Lazy-load PixelBlast |

**Total: 6 files**

---

## Out of Scope

- Font variable assignments (`--font-h1`, `--font-h2`, `--font-body`, `--font-mono`) — not changed
- The global `h1` gradient text rule — not changed (kept per user preference)
- PixelBlast visual effect — not changed
- `CachedImage` `loading="lazy"` — deferred to a future pass
