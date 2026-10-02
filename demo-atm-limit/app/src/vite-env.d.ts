/// <reference types="vite/client" />

// VITE_BUILD is not a .env value — vite.config.ts's `define` bakes it in
// directly from `git rev-parse --short HEAD` at build time (falls back to
// "dev"). Declared here so `import.meta.env.VITE_BUILD` type-checks.
interface ImportMetaEnv {
  readonly VITE_BUILD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
