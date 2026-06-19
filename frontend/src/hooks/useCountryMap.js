/**
 * useCountryMap Hook
 * 
 * Custom hook for integrating country selection with map components.
 * Provides automatic map recentering when country changes.
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

import { useEffect, useCallback, useRef } from 'react'
import { useCountry } from '../context/CountryContext'
import L from 'leaflet'

/**
 * Hook for country-aware map functionality
 * @param {Object} mapRef - Reference to the Leaflet map instance
 * @param {Object} options - Configuration options
 * @returns {Object} Country map utilities
 */
export const useCountryMap = (mapRef, options = {}) => {
  const {
    autoFit = true,
    fitPadding = [50, 50],
    animateFit = true,
    maxZoom = 12,
    onCountryChange = null,
  } = options
  
  const {
    selectedCountry,
    countryBounds,
    countryCenter,
    countryZoom,
    currentCountryConfig,
    isChanging,
  } = useCountry()
  
  const previousCountry = useRef(selectedCountry)
  
  // Fit map to country bounds
  const fitToCountry = useCallback(() => {
    if (!mapRef?.current || !countryBounds) return
    
    const map = mapRef.current
    
    try {
      const bounds = L.latLngBounds(countryBounds)
      map.fitBounds(bounds, {
        padding: fitPadding,
        animate: animateFit,
        maxZoom,
      })
    } catch (error) {
      console.error('Error fitting map to country bounds:', error)
      // Fallback to center
      if (countryCenter) {
        map.setView(countryCenter, countryZoom, { animate: animateFit })
      }
    }
  }, [mapRef, countryBounds, countryCenter, countryZoom, fitPadding, animateFit, maxZoom])
  
  // Center map on country
  const centerOnCountry = useCallback(() => {
    if (!mapRef?.current || !countryCenter) return
    
    const map = mapRef.current
    map.setView(countryCenter, countryZoom, { animate: animateFit })
  }, [mapRef, countryCenter, countryZoom, animateFit])
  
  // Get Leaflet bounds object
  const getLeafletBounds = useCallback(() => {
    if (!countryBounds) return null
    return L.latLngBounds(countryBounds)
  }, [countryBounds])
  
  // Check if a point is within country bounds
  const isWithinCountry = useCallback((lat, lng) => {
    if (!countryBounds) return true // Allow if no bounds
    
    const bounds = L.latLngBounds(countryBounds)
    return bounds.contains([lat, lng])
  }, [countryBounds])
  
  // Auto-fit when country changes
  useEffect(() => {
    if (!autoFit || !mapRef?.current) return
    
    // Only fit if country actually changed
    if (previousCountry.current !== selectedCountry) {
      previousCountry.current = selectedCountry
      
      // Small delay to ensure map is ready
      setTimeout(() => {
        fitToCountry()
        
        // Call custom callback if provided
        if (onCountryChange) {
          onCountryChange(selectedCountry, currentCountryConfig)
        }
      }, 100)
    }
  }, [selectedCountry, autoFit, fitToCountry, onCountryChange, currentCountryConfig])
  
  return {
    // Country data
    selectedCountry,
    countryBounds,
    countryCenter,
    countryZoom,
    currentCountryConfig,
    isChanging,
    
    // Map utilities
    fitToCountry,
    centerOnCountry,
    getLeafletBounds,
    isWithinCountry,
  }
}

/**
 * Hook for filtering data by country
 * @param {string} endpoint - API endpoint to filter
 * @returns {Object} Filtered endpoint and country info
 */
export const useCountryFilter = (endpoint) => {
  const { selectedCountry, currentCountryConfig } = useCountry()
  
  // Build filtered endpoint URL
  const getFilteredEndpoint = useCallback((baseEndpoint = endpoint) => {
    if (!selectedCountry || !baseEndpoint) return baseEndpoint
    
    const separator = baseEndpoint.includes('?') ? '&' : '?'
    return `${baseEndpoint}${separator}country=${selectedCountry}`
  }, [selectedCountry, endpoint])
  
  // Get country name for database queries
  const getCountryDbName = useCallback(() => {
    return currentCountryConfig?.name || null
  }, [currentCountryConfig])
  
  return {
    selectedCountry,
    filteredEndpoint: getFilteredEndpoint(),
    getFilteredEndpoint,
    getCountryDbName,
    countryConfig: currentCountryConfig,
  }
}

export default useCountryMap
