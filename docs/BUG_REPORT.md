# Bug Report

Commit `f25a109`. Every entry: severity, root cause, fix, evidence, retest.

---

## BUG-01 · 🔴 CRITICAL (tooling) · React types missing — JSX entirely unchecked

**Root cause.** `@types/react` and `@types/react-dom` were never installed or
declared. Without them TypeScript has no `JSX.IntrinsicElements`, so every JSX
element resolves to `any` and no prop is checked. 48 `.tsx` files affected.

**Evidence — before.**
```tsx
// src/__jsxprobe.tsx
export const Probe = () => <div nonsenseProp={123} onClick={"not a function"} />;
```
```
$ npx tsc --noEmit | grep -c __jsxprobe
0
```
Also: `npx tsc --strict` reported 4070 × TS7026 *"JSX element implicitly has
type 'any' because no interface JSX.IntrinsicElements exists"*.

**Impact.** Every `tsc --noEmit clean` claim in RC1, RC2 and
PRODUCTION_READINESS_REPORT overstated what was verified. Component props,
event handlers and children went unchecked for the life of the project.

**Fix.** `npm i -D @types/react@^19 @types/react-dom@^19`

**Evidence — after.**
```
src/__jsxprobe.tsx(2,52): error TS2322: Type 'string' is not assignable to
  type 'MouseEventHandler<HTMLDivElement>'.
```

**Retest.** ✅ Probe caught. Full codebase: 1 pre-existing error surfaced
(BUG-02), fixed. `tsc --noEmit` now clean *and meaningful*. 144/144 tests pass.

---

## BUG-02 · 🟠 MEDIUM · Header received a route value its type rejects

**Root cause.** `App.tsx` holds `activeSection` over 7 values; `Header`'s prop
type accepted 5. Invisible while JSX was unchecked (BUG-01).

**Evidence.** Surfaced the moment React types were installed:
```
src/App.tsx(473,9): error TS2322:
  Type '"admin" | "driver" | "menu" | "track" | "orders" | "kitchen" | "checkout"'
  is not assignable to type '"admin" | "driver" | "menu" | "track" | "kitchen"'.
```

**Impact.** On `checkout` and `orders`, `Header`'s active-state comparison
matched nothing, so no nav item highlighted — the user lost their "where am I"
cue mid-checkout.

**Fix.** Single `AppSection` type in `src/types/index.ts`, used by both. They
can no longer drift.

**Retest.** ✅ `tsc --noEmit` clean. 144/144 pass. Build succeeds.

---

## BUG-03 · 🟡 LOW (latent) · Two routes render a blank page

**Root cause.** The `activeSection` union permitted `'track'` and `'kitchen'`,
neither of which has a render branch in `App.tsx`. Kitchen is an admin *tab*;
tracking is a *modal*. Neither is a top-level section.

**Evidence.**
```
rendered:  'admin' 'checkout' 'driver' 'menu' 'orders'
permitted: 'menu' 'checkout' 'orders' 'track' 'admin' 'kitchen' 'driver'
setters:   admin(4) checkout(4) driver(1) menu(13) orders(1)   ← never track/kitchen
```

**Impact.** Latent, not live — nothing set them. But the type invited a
future blank-page bug with no error and no console output.

**Fix.** Removed from `AppSection`. Setting them is now a compile error.

**Retest.** ✅ Clean. No behaviour change — the values were unreachable.

---

## BUG-04 · 🟠 MEDIUM (security / UX) · "Switch Role to Admin" shipped to production

**Root cause.** `AdminGuardView` rendered a *"Demo Environment Quick Switch"*
block with a **"Switch Role to Admin"** button, unconditionally. Only the
underlying function was environment-gated, not the UI.

**Evidence — before.** `grep -c "Switch Role to Admin" dist/assets/index-*.js` → `1`

**Is it privilege escalation? No.** `switchDemoRole()` checks
`DEMO_ROLE_SWITCH_ENABLED = import.meta.env.DEV` and returns early with a
console warning in production. Clicking it did nothing. And even in dev it only
sets local React state — RLS still governs data.

**Real impact.** A dead button on a security screen, telling anyone who reaches
the admin guard that role switching exists in this application. Bad UX, and an
invitation to probe.

**Fix.** Gated the JSX on `import.meta.env.DEV` **inline**. The imported
constant was tried first but crosses a module boundary, so Rollup could not
eliminate it — the strings still shipped. The inline form is substituted
literally by Vite at build time and the branch is removed.

**Evidence — after.** `grep -c "Switch Role to Admin" dist/assets/index-*.js` → `0`

**Retest.** ✅ Gone from the bundle. Dev behaviour unchanged.

---

## BUG-05 · 🟡 LOW (performance) · No lazy loading on menu images

**Root cause.** Zero `loading="lazy"` anywhere. `MenuCard` renders one image per
dish, most below the fold on a phone.

**Impact.** Every menu image fetched before first paint, typically over a mobile
network.

**Fix.** `loading="lazy" decoding="async"` on `MenuCard`.

**Retest.** ✅ Build succeeds, 344.65 kB gzip. **Not measured in a browser** —
no browser available; the improvement is structural, not benchmarked.

---

## BUG-06 · 🟡 LOW · `vite-env.d.ts` missing

**Root cause.** No `/// <reference types="vite/client" />`, so `import.meta.env`
was untyped. The codebase worked around it with `(import.meta as any).env?.X`.

**Impact.** Two-fold. The cast loses type safety on env access — and it also
**defeats Vite's build-time substitution**, so a dev-only branch written that
way ships to production and is merely never executed rather than eliminated.
That is precisely how BUG-04 survived into the bundle.

**Fix.** Added `src/vite-env.d.ts` with the client reference and a typed
`ImportMetaEnv`.

**Retest.** ✅ `import.meta.env.DEV` now typed and statically replaced.

---

## Investigated — NOT bugs

| Suspected | Verdict | Evidence |
|---|---|---|
| 9 `<img>` without `alt` | ❌ False positive | All 9 have `alt` on the next line; grep was line-based |
| 5 `target="_blank"` without `rel` | ❌ False positive | All 5 have `rel="noreferrer"` adjacent |
| Timer / listener leaks | ✅ Clean | 3 × `setInterval` + 1 × `addEventListener`, all with cleanup returns |
| Realtime subscription leak | ✅ Clean | `App.tsx` effect returns `unsubscribe` for both channels |
| XSS sinks | ✅ None | 0 × `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` |
| Hardcoded secrets | ✅ None | No `service_role`, `sb_secret_`, or embedded keys in `src/` |
| `strictNullChecks` violations | ✅ 0 errors | Though weakened by BUG-01 at time of measurement |

---

## Known, not fixed

| | Item | Why not |
|---|---|---|
| DEBT-1 | 56 unused imports/locals (`--noUnusedLocals`) | Mostly unused lucide icons. Cosmetic, tree-shaken from the bundle. Touching 20+ files during a freeze is worse than the noise. |
| DEBT-2 | `strict` not enabled in tsconfig | Now that React types exist this is worth doing, but it is a post-release change, not a freeze-window one. `strictNullChecks` alone reports 0 errors and is a safe first step. |
| DEBT-3 | No ESLint | Not installed. Recommended post-release. |
| DEBT-4 | Main bundle 344 kB gzip | Above Vite's raw warning, acceptable in practice. jsPDF/html2canvas already split. |
