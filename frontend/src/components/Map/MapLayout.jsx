/**
 * MapLayout - Layout wrapper for map pages
 * 
 * Provides:
 * - Full-height map container
 * - Mini-map integration
 * - Country-aware map centering
 * - Responsive design
 * 
 * @author Church Planting Map Team
 * @version 1.0.0
 */

import { useRef, useEffect, useState } from 'react'
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import { useCountry } from '../../context/CountryContext'
import MiniMap from './MiniMap'
import L from 'leaflet'

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

/**
 * MapLayout Component
 * @param {React.ReactNode} children - Map layers and controls
 * @param {boolean} showMiniMap - Show mini-map overlay (default: true)
 * @param {string} miniMapPosition - Mini-map position (default: 'bottom-right')
 * @param {Object} mapOptions - Additional MapContainer options
 * @param {Function} onMapReady - Callback when map is ready
 */
const MapLayout = ({ 
  children, 
  showMiniMap = true,
  miniMapPosition = 'bottom-right',
  mapOptions = {},
  onMapReady = null,
  className = '',
}) => {
  const { countryCenter, countryZoom, countryBounds, selectedCountry } = useCountry()
  const mapRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)
  
  // Default map center (Cameroon)
  const defaultCenter = countryCenter || [7.3697, 12.3547]
  const defaultZoom = countryZoom || 6
  
  // Fit map to country bounds when country changes
  useEffect(() => {
    if (!mapRef.current || !countryBounds) return
    
    const map = mapRef.current
    
    try {
      const bounds = L.latLngBounds(countryBounds)
      map.fitBounds(bounds, {
        padding: [50, 50],
        animate: true,
        maxZoom: 10,
      })
    } catch (error) {
      console.error('Error fitting to country bounds:', error)
      if (countryCenter) {
        map.setView(countryCenter, countryZoom, { animate: true })
      }
    }
  }, [selectedCountry, countryBounds, countryCenter, countryZoom])
  
  // Handle map ready
  const handleMapCreated = (map) => {
    mapRef.current = map
    setMapReady(true)
    
    if (onMapReady) {
      onMapReady(map)
    }
  }
  
  return (
    <div className={`relative w-full h-[calc(100vh-8rem)] rounded-xl overflow-hidden shadow-lg ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={false}
        ref={handleMapCreated}
        {...mapOptions}
      >
        {/* Base tile layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Zoom control in top-left */}
        <ZoomControl position="topleft" />
        
        {/* Map children (layers, markers, etc.) */}
        {children}
      </MapContainer>
      
      {/* Mini-map overlay */}
      {showMiniMap && mapReady && (
        <MiniMap
          mainMapRef={mapRef}
          position={miniMapPosition}
          width={200}
          height={150}
          collapsible={true}
        />
      )}
    </div>
  )
}

export default MapLayout
