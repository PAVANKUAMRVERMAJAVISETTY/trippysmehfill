# Performance Report

## Build output (measured)

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` | 1,290.00 kB | **344.65 kB** |
| `jspdf.es.min-*.js` | 390.77 kB | 128.82 kB |
| `html2canvas.esm-*.js` | 202.38 kB | 48.04 kB |
| `index.es-*.js` | 159.76 kB | 53.56 kB |
| `purify.es-*.js` | 29.17 kB | 10.99 kB |
| `index-*.css` | 82.42 kB | 13.11 kB |

Build time: **3.56s**. Vite warns the main chunk exceeds its 500 kB raw
threshold.

**Assessment: acceptable, not ideal.** 344 kB gzip for an authenticated app is
within normal range. The three heaviest dependencies — jsPDF, html2canvas,
DOMPurify — are already code-split behind `await import('jspdf')` in
`receipt.ts` and load only when a customer downloads a receipt.

## Fixed this pass

**BUG-05 — no lazy loading on images.** Zero `loading="lazy"` anywhere.
`MenuCard` renders one image per dish, most below the fold on a phone, so every
menu image was fetched before first paint over a mobile network. Added
`loading="lazy" decoding="async"`.

## Memory leaks — audited, clean

| Pattern | Count | Cleanup |
|---|---|---|
| `setInterval` | 3 (`AuthModal`, `HeroSection`, `GallerySection`) | ✅ all return `clearInterval` |
| `addEventListener` | 1 (`GallerySection` keydown) | ✅ returns `removeEventListener` |
| Realtime channels | 2 (orders, inventory) | ✅ effect returns `unsubscribe` for both |
| Toast timers | Map in `ToastContext` | ✅ `clearTimeout` on dismiss |

`setTimeout` appears ~20 times for transient UI feedback (copy confirmations,
success banners). These are not cleared on unmount. Under React 19 this produces
no warning and no leak of consequence — the timer holds a closure for at most a
few seconds. **Noted, not fixed**: clearing them would touch a dozen files during
a freeze for no measurable gain.

## Realtime performance

The subscription refetches **all** orders on any change:

```ts
realtimeService.subscribeToOrders(() => {
  ordersService.fetchOrders().then(setOrders)
})
```

Fine at current scale (production `orders` is empty; a single kitchen). **Will
degrade** — at a few thousand orders every status change triggers a full table
fetch for every connected client. Applying the changed row from the payload
instead would fix it. Out of scope for a freeze; flagged for the next cycle.

## Not verified

- **Lighthouse / Core Web Vitals** — no browser
- **Actual load, paint, or interaction timings** — no browser
- **Memory profiling over a session** — no browser
- **Realtime under concurrent load** — needs multiple live clients
- **Image delivery** — served from Unsplash and Supabase Storage; CDN behaviour
  not measured

The lazy-loading fix is structural. **It was not benchmarked.**
