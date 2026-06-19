/**
 * Custom hook for managing Voronoi diagram data and state
 * 
 * This hook provides a complete interface for fetching, filtering,
 * and managing Voronoi diagram data with caching and error handling.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  VoronoiDiagram,
  VoronoiGeoJSON,
  VoronoiStatistics,
  VoronoiQueryParams,
  VoronoiGenerateParams,
  CoverageGap,
  UseVoronoiReturn,
} from '@/types/voronoi.types';
import {
  fetchVoronoiDiagrams,
  fetchVoronoiDiagram,
  fetchVoronoiData,
  fetchVoronoiStatistics,
  fetchCoverageGaps,
  generateVoronoiDiagram,
  deleteVoronoiDiagram,
  VoronoiApiError,
} from '@/services/voronoiApi';

// ============================================================================
// Cache Configuration
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 20;

class VoronoiCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  set<T>(key: string, data: T): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      key,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

const voronoiCache = new VoronoiCache();

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FILTERS: VoronoiQueryParams = {
  diagramId: undefined,
  adminLevel1: undefined,
  adminLevel2: undefined,
  adminLevel3: undefined,
  minArea: undefined,
  maxArea: undefined,
  includeGapsOnly: false,
  severity: undefined,
  limit: undefined,
  offset: undefined,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVoronoi(initialDiagramId?: string): UseVoronoiReturn {
  // State
  const [diagrams, setDiagrams] = useState<VoronoiDiagram[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<VoronoiDiagram | null>(null);
  const [voronoiData, setVoronoiData] = useState<VoronoiGeoJSON | null>(null);
  const [statistics, setStatistics] = useState<VoronoiStatistics | null>(null);
  const [gaps, setGaps] = useState<CoverageGap[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<VoronoiQueryParams>(DEFAULT_FILTERS);

  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Generate cache key from filters
   */
  const getCacheKey = useCallback((type: string, params: VoronoiQueryParams): string => {
    return `${type}:${JSON.stringify(params)}`;
  }, []);

  /**
   * Handle API errors
   */
  const handleError = useCallback((err: unknown, context: string): void => {
    if (!mountedRef.current) return;

    let message = `Error ${context}`;
    
    if (err instanceof VoronoiApiError) {
      message = err.message;
    } else if (err instanceof Error) {
      message = err.message;
    }

    setError(message);
    console.error(`[useVoronoi] ${context}:`, err);
  }, []);

  // ============================================================================
  // Data Fetching Functions
  // ============================================================================

  /**
   * Fetch all available diagrams
   */
  const fetchDiagrams = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cacheKey = 'diagrams:all';
      const cached = voronoiCache.get<VoronoiDiagram[]>(cacheKey);
      
      if (cached) {
        setDiagrams(cached);
        setIsLoading(false);
        return;
      }

      const data = await fetchVoronoiDiagrams();
      
      if (mountedRef.current) {
        setDiagrams(data);
        voronoiCache.set(cacheKey, data);
      }
    } catch (err) {
      handleError(err, 'fetching diagrams');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [handleError]);

  /**
   * Select and load a specific diagram
   */
  const selectDiagram = useCallback(async (diagramId: string): Promise<void> => {
    if (!mountedRef.current) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const queryParams: VoronoiQueryParams = {
        ...filters,
        diagramId,
      };

      // Fetch diagram metadata
      const diagramCacheKey = `diagram:${diagramId}`;
      let diagram = voronoiCache.get<VoronoiDiagram>(diagramCacheKey);
      
      if (!diagram) {
        diagram = await fetchVoronoiDiagram(diagramId);
        voronoiCache.set(diagramCacheKey, diagram);
      }

      // Fetch Voronoi data
      const dataCacheKey = getCacheKey('data', queryParams);
      let data = voronoiCache.get<VoronoiGeoJSON>(dataCacheKey);
      
      if (!data) {
        data = await fetchVoronoiData(queryParams);
        voronoiCache.set(dataCacheKey, data);
      }

      // Fetch statistics
      const statsCacheKey = getCacheKey('stats', queryParams);
      let stats = voronoiCache.get<VoronoiStatistics>(statsCacheKey);
      
      if (!stats) {
        stats = await fetchVoronoiStatistics(queryParams);
        voronoiCache.set(statsCacheKey, stats);
      }

      // Fetch gaps
      const gapsCacheKey = getCacheKey('gaps', queryParams);
      let gapsData = voronoiCache.get<CoverageGap[]>(gapsCacheKey);
      
      if (!gapsData) {
        gapsData = await fetchCoverageGaps({ diagramId });
        voronoiCache.set(gapsCacheKey, gapsData);
      }

      if (mountedRef.current) {
        setCurrentDiagram(diagram);
        setVoronoiData(data);
        setStatistics(stats);
        setGaps(gapsData);
        setFiltersState((prev) => ({ ...prev, diagramId }));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      handleError(err, 'selecting diagram');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters, getCacheKey, handleError]);

  /**
   * Generate a new Voronoi diagram
   */
  const generateDiagram = useCallback(async (
    params: VoronoiGenerateParams
  ): Promise<VoronoiDiagram> => {
    setIsGenerating(true);
    setError(null);

    try {
      const newDiagram = await generateVoronoiDiagram(params);
      
      // Invalidate diagrams cache
      voronoiCache.invalidate('diagrams');
      
      if (mountedRef.current) {
        // Add to diagrams list
        setDiagrams((prev) => [...prev, newDiagram]);
        
        // Select the new diagram
        await selectDiagram(newDiagram.id);
      }

      return newDiagram;
    } catch (err) {
      handleError(err, 'generating diagram');
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsGenerating(false);
      }
    }
  }, [selectDiagram, handleError]);

  /**
   * Delete a Voronoi diagram
   */
  const deleteDiagram = useCallback(async (diagramId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteVoronoiDiagram(diagramId);
      
      // Invalidate caches
      voronoiCache.invalidate('diagrams');
      voronoiCache.invalidate(diagramId);

      if (mountedRef.current) {
        // Remove from diagrams list
        setDiagrams((prev) => prev.filter((d) => d.id !== diagramId));
        
        // Clear current if it was the deleted one
        if (currentDiagram?.id === diagramId) {
          setCurrentDiagram(null);
          setVoronoiData(null);
          setStatistics(null);
          setGaps([]);
        }
      }
    } catch (err) {
      handleError(err, 'deleting diagram');
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentDiagram, handleError]);

  /**
   * Refresh current data
   */
  const refreshData = useCallback(async (): Promise<void> => {
    if (!currentDiagram) return;

    // Invalidate relevant caches
    voronoiCache.invalidate(currentDiagram.id);
    
    // Re-fetch data
    await selectDiagram(currentDiagram.id);
  }, [currentDiagram, selectDiagram]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ============================================================================
  // Filter Management
  // ============================================================================

  /**
   * Update filters and refetch data
   */
  const setFilters = useCallback((newFilters: Partial<VoronoiQueryParams>): void => {
    setFiltersState((prev) => {
      const updated = { ...prev, ...newFilters };
      
      // Trigger data refetch if we have a current diagram
      if (updated.diagramId) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          selectDiagram(updated.diagramId!);
        }, 0);
      }
      
      return updated;
    });
  }, [selectDiagram]);

  /**
   * Reset filters to defaults
   */
  const resetFilters = useCallback((): void => {
    setFiltersState((prev) => ({
      ...DEFAULT_FILTERS,
      diagramId: prev.diagramId, // Keep current diagram
    }));
    
    if (currentDiagram) {
      selectDiagram(currentDiagram.id);
    }
  }, [currentDiagram, selectDiagram]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    
    // Fetch diagrams on mount
    fetchDiagrams();

    // Load initial diagram if provided
    if (initialDiagramId) {
      selectDiagram(initialDiagramId);
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDiagrams, initialDiagramId, selectDiagram]);

  // ============================================================================
  // Memoized Return Value
  // ============================================================================

  return useMemo<UseVoronoiReturn>(() => ({
    // Data
    diagrams,
    currentDiagram,
    voronoiData,
    statistics,
    gaps,
    
    // State
    isLoading,
    isGenerating,
    error,
    
    // Actions
    fetchDiagrams,
    selectDiagram,
    generateDiagram,
    deleteDiagram,
    refreshData,
    clearError,
    
    // Filters
    filters,
    setFilters,
    resetFilters,
  }), [
    diagrams,
    currentDiagram,
    voronoiData,
    statistics,
    gaps,
    isLoading,
    isGenerating,
    error,
    fetchDiagrams,
    selectDiagram,
    generateDiagram,
    deleteDiagram,
    refreshData,
    clearError,
    filters,
    setFilters,
    resetFilters,
  ]);
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for managing selected Voronoi cell
 */
export function useVoronoiSelection() {
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);

  const selectCell = useCallback((cellId: string | null) => {
    setSelectedCellId(cellId);
  }, []);

  const hoverCell = useCallback((cellId: string | null) => {
    setHoveredCellId(cellId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCellId(null);
    setHoveredCellId(null);
  }, []);

  return {
    selectedCellId,
    hoveredCellId,
    selectCell,
    hoverCell,
    clearSelection,
  };
}

/**
 * Hook for managing gap visibility settings
 */
export function useGapSettings() {
  const [showGaps, setShowGaps] = useState(true);
  const [minGapArea, setMinGapArea] = useState(10); // km²
  const [severityFilter, setSeverityFilter] = useState<string[]>(['medium', 'high', 'critical']);

  const toggleGaps = useCallback(() => {
    setShowGaps((prev) => !prev);
  }, []);

  const updateMinArea = useCallback((area: number) => {
    setMinGapArea(Math.max(0, area));
  }, []);

  const toggleSeverity = useCallback((severity: string) => {
    setSeverityFilter((prev) => {
      if (prev.includes(severity)) {
        return prev.filter((s) => s !== severity);
      }
      return [...prev, severity];
    });
  }, []);

  return {
    showGaps,
    minGapArea,
    severityFilter,
    setShowGaps,
    toggleGaps,
    setMinGapArea: updateMinArea,
    setSeverityFilter,
    toggleSeverity,
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default useVoronoi;
