/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_URL?: string;
  readonly VITE_STREAM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
