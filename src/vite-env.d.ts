/// <reference types="vite/client" />

// Without this reference `import.meta.env` is untyped, which is why the
// codebase reached for `(import.meta as any).env?.…` in several places. The
// cast form also defeats Vite's build-time substitution of `import.meta.env.DEV`,
// so a development-only branch written that way ships to production and is
// merely never executed, rather than being removed from the bundle.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
