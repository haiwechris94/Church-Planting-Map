/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_ENABLE_VORONOI: string;
  readonly VITE_ENABLE_COVERAGE_GAPS: string;
  readonly VITE_ENABLE_STATISTICS: string;
  readonly VITE_MAP_DEFAULT_CENTER_LAT: string;
  readonly VITE_MAP_DEFAULT_CENTER_LNG: string;
  readonly VITE_MAP_DEFAULT_ZOOM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
