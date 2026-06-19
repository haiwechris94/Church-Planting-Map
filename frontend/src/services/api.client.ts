/**
 * API Client
 * 
 * Centralized axios instance with interceptors for authentication,
 * error handling, request/response logging, and retry logic.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { apiConfig, timeoutConfig, retryConfig, errorConfig } from '@/config/api.config';

// =============================================================================
// Types
// =============================================================================

interface RetryConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retryDelay?: number;
}

interface ApiErrorResponse {
  message?: string;
  code?: string;
  details?: unknown;
  error?: {
    message?: string;
    code?: string;
  };
}

// =============================================================================
// Create Axios Instance
// =============================================================================

/**
 * Main API client instance
 * Uses empty baseURL in development to leverage Vite proxy
 * Uses full URL in production
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: timeoutConfig.default,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Remove authentication token and redirect to login
 */
const handleLogout = (): void => {
  localStorage.removeItem('token');
  // Small delay to allow pending operations to complete
  setTimeout(() => {
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }, 100);
};

/**
 * Calculate retry delay with exponential backoff
 */
const calculateRetryDelay = (retryCount: number): number => {
  const delay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, retryCount);
  return Math.min(delay, retryConfig.maxDelay);
};

/**
 * Check if request should be retried
 */
const shouldRetry = (error: AxiosError, config: RetryConfig): boolean => {
  const retryCount = config._retryCount || 0;
  
  if (retryCount >= retryConfig.maxRetries) {
    return false;
  }
  
  // Retry on network errors
  if (!error.response) {
    return true;
  }
  
  // Retry on specific status codes
  return retryConfig.retryableStatuses.includes(error.response.status);
};

/**
 * Get user-friendly error message
 */
const getErrorMessage = (error: AxiosError<ApiErrorResponse>): string => {
  // Check for custom error message from API
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  // Check for network error
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return errorConfig.defaultMessages.timeout;
    }
    return errorConfig.defaultMessages.network;
  }
  
  // Get default message by status code
  const status = error.response.status;
  return errorConfig.defaultMessages[status] || errorConfig.defaultMessages.default;
};

/**
 * Log error for debugging
 */
const logError = (error: AxiosError, context: string): void => {
  if (errorConfig.logErrors) {
    console.error(`[API Error - ${context}]`, {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });
  }
};

// =============================================================================
// Request Interceptor
// =============================================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add authentication token
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error: AxiosError): Promise<never> => {
    logError(error, 'Request');
    return Promise.reject(error);
  }
);

// =============================================================================
// Response Interceptor
// =============================================================================

apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>): Promise<never> => {
    const config = error.config as RetryConfig;
    
    // Log error
    logError(error, 'Response');
    
    // Handle retry logic
    if (config && shouldRetry(error, config)) {
      config._retryCount = (config._retryCount || 0) + 1;
      config._retryDelay = calculateRetryDelay(config._retryCount);
      
      if (import.meta.env.DEV) {
        console.log(`[API Retry] Attempt ${config._retryCount}/${retryConfig.maxRetries} after ${config._retryDelay}ms`);
      }
      
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, config._retryDelay));
      
      return apiClient(config);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      const isExcludedPath = errorConfig.excludeLogoutPaths.some(
        (path) => config?.url?.includes(path)
      );
      
      if (!isExcludedPath) {
        handleLogout();
      }
    }
    
    // Enhance error with user-friendly message
    const enhancedError = error as AxiosError<ApiErrorResponse> & { userMessage: string };
    enhancedError.userMessage = getErrorMessage(error);
    
    return Promise.reject(enhancedError);
  }
);

// =============================================================================
// Specialized API Clients
// =============================================================================

/**
 * API client for long-running operations (file uploads, Voronoi generation)
 */
export const longRunningClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: timeoutConfig.long,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Apply same interceptors to long-running client
longRunningClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

longRunningClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<ApiErrorResponse>): Promise<never> => {
    logError(error, 'Long Running');
    const enhancedError = error as AxiosError<ApiErrorResponse> & { userMessage: string };
    enhancedError.userMessage = getErrorMessage(error);
    return Promise.reject(enhancedError);
  }
);

/**
 * API client for Voronoi operations with extended timeout
 */
export const voronoiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: timeoutConfig.voronoiGeneration,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Apply same interceptors to voronoi client
voronoiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

voronoiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error: AxiosError<ApiErrorResponse>): Promise<never> => {
    logError(error, 'Voronoi');
    const enhancedError = error as AxiosError<ApiErrorResponse> & { userMessage: string };
    enhancedError.userMessage = getErrorMessage(error);
    return Promise.reject(enhancedError);
  }
);

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a custom API client with specific configuration
 */
export const createApiClient = (config: AxiosRequestConfig): AxiosInstance => {
  const client = axios.create({
    baseURL: apiConfig.baseUrl,
    timeout: timeoutConfig.default,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...config,
  });
  
  // Apply authentication interceptor
  client.interceptors.request.use(
    (reqConfig: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const token = getAuthToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    }
  );
  
  return client;
};

/**
 * Check if API is reachable
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

// =============================================================================
// Default Export
// =============================================================================

export default apiClient;
