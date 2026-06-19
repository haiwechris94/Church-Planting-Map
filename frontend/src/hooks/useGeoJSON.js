import { useState, useEffect, useCallback } from 'react'

/**
 * Custom hook for loading GeoJSON data dynamically
 * @param {string} url - URL to fetch GeoJSON from
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, isLoading, error, refetch }
 */
export const useGeoJSON = (url, options = {}) => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const {
    enabled = true,
    onSuccess,
    onError,
    transform, // Optional function to transform the data
  } = options

  const fetchData = useCallback(async () => {
    if (!enabled || !url) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json = await response.json()
      
      // Apply transformation if provided
      const transformedData = transform ? transform(json) : json
      
      setData(transformedData)
      onSuccess?.(transformedData)
    } catch (err) {
      console.error('Error loading GeoJSON:', err)
      setError(err)
      onError?.(err)
    } finally {
      setIsLoading(false)
    }
  }, [url, enabled, transform, onSuccess, onError])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

/**
 * Transform GeoJSON features to a simpler format for the app
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Array} - Array of village objects
 */
export const transformGeoJSONToVillages = (geojson) => {
  if (!geojson || !geojson.features) return []

  return geojson.features
    .filter(feature => 
      feature.geometry && 
      feature.geometry.type === 'Point' &&
      feature.geometry.coordinates &&
      feature.geometry.coordinates.length >= 2
    )
    .map((feature, index) => ({
      id: feature.properties?.osm_id || `village-${index}`,
      _id: feature.properties?.osm_id || `village-${index}`,
      name: feature.properties?.name || 'Village sans nom',
      coordinates: feature.geometry.coordinates, // [lng, lat]
      location: {
        type: 'Point',
        coordinates: feature.geometry.coordinates,
      },
      // Map OSM properties to our app structure
      place: feature.properties?.place || 'village',
      status: 'unreached', // Default status for OSM villages
      population: null,
      region: null,
      country: 'Cameroun',
      // Keep original properties for reference
      properties: feature.properties,
      // Source identifier
      source: 'geojson',
    }))
}

/**
 * Get bounds from GeoJSON features
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @returns {Array} - [[minLat, minLng], [maxLat, maxLng]]
 */
export const getGeoJSONBounds = (geojson) => {
  if (!geojson || !geojson.features || geojson.features.length === 0) {
    return null
  }

  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  geojson.features.forEach(feature => {
    if (feature.geometry && feature.geometry.coordinates) {
      const [lng, lat] = feature.geometry.coordinates
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  })

  if (minLng === Infinity) return null

  return [[minLat, minLng], [maxLat, maxLng]]
}

/**
 * Filter GeoJSON features by bounding box
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {Object} bounds - { north, south, east, west }
 * @returns {Object} - Filtered GeoJSON
 */
export const filterByBounds = (geojson, bounds) => {
  if (!geojson || !bounds) return geojson

  const { north, south, east, west } = bounds

  return {
    ...geojson,
    features: geojson.features.filter(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return false
      const [lng, lat] = feature.geometry.coordinates
      return lat >= south && lat <= north && lng >= west && lng <= east
    })
  }
}

export default useGeoJSON
