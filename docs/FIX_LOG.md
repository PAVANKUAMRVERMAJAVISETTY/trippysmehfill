# Fix Log

Chronological. Every fix: change, files, verification.

| # | Bug | Change | Files | Verified |
|---|---|---|---|---|
| 1 | BUG-01 | Installed `@types/react@^19`, `@types/react-dom@^19` | `package.json`, `package-lock.json` | Probe file now errors; previously 0 errors |
| 2 | BUG-02 | Added `AppSection` type; `App` and `Header` share it | `types/index.ts`, `App.tsx`, `Header.tsx` | `tsc` clean; the TS2322 it exposed is gone |
| 3 | BUG-03 | Removed `'track'` and `'kitchen'` from the route union | `types/index.ts` | `tsc` clean; values were unreachable so no behaviour change |
| 4 | BUG-04 | Gated the demo role switcher on `import.meta.env.DEV` inline | `AdminGuardView.tsx`, `AuthContext.tsx` | Bundle grep 1 → 0 |
| 5 | BUG-06 | Added `src/vite-env.d.ts` | `vite-env.d.ts` | `import.meta.env.DEV` typed and statically replaced |
| 6 | BUG-05 | `loading="lazy" decoding="async"` on menu images | `MenuCard.tsx` | Build succeeds |

## Regression testing after each change

Run after every fix, not once at the end:

```
tsc --noEmit     clean throughout
node:test        144 / 144 throughout
npm run build    succeeded throughout
```

Bundle across the pass: 344.63 → 344.65 kB gzip (+0.02 kB, the lazy-load
attributes).

## A fix that was reverted mid-pass

For BUG-04 I first gated the JSX on the imported `DEMO_ROLE_SWITCH_ENABLED`
constant. The build still contained the strings — `grep -c` returned `1` — because
the constant crosses a module boundary and Rollup would not propagate it. Runtime
behaviour was correct (the branch never rendered), but the code still shipped.

Replaced with inline `import.meta.env.DEV`, which Vite substitutes literally at
build time, allowing the branch to be eliminated. Verified `1 → 0`.

Recorded because the first fix *looked* correct and passed every test. Only
grepping the built artefact showed it had not achieved the goal.
