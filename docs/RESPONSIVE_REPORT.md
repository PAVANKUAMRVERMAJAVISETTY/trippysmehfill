# Responsive Report

## ⚠️ Not verified — no browser available

**Nothing in this report was confirmed by rendering the application.** No
browser exists in this environment, and the project has no browser tooling:

```
playwright         ABSENT      cypress              ABSENT
@playwright/test   ABSENT      jsdom                ABSENT
puppeteer          ABSENT      happy-dom            ABSENT
@testing-library/react  ABSENT
```

Installing Playwright was considered and rejected: with signup broken and the
`orders` table empty, no journey could complete anyway, so the browser would
confirm little beyond static layout — at the cost of a heavy dependency added
during a release freeze.

**Every item below is source inspection only.**

## What the source shows

| Concern | Evidence | Confidence |
|---|---|---|
| Mobile-first breakpoints | `sm:` `md:` `lg:` used throughout | High — but layout not seen |
| Tap targets ≥48 px | `min-h-[48px]` on admin verify/reject; 56 px primary buttons in checkout | High |
| Admin table → cards | `hidden lg:block` table, `lg:hidden` card list in `PaymentVerificationView` | High |
| Safe-area insets | `env(safe-area-inset-bottom)` on the sticky checkout bar | Medium — needs a real iPhone |
| Overflow control | `min-w-0`, `truncate`, `break-words` on long values | Medium |
| Horizontal scroll containers | `overflow-x-auto no-scrollbar` on nav strips | Medium |
| QR scaling | `w-full max-w-[260px] aspect-square`, fetched at 400×400 | High |

## Explicitly NOT verified

Desktop · Laptop · Tablet · Android · iPhone · Small screens · Large screens ·
Landscape · Portrait · **Every one unverified.**

Also unverified: actual tap-target sizes as rendered, text legibility, the
sticky bar against the iPhone home indicator, on-screen-keyboard behaviour,
`upi://` intent handling, clipboard on iOS Safari, and the Web Share sheet.

## How to close this gap

[MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) section F contains 13 device cases
(F-01…F-13). They need a person with a real phone — **an emulator will not
catch tap targets, safe areas, or keyboard overlap**.
