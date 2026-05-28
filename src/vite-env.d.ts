/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YELP_API_KEY: string;
  readonly VITE_SEARCH_RADIUS_MILES: string;
  readonly VITE_MAX_RESULTS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
