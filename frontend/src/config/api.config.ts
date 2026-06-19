/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints, timeouts, and error handling.
 * All API-related settings should be managed through this file.
 */

// =============================================================================
// Environment Variables
// =============================================================================

const getEnvVar = (key: string, defaultValue: string = ''): string => {
  return import.meta.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = import.meta.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = import.meta.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
};

// =============================================================================
// API Base Configuration
// =============================================================================

/**
 * Base URL for API requests
 * In development, uses Vite proxy (empty string)
 * In production, uses VITE_API_URL environment variable
 */
export const API_BASE_URL = import.meta.env.PROD 
  ? getEnvVar('VITE_API_URL', 'http://localhost:5000')
  : '';

/**
 * Full API URL (always includes the base URL)
 */
export const API_FULL_URL = getEnvVar('VITE_API_URL', 'http://localhost:5000');

// =============================================================================
// Timeout Configuration
// =============================================================================

export const timeoutConfig = {
  /** Default timeout for API requests (ms) */
  default: getEnvNumber('VITE_API_TIMEOUT', 30000),
  
  /** Short timeout for quick operations (ms) */
  short: 5000,
  
  /** Long timeout for heavy operations like file uploads (ms) */
  long: 60000,
  
  /** Extended timeout for Voronoi generation (ms) */
  voronoiGeneration: 120000,
};

// =============================================================================
// Retry Configuration
// =============================================================================

export const retryConfig = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  
  /** Base delay between retries (ms) */
  baseDelay: 1000,
  
  /** Maximum delay between retries (ms) */
  maxDelay: 10000,
  
  /** Multiplier for exponential backoff */
  backoffMultiplier: 2,
  
  /** HTTP status codes that should trigger a retry */
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

// =============================================================================
// API Endpoints
// =============================================================================

export const endpoints = {
  // Authentication
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    profile: '/api/auth/profile',
    refreshToken: '/api/auth/refresh',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
  
  // Villages
  villages: {
    base: '/api/villages',
    byId: (id: string) => `/api/villages/${id}`,
    nearby: '/api/villages/nearby',
    voronoi: '/api/villages/voronoi',
    search: '/api/villages/search',
    stats: '/api/villages/stats',
  },
  
  // Churches
  churches: {
    base: '/api/churches',
    byId: (id: string) => `/api/churches/${id}`,
    nearby: '/api/churches/nearby',
    stats: '/api/churches/stats',
  },
  
  // Activities
  activities: {
    base: '/api/activities',
    byId: (id: string) => `/api/activities/${id}`,
    recent: '/api/activities/recent',
  },
  
  // Voronoi
  voronoi: {
    base: '/api/voronoi',
    diagrams: '/api/voronoi/diagrams',
    diagramById: (id: string) => `/api/voronoi/diagrams/${id}`,
    generate: '/api/voronoi/generate',
    data: '/api/voronoi/data',
    cells: '/api/voronoi/cells',
    cellById: (diagramId: string, cellId: string) => 
      `/api/voronoi/diagrams/${diagramId}/cells/${cellId}`,
    statistics: '/api/voronoi/statistics',
    regionalStats: (diagramId: string) => 
      `/api/voronoi/diagrams/${diagramId}/statistics/regional`,
    gaps: '/api/voronoi/gaps',
    gapRecommendations: (gapId: string) => 
      `/api/voronoi/gaps/${gapId}/recommendations`,
    adminBoundaries: '/api/voronoi/admin-boundaries',
    export: '/api/voronoi/export',
    health: '/api/voronoi/health',
  },
  
  // Statistics
  stats: {
    dashboard: '/api/stats/dashboard',
    villages: '/api/stats/villages',
    churches: '/api/stats/churches',
    activities: '/api/stats/activities',
  },
  
  // Health
  health: {
    check: '/api/health',
    ready: '/api/health/ready',
  },
};

// =============================================================================
// Error Handling Configuration
// =============================================================================

export const errorConfig = {
  /** Whether to log errors to console */
  logErrors: import.meta.env.DEV,
  
  /** Whether to show error notifications to users */
  showNotifications: true,
  
  /** Default error messages by status code */
  defaultMessages: {
    400: 'Requête invalide. Veuillez vérifier vos données.',
    401: 'Session expirée. Veuillez vous reconnecter.',
    403: 'Accès non autorisé.',
    404: 'Ressource non trouvée.',
    408: 'La requête a expiré. Veuillez réessayer.',
    429: 'Trop de requêtes. Veuillez patienter.',
    500: 'Erreur serveur. Veuillez réessayer plus tard.',
    502: 'Service temporairement indisponible.',
    503: 'Service en maintenance.',
    504: 'Le serveur ne répond pas.',
    default: 'Une erreur inattendue s\'est produite.',
    network: 'Erreur de connexion. Vérifiez votre connexion internet.',
    timeout: 'La requête a pris trop de temps. Veuillez réessayer.',
  } as Record<number | string, string>,
  
  /** Status codes that should trigger automatic logout */
  logoutStatuses: [401],
  
  /** Paths that should not trigger automatic logout on 401 */
  excludeLogoutPaths: ['/api/auth/login', '/api/auth/register', '/api/auth/me'],
};

// =============================================================================
// Feature Flags
// =============================================================================

export const featureFlags = {
  /** Enable Voronoi visualization */
  voronoi: getEnvBoolean('VITE_ENABLE_VORONOI', true),
  
  /** Enable coverage gaps analysis */
  coverageGaps: getEnvBoolean('VITE_ENABLE_COVERAGE_GAPS', true),
  
  /** Enable statistics panel */
  statistics: getEnvBoolean('VITE_ENABLE_STATISTICS', true),
};

// =============================================================================
// Combined API Configuration Export
// =============================================================================

export const apiConfig = {
  baseUrl: API_BASE_URL,
  fullUrl: API_FULL_URL,
  timeout: timeoutConfig.default,
  endpoints,
  retry: retryConfig,
  errors: errorConfig,
  features: featureFlags,
};

export default apiConfig;
