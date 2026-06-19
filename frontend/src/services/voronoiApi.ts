/**
 * API client for Voronoi diagram endpoints
 * 
 * This service provides functions to interact with the backend
 * Voronoi API endpoints with proper error handling and type safety.
 */

import { apiConfig, timeoutConfig, endpoints } from '@/config/api.config';
import { voronoiClient } from '@/services/api.client';
import {
  VoronoiDiagram,
  VoronoiGeoJSON,
  VoronoiStatistics,
  VoronoiQueryParams,
  VoronoiGenerateParams,
  VoronoiApiResponse,
  PaginatedResponse,
  CoverageGap,
  GapSeverity,
} from '@/types/voronoi.types';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = apiConfig.baseUrl;
const VORONOI_ENDPOINT = `${BASE_URL}${endpoints.voronoi.base}`;
const DEFAULT_TIMEOUT = timeoutConfig.default;

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('[VoronoiAPI] Configuration:', {
    baseUrl: BASE_URL,
    voronoiEndpoint: VORONOI_ENDPOINT,
    timeout: DEFAULT_TIMEOUT,
  });
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for API errors
 */
export class VoronoiApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'VoronoiApiError';
  }
}

/**
 * Handle API response and extract data or throw error
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: { code?: string; message?: string; details?: unknown } = {};
    
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    throw new VoronoiApiError(
      errorData.message || `HTTP Error: ${response.status} ${response.statusText}`,
      errorData.code || 'HTTP_ERROR',
      response.status,
      errorData.details
    );
  }

  const data = await response.json();
  
  // Handle wrapped API responses
  if ('success' in data) {
    if (!data.success) {
      throw new VoronoiApiError(
        data.error?.message || 'Unknown API error',
        data.error?.code || 'API_ERROR',
        response.status,
        data.error?.details
      );
    }
    return data.data as T;
  }

  return data as T;
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Create fetch options with timeout
 */
function createFetchOptions(
  method: string,
  body?: unknown,
  timeout: number = DEFAULT_TIMEOUT
): RequestInit & { signal: AbortSignal } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const options: RequestInit & { signal: AbortSignal } = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    signal: controller.signal,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // Clear timeout when request completes
  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));

  return options;
}

// ============================================================================
// Diagram Management
// ============================================================================

/**
 * Fetch all available Voronoi diagrams
 */
export async function fetchVoronoiDiagrams(): Promise<VoronoiDiagram[]> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/diagrams`,
      createFetchOptions('GET')
    );
    return handleResponse<VoronoiDiagram[]>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch Voronoi diagrams',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Fetch a specific Voronoi diagram by ID
 */
export async function fetchVoronoiDiagram(
  diagramId: string
): Promise<VoronoiDiagram> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/diagrams/${diagramId}`,
      createFetchOptions('GET')
    );
    return handleResponse<VoronoiDiagram>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      `Failed to fetch Voronoi diagram: ${diagramId}`,
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Generate a new Voronoi diagram
 */
export async function generateVoronoiDiagram(
  params: VoronoiGenerateParams
): Promise<VoronoiDiagram> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/generate`,
      createFetchOptions('POST', params, 60000) // Longer timeout for generation
    );
    return handleResponse<VoronoiDiagram>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to generate Voronoi diagram',
      'GENERATE_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Delete a Voronoi diagram
 */
export async function deleteVoronoiDiagram(diagramId: string): Promise<void> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/diagrams/${diagramId}`,
      createFetchOptions('DELETE')
    );
    await handleResponse<void>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      `Failed to delete Voronoi diagram: ${diagramId}`,
      'DELETE_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Voronoi Data
// ============================================================================

/**
 * Fetch Voronoi GeoJSON data with optional filters
 */
export async function fetchVoronoiData(
  params: VoronoiQueryParams = {}
): Promise<VoronoiGeoJSON> {
  try {
    const queryString = buildQueryString(params);
    const response = await fetch(
      `${VORONOI_ENDPOINT}/data${queryString}`,
      createFetchOptions('GET')
    );
    return handleResponse<VoronoiGeoJSON>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch Voronoi data',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Fetch Voronoi cells with pagination
 */
export async function fetchVoronoiCells(
  params: VoronoiQueryParams & { page?: number; limit?: number }
): Promise<PaginatedResponse<VoronoiGeoJSON['features'][0]>> {
  try {
    const queryString = buildQueryString(params);
    const response = await fetch(
      `${VORONOI_ENDPOINT}/cells${queryString}`,
      createFetchOptions('GET')
    );
    return handleResponse<PaginatedResponse<VoronoiGeoJSON['features'][0]>>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch Voronoi cells',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Fetch a specific Voronoi cell by ID
 */
export async function fetchVoronoiCell(
  diagramId: string,
  cellId: string
): Promise<VoronoiGeoJSON['features'][0]> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/diagrams/${diagramId}/cells/${cellId}`,
      createFetchOptions('GET')
    );
    return handleResponse<VoronoiGeoJSON['features'][0]>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      `Failed to fetch Voronoi cell: ${cellId}`,
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Fetch Voronoi statistics
 */
export async function fetchVoronoiStatistics(
  params: VoronoiQueryParams = {}
): Promise<VoronoiStatistics> {
  try {
    const queryString = buildQueryString(params);
    const response = await fetch(
      `${VORONOI_ENDPOINT}/statistics${queryString}`,
      createFetchOptions('GET')
    );
    return handleResponse<VoronoiStatistics>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch Voronoi statistics',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Fetch regional statistics
 */
export async function fetchRegionalStatistics(
  diagramId: string,
  adminLevel: 'level1' | 'level2' | 'level3' = 'level1'
): Promise<{ regionName: string; statistics: VoronoiStatistics }[]> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/diagrams/${diagramId}/statistics/regional?level=${adminLevel}`,
      createFetchOptions('GET')
    );
    return handleResponse<{ regionName: string; statistics: VoronoiStatistics }[]>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch regional statistics',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Coverage Gaps
// ============================================================================

/**
 * Fetch coverage gaps
 */
export async function fetchCoverageGaps(
  params: {
    diagramId?: string;
    minArea?: number;
    severity?: GapSeverity[];
    adminLevel1?: string;
    adminLevel2?: string;
    adminLevel3?: string;
  } = {}
): Promise<CoverageGap[]> {
  try {
    const queryString = buildQueryString(params);
    const response = await fetch(
      `${VORONOI_ENDPOINT}/gaps${queryString}`,
      createFetchOptions('GET')
    );
    return handleResponse<CoverageGap[]>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch coverage gaps',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Fetch gap recommendations
 */
export async function fetchGapRecommendations(
  gapId: string
): Promise<{
  gap: CoverageGap;
  recommendations: {
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
  }[];
}> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/gaps/${gapId}/recommendations`,
      createFetchOptions('GET')
    );
    return handleResponse<{
      gap: CoverageGap;
      recommendations: {
        type: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        estimatedImpact: string;
      }[];
    }>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      `Failed to fetch gap recommendations: ${gapId}`,
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Administrative Boundaries
// ============================================================================

/**
 * Fetch available administrative boundaries for filtering
 */
export async function fetchAdminBoundaries(
  level: 'level1' | 'level2' | 'level3',
  parentId?: string
): Promise<{ id: string; name: string; parentId?: string }[]> {
  try {
    const params: Record<string, string> = { level };
    if (parentId) params.parentId = parentId;
    
    const queryString = buildQueryString(params);
    const response = await fetch(
      `${VORONOI_ENDPOINT}/admin-boundaries${queryString}`,
      createFetchOptions('GET')
    );
    return handleResponse<{ id: string; name: string; parentId?: string }[]>(response);
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to fetch administrative boundaries',
      'FETCH_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export Voronoi data as GeoJSON file
 */
export async function exportVoronoiGeoJSON(
  params: VoronoiQueryParams = {}
): Promise<Blob> {
  try {
    const queryString = buildQueryString({ ...params, format: 'geojson' });
    const response = await fetch(
      `${VORONOI_ENDPOINT}/export${queryString}`,
      createFetchOptions('GET')
    );

    if (!response.ok) {
      throw new VoronoiApiError(
        'Failed to export Voronoi data',
        'EXPORT_ERROR',
        response.status
      );
    }

    return response.blob();
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to export Voronoi data',
      'EXPORT_ERROR',
      undefined,
      error
    );
  }
}

/**
 * Export statistics as CSV
 */
export async function exportStatisticsCSV(
  params: VoronoiQueryParams = {}
): Promise<Blob> {
  try {
    const queryString = buildQueryString({ ...params, format: 'csv' });
    const response = await fetch(
      `${VORONOI_ENDPOINT}/statistics/export${queryString}`,
      createFetchOptions('GET')
    );

    if (!response.ok) {
      throw new VoronoiApiError(
        'Failed to export statistics',
        'EXPORT_ERROR',
        response.status
      );
    }

    return response.blob();
  } catch (error) {
    if (error instanceof VoronoiApiError) throw error;
    throw new VoronoiApiError(
      'Failed to export statistics',
      'EXPORT_ERROR',
      undefined,
      error
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check API health
 */
export async function checkApiHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(
      `${VORONOI_ENDPOINT}/health`,
      createFetchOptions('GET', undefined, 5000)
    );
    return handleResponse<{
      status: 'healthy' | 'degraded' | 'unhealthy';
      version: string;
      timestamp: string;
    }>(response);
  } catch (error) {
    return {
      status: 'unhealthy',
      version: 'unknown',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Cancel all pending requests (useful for cleanup)
 */
const pendingControllers: AbortController[] = [];

export function cancelAllRequests(): void {
  pendingControllers.forEach((controller) => controller.abort());
  pendingControllers.length = 0;
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Diagrams
  fetchVoronoiDiagrams,
  fetchVoronoiDiagram,
  generateVoronoiDiagram,
  deleteVoronoiDiagram,
  
  // Data
  fetchVoronoiData,
  fetchVoronoiCells,
  fetchVoronoiCell,
  
  // Statistics
  fetchVoronoiStatistics,
  fetchRegionalStatistics,
  
  // Gaps
  fetchCoverageGaps,
  fetchGapRecommendations,
  
  // Admin
  fetchAdminBoundaries,
  
  // Export
  exportVoronoiGeoJSON,
  exportStatisticsCSV,
  
  // Utility
  checkApiHealth,
  cancelAllRequests,
};
