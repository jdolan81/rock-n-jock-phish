/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PHISH_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
