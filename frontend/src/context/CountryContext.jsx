/**
 * CountryContext - Global Country State Management
 * 
 * Provides global country selection state with:
 * - URL synchronization (?country=ISO_CODE)
 * - localStorage persistence
 * - Automatic map recentering via bbox
 * - Data reloading triggers
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { COUNTRY_CONFIG, DEFAULT_COUNTRY, getCountryConfig } from '../config/countryConfig'

const CountryContext = createContext(null)

// Storage key for localStorage
const STORAGE_KEY = 'selectedCountry'

/**
 * Hook to use the CountryContext
 */
export const useCountry = () => {
  const context = useContext(CountryContext)
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider')
  }
  return context
}

/**
 * CountryProvider Component
 * Manages global country selection state
 */
export const CountryProvider = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  // Get initial country from URL, localStorage, or default
  const getInitialCountry = () => {
    // 1. Check URL parameter first
    const urlCountry = searchParams.get('country')
    if (urlCountry && COUNTRY_CONFIG[urlCountry.toUpperCase()]) {
      return urlCountry.toUpperCase()
    }
    
    // 2. Check localStorage
    const storedCountry = localStorage.getItem(STORAGE_KEY)
    if (storedCountry && COUNTRY_CONFIG[storedCountry]) {
      return storedCountry
    }
    
    // 3. Return default
    return DEFAULT_COUNTRY
  }
  
  const [selectedCountry, setSelectedCountryState] = useState(getInitialCountry)
  const [isChanging, setIsChanging] = useState(false)
  
  // Fetch countries list from API
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/countries')
        return response.data.countries || []
      } catch (error) {
        console.error('Error fetching countries:', error)
        // Fallback to config
        return Object.values(COUNTRY_CONFIG).filter(c => c.region === 'Central Africa')
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
  
  // Get current country config
  const currentCountryConfig = useMemo(() => {
    return getCountryConfig(selectedCountry) || COUNTRY_CONFIG[DEFAULT_COUNTRY]
  }, [selectedCountry])
  
  // Get country bounds for map fitting
  const countryBounds = useMemo(() => {
    if (!currentCountryConfig?.bounds) return null
    return currentCountryConfig.bounds
  }, [currentCountryConfig])
  
  // Get country center for map centering
  const countryCenter = useMemo(() => {
    if (!currentCountryConfig?.center) return null
    return currentCountryConfig.center
  }, [currentCountryConfig])
  
  // Get country zoom level
  const countryZoom = useMemo(() => {
    return currentCountryConfig?.zoom || 6
  }, [currentCountryConfig])
  
  /**
   * Set selected country with URL sync and localStorage persistence
   */
  const setSelectedCountry = useCallback((countryCode) => {
    const upperCode = countryCode.toUpperCase()
    
    // Validate country code
    if (!COUNTRY_CONFIG[upperCode]) {
      console.warn(`Invalid country code: ${countryCode}`)
      return
    }
    
    setIsChanging(true)
    
    // Update state
    setSelectedCountryState(upperCode)
    
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, upperCode)
    
    // Update URL parameter
    const newParams = new URLSearchParams(searchParams)
    newParams.set('country', upperCode)
    setSearchParams(newParams, { replace: true })
    
    // Invalidate queries that depend on country
    queryClient.invalidateQueries({ queryKey: ['villages'] })
    queryClient.invalidateQueries({ queryKey: ['peopleGroups'] })
    queryClient.invalidateQueries({ queryKey: ['churches'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['adminPolygons'] })
    
    // Reset changing state after a short delay
    setTimeout(() => setIsChanging(false), 100)
  }, [searchParams, setSearchParams, queryClient])
  
  // Sync URL changes to state (e.g., browser back/forward)
  useEffect(() => {
    const urlCountry = searchParams.get('country')
    if (urlCountry && urlCountry.toUpperCase() !== selectedCountry) {
      const upperCode = urlCountry.toUpperCase()
      if (COUNTRY_CONFIG[upperCode]) {
        setSelectedCountryState(upperCode)
        localStorage.setItem(STORAGE_KEY, upperCode)
      }
    }
  }, [searchParams, selectedCountry])
  
  // Available countries list
  const countries = useMemo(() => {
    if (countriesData && countriesData.length > 0) {
      return countriesData
    }
    // Fallback to config
    return Object.values(COUNTRY_CONFIG)
      .filter(c => c.region === 'Central Africa')
      .map(c => ({
        code: c.code,
        code3: c.code3,
        name: c.name,
        nameEn: c.nameEn,
        center: c.center,
        zoom: c.zoom,
        bounds: c.bounds,
      }))
  }, [countriesData])
  
  const value = {
    // Current selection
    selectedCountry,
    setSelectedCountry,
    
    // Country data
    currentCountryConfig,
    countries,
    countriesLoading,
    
    // Map helpers
    countryBounds,
    countryCenter,
    countryZoom,
    
    // State
    isChanging,
    
    // Utility functions
    getCountryByCode: (code) => COUNTRY_CONFIG[code?.toUpperCase()],
    isValidCountry: (code) => !!COUNTRY_CONFIG[code?.toUpperCase()],
  }
  
  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  )
}

export default CountryContext
