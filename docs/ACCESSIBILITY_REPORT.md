# Accessibility Report

## ⚠️ Partially verified — source inspection only

No browser, no screen reader, no axe-core. Keyboard navigation, focus order,
contrast ratios and screen-reader output **were not tested**.

## Measured in source

| Attribute | Occurrences |
|---|---|
| `aria-label` | 14 |
| `aria-hidden` | 5 |
| `aria-live` | 1 |
| `role=` | 8 |
| `focus:` styles | 54 |
| `sr-only` | **0** |

## Images — investigated, correctly labelled

Initially flagged 9 `<img>` as missing `alt`. **False positive** — a line-based
grep, and every one has `alt` on the following line. Verified individually:

| File | alt |
|---|---|
| `MenuCard.tsx` | `alt={item.name}` |
| `TodaysSpecials.tsx` | `alt={item.name}` |
| `HeroSection.tsx` | `alt={activeSlideData.title}` |
| `GallerySection.tsx` ×2 | `alt={item.title}` / `alt={selectedItem.title}` |
| `CheckoutView.tsx` | `` alt={`UPI QR code to pay ₹${total}`} `` |
| `MenuManagerView.tsx` ×2 | `alt={dish.name}` / `alt="Preview"` |
| `GalleryView.tsx` | `alt={item.title}` |

**9/9 labelled.** The QR code's alt naming the amount is a genuinely good
touch — a screen-reader user is told what they are about to pay.

## Positive findings

- `focus:` styles on 54 elements — focus is not suppressed
- `aria-hidden` correctly applied to decorative icons and timeline connectors
- `motion-reduce:` honoured in `OrderProgressTimeline` — animation is disabled
  for users who ask for less movement
- Semantic `<dl>/<dt>/<dd>` in the order tracker detail grid
- Error messages are adjacent to their inputs, not colour-only

## Concerns (source-level, unconfirmed)

| | Concern | Note |
|---|---|---|
| A11Y-1 | `sr-only` never used | No screen-reader-only text anywhere. Icon-only buttons may be unlabelled. |
| A11Y-2 | Only 1 `aria-live` region | Toasts may not be announced. `ToastHost` should be a live region. |
| A11Y-3 | Contrast not measured | Gold `#C5A059` on dark `#121212` looks compliant but was **not measured**. |
| A11Y-4 | Modal focus trapping unverified | `AuthModal`, `OrderTrackerModal`, `CartDrawer` — no focus-trap library present. |
| A11Y-5 | Keyboard nav untested | `GallerySection` handles Escape; nothing else verified. |

**None of these were fixed.** Each needs a browser to confirm it is real, and
fixing unconfirmed a11y issues risks changing correct behaviour blind.

## Not verified

Keyboard navigation · Focus order · Focus trapping · Screen readers (VoiceOver,
NVDA, TalkBack) · Contrast ratios · Zoom to 200% · Reduced motion as rendered ·
WCAG conformance at any level
