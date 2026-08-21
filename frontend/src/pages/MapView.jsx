import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker, Polyline } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import TileLayerSwitcher, { ModernTileLayer } from '../components/Map/TileLayerSwitcher'
import ModernLegend from '../components/Map/ModernLegend'
import StatsBadge from '../components/Map/StatsBadge'
import FilterPanel from '../components/Map/FilterPanel'
import ModernPopup from '../components/Map/ModernPopup'
import MapControls from '../components/Map/MapControls'
import MapLoadingSkeleton from '../components/Map/MapLoadingSkeleton'
import { createModernMarker, createClusterIcon, STATUS_PALETTE } from '../components/Map/ModernMarker'
import '../components/Map/modern-map.css'
import { peopleGroupsApi } from '../services/api'
import { Plus, Filter, Search, X, Users, MapPin, Navigation, ChevronLeft, ChevronRight, Maximize2, Loader2, AlertCircle, Map as MapIcon, Church, Layers, Trash2, ExternalLink, ChevronDown, Globe, RefreshCw, Compass, BarChart2, Eye, CheckCircle } from 'lucide-react'
import VillageStatusLayer, { VillageStatusStats } from '../components/Map/VillageStatusLayer'
import { useGeoJSON } from '../hooks/useGeoJSON'
import { SUPPORTED_COUNTRIES, getCountryConfig, DEFAULT_COUNTRY } from '../config/supportedCountries'
import toast from 'react-hot-toast'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../context/AuthContext'
import CountryMultiSelect from '../components/CountryMultiSelect'
import { CAMEROON_CENTER, CAMEROON_ZOOM, AVAILABLE_COUNTRIES, VORONOI_ZOOM_CONFIG, getVoronoiLevelForZoom } from '../config/countryConfig'
import { initSocket, subscribeToPeopleGroupUpdates } from '../services/socket'
import { createPortal } from 'react-dom'

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Create custom marker icons for different engagement statuses
// sourceType: 'dmm' (teardrop), 'survey' (square), 'joshuaProject' (diamond)
const createCustomIcon = (color, sourceType = 'dmm') => {
  if (sourceType === 'joshuaProject') {
    // Joshua Project markers: diamond shape with dashed border - reduced size by 50% (9x9)
    return L.divIcon({
      className: 'custom-marker jp-marker',
      html: `<div style="position: relative;">
        <div style="background-color: ${color}; width: 9px; height: 9px; transform: rotate(45deg); border: 1px dashed white; box-shadow: 0 1px 3px rgba(0,0,0,0.4); position: relative;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); color: white; font-size: 4px; font-weight: bold;">JP</div>
        </div>
      </div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 10],
      popupAnchor: [0, -10],
    })
  }
  if (sourceType === 'survey') {
    // Survey markers: square/rectangle shape with solid border
    return L.divIcon({
      className: 'custom-marker survey-marker',
      html: `<div style="background-color: ${color}; width: 9px; height: 9px; border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4); border-radius: 2px;"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 10],
      popupAnchor: [0, -10],
    })
  }
  if (sourceType === 'imb') {
    // IMB / PeopleGroups.org markers: circle, emerald
    return L.divIcon({
      className: 'custom-marker imb-marker',
      html: `<div style="background-color: ${color}; width: 9px; height: 9px; border-radius: 50%; border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 10],
      popupAnchor: [0, -10],
    })
  }
  if (sourceType === 'ftt') {
    // Finishing the Task markers: rotated square, violet
    return L.divIcon({
      className: 'custom-marker ftt-marker',
      html: `<div style="background-color: ${color}; width: 9px; height: 9px; transform: rotate(45deg); border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.4);"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 10],
      popupAnchor: [0, -10],
    })
  }
  // DMM data markers: teardrop shape - reduced size by 50% (10x10)
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 1px solid white; box-shadow: 0 1px 2px rgba(0,0,0,0.3);"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 10],
    popupAnchor: [0, -10],
  })
}

// Engagement status colors for marker icons - NEW COLOR SYSTEM
const engagementStatusColorValues = {
  unreached: '#ef4444',        // Red
  pioneer: '#f97316',          // Orange
  midway: '#eab308',           // Yellow
  'tipping-point': '#22c55e',  // Light Green
  dmm: '#15803d',              // Dark Green
}

// Engagement status icons (DMM statuses) - DMM data markers - NEW COLOR SYSTEM
const engagementStatusIcons = {
  unreached: createCustomIcon('#ef4444', 'dmm'),        // Red
  pioneer: createCustomIcon('#f97316', 'dmm'),          // Orange
  midway: createCustomIcon('#eab308', 'dmm'),           // Yellow
  'tipping-point': createCustomIcon('#22c55e', 'dmm'),  // Light Green
  dmm: createCustomIcon('#15803d', 'dmm'),              // Dark Green
}

// Survey engagement status icons - square shape - NEW COLOR SYSTEM
const surveyEngagementStatusIcons = {
  unreached: createCustomIcon('#ef4444', 'survey'),        // Red
  pioneer: createCustomIcon('#f97316', 'survey'),          // Orange
  midway: createCustomIcon('#eab308', 'survey'),           // Yellow
  'tipping-point': createCustomIcon('#22c55e', 'survey'),  // Light Green
  dmm: createCustomIcon('#15803d', 'survey'),              // Dark Green
}

// Joshua Project engagement status icons - distinct diamond shape - NEW COLOR SYSTEM
const jpEngagementStatusIcons = {
  unreached: createCustomIcon('#ef4444', 'joshuaProject'),        // Red
  pioneer: createCustomIcon('#f97316', 'joshuaProject'),          // Orange
  midway: createCustomIcon('#eab308', 'joshuaProject'),           // Yellow
  'tipping-point': createCustomIcon('#22c55e', 'joshuaProject'),  // Light Green
  dmm: createCustomIcon('#15803d', 'joshuaProject'),              // Dark Green
}

// Helper function to get the appropriate icon based on source
const getMarkerIcon = (engagementStatus, source, mapMode = 'terrain', population = 0) => {
  if (source === 'Joshua Project') {
    if (mapMode === 'strategic') {
      const color = engagementStatusColorValues[engagementStatus] || '#ef4444'
      const minSize = 12, maxSize = 42
      const logPop = population > 0 ? Math.log10(Math.max(population, 100)) : 2
      const size = Math.round(Math.min(maxSize, Math.max(minSize, logPop * 7)))
      return L.divIcon({
        className: 'custom-marker jp-strategic-marker',
        html: `<div style="background-color:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);opacity:0.85;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 2)],
      })
    }
    return jpEngagementStatusIcons[engagementStatus] || jpEngagementStatusIcons.pioneer
  }
  if (source === 'PeopleGroups.org') {
    return createCustomIcon('#10b981', 'imb')
  }
  if (source === 'Finishing the Task') {
    return createCustomIcon('#8b5cf6', 'ftt')
  }
  if (source === 'Survey') {
    return surveyEngagementStatusIcons[engagementStatus] || surveyEngagementStatusIcons.pioneer
  }
  return engagementStatusIcons[engagementStatus] || engagementStatusIcons.pioneer
}

// Engagement status keys for i18n
const engagementStatusKeys = {
  unreached: 'peopleMap.status.unreached',
  pioneer: 'peopleMap.status.pioneer',
  midway: 'peopleMap.status.midway',
  'tipping-point': 'peopleMap.status.tippingPoint',
  dmm: 'peopleMap.status.dmm',
}

// Engagement status colors for badges - NEW COLOR SYSTEM
const engagementStatusColors = {
  unreached: 'bg-red-500',
  pioneer: 'bg-orange-500',
  midway: 'bg-yellow-500',
  'tipping-point': 'bg-emerald-500',
  dmm: 'bg-green-700',
}

// Engagement status labels for display
const engagementStatusLabels = {
  unreached: 'Unreached',
  pioneer: 'Pioneer',
  midway: 'Midway',
  'tipping-point': 'Tipping Point',
  dmm: 'DMM (Reached)',
}

// French status labels for display
const engagementStatusLabelsFr = {
  unreached: 'NON ATTEINT',
  pioneer: 'PIONNIER',
  midway: 'MI-PARCOURS',
  'tipping-point': 'POINT DE BASCULEMENT',
  dmm: 'DMM (Atteint)',
}

// Engagement level options
const engagementLevelOptions = ['I', 'II', 'III', 'IV']

// DMM Status Calculator - mirrors backend logic
const calculateDmmStatus = (churches, generations) => {
  const numChurches = parseInt(churches) || 0
  const numGenerations = parseInt(generations) || 0
  
  // Calculate status based on churches and generations
  let status = 'unreached'
  
  // Unreached: 0 churches AND 0 generations
  if (numChurches === 0 && numGenerations === 0) {
    status = 'unreached'
  } else if (numChurches >= 100 && numGenerations >= 4) {
    status = 'dmm'
  } else if (numChurches >= 67) {
    status = 'tipping-point'
  } else if (numChurches >= 34) {
    status = 'midway'
  } else {
    status = 'pioneer'
  }
  
  // Calculate level based on generations
  let level = 'I'
  if (numGenerations >= 7) {
    level = 'IV'
  } else if (numGenerations >= 5) {
    level = 'III'
  } else if (numGenerations >= 3) {
    level = 'II'
  }
  
  return { status, level }
}

// Engagement Status Legend Component - Toggleable with smooth animation
const EngagementStatusLegend = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Status colors matching the marker icons (5 statuses including Unreached) - NEW COLOR SYSTEM
  const legendItems = [
    { status: 'unreached', label: 'Unreached', color: '#ef4444' },   // Red
    { status: 'pioneer', label: 'Pioneer', color: '#f97316' },       // Orange
    { status: 'midway', label: 'Midway', color: '#eab308' },         // Yellow
    { status: 'tipping-point', label: 'Tipping Point', color: '#22c55e' }, // Light Green
    { status: 'dmm', label: 'DMM (Reached)', color: '#15803d' },     // Dark Green
  ]

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg text-sm">
      {/* Legend Header - Clickable to toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <h4 className="font-semibold text-gray-700">Légende</h4>
        <ChevronDown 
          size={16} 
          className={`text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Legend Content - Collapsible with smooth animation */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 space-y-3">
          {/* Status Colors */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Statut d'engagement</p>
            <div className="space-y-1.5">
              {legendItems.map(({ status, label, color }) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: color }}
                  ></span>
                  <span className="text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Marker Shapes */}
          <div className="border-t pt-2">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Source des données</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></span>
                <span className="text-gray-700">DMM (goutte)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-sm bg-blue-500 flex-shrink-0"></span>
                <span className="text-gray-700">Survey (carré)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rotate-45 bg-amber-500 flex-shrink-0"></span>
                <span className="text-gray-700">Joshua Project (losange)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></span>
                <span className="text-gray-700">IMB / PeopleGroups.org (cercle)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rotate-45 bg-violet-500 flex-shrink-0"></span>
                <span className="text-gray-700">Finishing the Task (carré)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mission Corridor Layer ────────────────────────────────────────────────────
// Calcule et affiche la tournée missionnaire optimale — relie les peuples JP
// non-atteints dans l'ordre qui minimise la distance totale de déplacement.

const PRIORITIZE_OPTIONS = [
  { value: 'frontier',   label: '🔴 Frontier d\'abord' },
  { value: 'population', label: '👥 Population d\'abord' },
  { value: 'distance',   label: '📍 Distance minimale' },
]

const CorridorPanel = ({ onClose, onResult }) => {
  const map = useMap()
  const [step, setStep]         = React.useState('config') // config|loading|results
  const [radius, setRadius]     = React.useState(200)
  const [maxStops, setMaxStops] = React.useState(10)
  const [prioritize, setPrioritize] = React.useState('frontier')
  const [result, setResult]     = React.useState(null)
  const [error, setError]       = React.useState(null)

  const token = localStorage.getItem('token')
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const handleCompute = async () => {
    setStep('loading')
    setError(null)
    try {
      // Utiliser le centre de la carte comme point de départ
      const center = map.getCenter()
      const url = `/api/analytics/mission-corridor?lat=${center.lat}&lng=${center.lng}&radius=${radius}&maxStops=${maxStops}&prioritize=${prioritize}`
      const res  = await fetch(url, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Erreur serveur')
      setResult(data)
      setStep('results')
      if (onResult) onResult(data)
      // Zoomer sur le corridor
      if (data.corridor?.length > 0) {
        const bounds = [
          [data.startPoint.lat, data.startPoint.lng],
          ...data.corridor.map(s => [s.lat, s.lng]),
        ]
        map.fitBounds(bounds, { padding: [40, 40] })
      }
    } catch (err) {
      setError(err.message)
      setStep('config')
    }
  }

  const STATUS_COLOR = {
    unreached: 'text-red-600', pioneer: 'text-orange-600',
    midway: 'text-yellow-600', 'tipping-point': 'text-green-600', dmm: 'text-emerald-700',
  }

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1002] w-80 max-h-[75vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-white">
          <MapIcon size={18} />
          <div>
            <p className="font-bold text-sm">Corridor de Percée</p>
            <p className="text-xs text-violet-200">Tournée missionnaire optimale</p>
          </div>
        </div>
        <button onClick={onClose} className="text-violet-200 hover:text-white p-1 rounded-lg">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Config */}
        {step === 'config' && (
          <div className="p-4 space-y-4">
            <p className="text-xs text-gray-500">
              Le centre de la carte sera le point de départ. Configurez la tournée puis cliquez sur Calculer.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Rayon : <span className="text-violet-600">{radius} km</span>
              </label>
              <input type="range" min={50} max={500} step={25}
                value={radius} onChange={e => setRadius(Number(e.target.value))}
                className="w-full accent-violet-600" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>50 km</span><span>250 km</span><span>500 km</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">
                Étapes max : <span className="text-violet-600">{maxStops}</span>
              </label>
              <input type="range" min={3} max={20} step={1}
                value={maxStops} onChange={e => setMaxStops(Number(e.target.value))}
                className="w-full accent-violet-600" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">Priorité</label>
              <div className="space-y-1.5">
                {PRIORITIZE_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="prioritize" value={opt.value}
                      checked={prioritize === opt.value}
                      onChange={() => setPrioritize(opt.value)}
                      className="accent-violet-600" />
                    <span className="text-xs text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            )}

            <button onClick={handleCompute}
              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-violet-700 hover:to-indigo-700 transition-all shadow-md flex items-center justify-center gap-2">
              <Navigation size={15} />
              Calculer le corridor
            </button>
          </div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="p-8 text-center">
            <Loader2 size={36} className="animate-spin text-violet-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Calcul en cours...</p>
            <p className="text-xs text-gray-400 mt-1">Optimisation TSP sur les peuples JP</p>
          </div>
        )}

        {/* Résultats */}
        {step === 'results' && result && (
          <div>
            {/* Stats globales */}
            <div className="p-3 bg-violet-50 border-b border-violet-100">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-violet-700">{result.totalStops}</p>
                  <p className="text-[10px] text-violet-500">étapes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-violet-700">{result.totalDistance} km</p>
                  <p className="text-[10px] text-violet-500">distance</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-violet-700">{result.stats?.frontierCount ?? 0}</p>
                  <p className="text-[10px] text-violet-500">Frontier</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2 text-[11px] text-violet-600 justify-center">
                <span>👥 {(result.stats?.totalPopulation ?? 0).toLocaleString('fr-FR')}</span>
                <span>·</span>
                <span>~{result.stats?.avgDistPerStop ?? '?'} km/étape</span>
              </div>
            </div>

            {/* Liste des étapes */}
            {result.corridor.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <p className="text-sm font-medium">Aucun peuple trouvé</p>
                <p className="text-xs mt-1">Essayez d'augmenter le rayon ou de changer le pays</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {/* Point de départ */}
                <div className="px-3 py-2 flex items-center gap-2 bg-violet-50">
                  <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">▶</div>
                  <p className="text-xs font-semibold text-violet-700">Point de départ (centre carte)</p>
                </div>

                {result.corridor.map((stop, i) => (
                  <div key={stop.id} className="px-3 py-2.5 hover:bg-gray-50">
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        stop.frontier ? 'bg-red-500 text-white' : 'bg-violet-100 text-violet-700'
                      }`}>{stop.step}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-0.5">
                          <p className="text-xs font-semibold text-gray-800 truncate">{stop.name}</p>
                          {stop.frontier && (
                            <span className="text-[9px] px-1 bg-red-100 text-red-700 rounded font-bold flex-shrink-0">F</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">{stop.country}</p>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          <span className={`text-[10px] font-medium ${STATUS_COLOR[stop.status] || 'text-gray-500'}`}>
                            {stop.status}
                          </span>
                          {stop.population > 0 && (
                            <span className="text-[10px] text-gray-400">👥 {stop.population.toLocaleString('fr-FR')}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-500">+{stop.distFromPrev} km</p>
                        <p className="text-[10px] text-violet-600 font-medium">{stop.cumulDist} km</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Retour au départ */}
                <div className="px-3 py-2 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">↩</div>
                    <p className="text-xs text-gray-500">Retour départ</p>
                  </div>
                  <p className="text-xs text-gray-500">+{result.returnDistance} km</p>
                </div>
                <div className="px-3 py-2 bg-violet-50 flex justify-between">
                  <p className="text-xs font-bold text-violet-700">Aller-retour total</p>
                  <p className="text-xs font-bold text-violet-700">{result.roundTrip} km</p>
                </div>
              </div>
            )}

            <div className="p-3 border-t border-gray-100">
              <button onClick={() => { setStep('config'); setResult(null) }}
                className="w-full py-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors">
                ← Reconfigurer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Couche carte du corridor (trait + marqueurs numérotés)
const CorridorMapLayer = ({ result }) => {
  if (!result?.corridor?.length) return null

  const linePositions = [
    [result.startPoint.lat, result.startPoint.lng],
    ...result.corridor.map(s => [s.lat, s.lng]),
  ]

  return (
    <>
      {/* Ligne de trajet animée */}
      <Polyline
        positions={linePositions}
        pathOptions={{
          color:     '#7c3aed',
          weight:    3,
          opacity:   0.85,
          dashArray: '8 6',
        }}
      />
      {/* Marqueurs numérotés */}
      {result.corridor.map((stop, i) => (
        <CircleMarker
          key={`corridor-${i}`}
          center={[stop.lat, stop.lng]}
          radius={stop.frontier ? 11 : 9}
          pathOptions={{
            color:       stop.frontier ? '#dc2626' : '#7c3aed',
            fillColor:   stop.frontier ? '#ef4444' : '#8b5cf6',
            fillOpacity: 0.9,
            weight:      2,
          }}
        >
          <Popup>
            <div className="min-w-[160px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {stop.step}
                </span>
                <strong className="text-sm">{stop.name}</strong>
              </div>
              <p className="text-xs text-gray-500 mb-1">{stop.country}</p>
              {stop.frontier && (
                <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">🔴 Frontier</span>
              )}
              <div className="mt-2 text-xs text-gray-600 space-y-0.5">
                {stop.population > 0 && <p>👥 {stop.population.toLocaleString('fr-FR')}</p>}
                {stop.language  && <p>🗣 {stop.language}</p>}
                {stop.pctEvangel > 0 && <p>✝ {stop.pctEvangel}% évang.</p>}
                <p className="text-violet-600 font-medium">📍 Étape {stop.step} · {stop.cumulDist} km parcourus</p>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {/* Point de départ */}
      <CircleMarker
        center={[result.startPoint.lat, result.startPoint.lng]}
        radius={12}
        pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.95, weight: 2 }}
      >
        <Popup><p className="text-xs font-bold text-emerald-700">▶ Point de départ</p></Popup>
      </CircleMarker>
    </>
  )
}

// Wrapper qui fournit `useMap` au panel
const CorridorWrapper = ({ visible, onClose }) => {
  const [corridorResult, setCorridorResult] = React.useState(null)
  if (!visible) return null
  return (
    <>
      <CorridorPanel onClose={onClose} onResult={setCorridorResult} />
      <CorridorMapLayer result={corridorResult} />
    </>
  )
}

// ── Proximity Alert ───────────────────────────────────────────────────────────
// Détecte la position GPS du missionnaire et affiche les peuples JP non-atteints
// dans un rayon configurable. Bouton "Engager" crée un PeopleGroup DMM en 1 clic.
const ProximityAlert = ({ visible, onEngaged }) => {
  const [step, setStep]           = React.useState('idle') // idle|locating|results|engaging|done
  const [position, setPosition]   = React.useState(null)
  const [radius, setRadius]       = React.useState(50)     // km
  const [peoples, setPeoples]     = React.useState([])
  const [error, setError]         = React.useState(null)
  const [engaging, setEngaging]   = React.useState(null)   // id du peuple en cours d'engagement
  const [engaged, setEngaged]     = React.useState([])     // ids déjà engagés cette session

  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  const STATUS_LABEL = {
    unreached:       'Non-atteint',
    pioneer:         'Pionnier',
    midway:          'Mi-parcours',
    'tipping-point': 'Basculement',
    dmm:             'Mouvement',
  }
  const STATUS_COLOR = {
    unreached:       'bg-red-100 text-red-700',
    pioneer:         'bg-orange-100 text-orange-700',
    midway:          'bg-yellow-100 text-yellow-700',
    'tipping-point': 'bg-green-100 text-green-700',
    dmm:             'bg-emerald-100 text-emerald-800',
  }

  // Localiser l'utilisateur
  const handleLocate = () => {
    setStep('locating')
    setError(null)
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas disponible sur cet appareil.')
      setStep('idle')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPosition({ lat, lng })
        fetchNearby(lat, lng, radius)
      },
      (err) => {
        setError('Impossible d\'obtenir votre position. Vérifiez les permissions GPS.')
        setStep('idle')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // Chercher les peuples JP non-atteints à proximité
  const fetchNearby = async (lat, lng, radiusKm) => {
    setStep('locating')
    try {
      const maxDist = radiusKm * 1000 // mètres
      const res = await fetch(
        `/api/people-groups/nearby/${lng}/${lat}?maxDistance=${maxDist}&source=Joshua Project`,
        { headers }
      )
      const data = await res.json()
      // Filtrer : seulement les JP non-atteints ou pionniers
      const filtered = (data.data || []).filter(p =>
        p.source === 'Joshua Project' &&
        ['unreached', 'pioneer'].includes(p.engagementStatus)
      )
      setPeoples(filtered)
      setStep('results')
    } catch (err) {
      setError('Erreur lors de la recherche des peuples à proximité.')
      setStep('idle')
    }
  }

  // Engager un peuple JP → créer un PeopleGroup DMM
  const handleEngage = async (people) => {
    setEngaging(people._id)
    try {
      const res = await fetch('/api/people-groups/engage-from-jp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jpPeopleGroupId: people.jpData?.peopleId || '',
          name:            people.name,
          coordinates:     people.location.coordinates,
          population:      people.population,
          language:        people.language,
          religion:        people.religion,
          country:         people.country,
          countryCode:     people.countryCode,
          jpData:          people.jpData,
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
        // Déjà engagé — on marque quand même comme fait
        setEngaged(prev => [...prev, people._id])
      } else if (res.ok) {
        setEngaged(prev => [...prev, people._id])
        if (onEngaged) onEngaged(data.data)
      } else {
        setError(data.message || 'Erreur lors de l\'engagement.')
      }
    } catch (err) {
      setError('Erreur réseau lors de l\'engagement.')
    } finally {
      setEngaging(null)
    }
  }

  const reset = () => {
    setStep('idle')
    setPosition(null)
    setPeoples([])
    setError(null)
    setEngaged([])
  }

  if (!visible) return null

  return (
    <div className="absolute top-1/2 right-4 -translate-y-1/2 z-[1002] w-80 max-h-[75vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-white">
          <Navigation size={18} />
          <div>
            <p className="font-bold text-sm">Proximity Alert</p>
            <p className="text-xs text-teal-100">Peuples non-atteints à proximité</p>
          </div>
        </div>
        <button onClick={reset} className="text-teal-200 hover:text-white p-1 rounded-lg">
          <X size={16} />
        </button>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">

        {/* État idle */}
        {step === 'idle' && (
          <div className="p-5 text-center">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Navigation size={28} className="text-teal-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Trouver les peuples à cibler</p>
            <p className="text-xs text-gray-500 mb-4">
              Détecte votre position GPS et affiche les peuples JP non-atteints dans un rayon configurable.
            </p>

            {/* Sélecteur de rayon */}
            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 mb-1 block">
                Rayon de recherche : <span className="text-teal-600 font-bold">{radius} km</span>
              </label>
              <input
                type="range" min={10} max={200} step={10}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>10 km</span><span>100 km</span><span>200 km</span>
              </div>
            </div>

            <button
              onClick={handleLocate}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:from-teal-700 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Navigation size={16} />
              Localiser et rechercher
            </button>

            {error && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
            )}
          </div>
        )}

        {/* Localisation en cours */}
        {step === 'locating' && (
          <div className="p-8 text-center">
            <Loader2 size={36} className="animate-spin text-teal-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Localisation en cours...</p>
            <p className="text-xs text-gray-400 mt-1">Recherche des peuples dans un rayon de {radius} km</p>
          </div>
        )}

        {/* Résultats */}
        {step === 'results' && (
          <div>
            {/* Position trouvée */}
            {position && (
              <div className="px-4 py-2 bg-teal-50 border-b border-teal-100 flex items-center gap-2">
                <MapPin size={12} className="text-teal-600 flex-shrink-0" />
                <p className="text-[11px] text-teal-700">
                  Position : {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                  <span className="ml-2 font-semibold">· Rayon {radius} km</span>
                </p>
              </div>
            )}

            {peoples.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">Aucun peuple non-atteint</p>
                <p className="text-xs text-gray-500 mt-1">
                  Aucun peuple JP non-atteint dans un rayon de {radius} km.
                  Essayez d'augmenter le rayon.
                </p>
                <button
                  onClick={() => setStep('idle')}
                  className="mt-3 text-xs text-teal-600 hover:underline"
                >
                  ← Modifier le rayon
                </button>
              </div>
            ) : (
              <div>
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">
                    {peoples.length} peuple{peoples.length > 1 ? 's' : ''} non-atteint{peoples.length > 1 ? 's' : ''}
                  </p>
                  <button onClick={() => setStep('idle')} className="text-[11px] text-gray-400 hover:text-gray-600">
                    ← Modifier
                  </button>
                </div>

                <div className="divide-y divide-gray-50">
                  {peoples.map(p => {
                    const isEngaged   = engaged.includes(p._id)
                    const isEngaging  = engaging === p._id
                    const distKm      = p.distance ? (p.distance / 1000).toFixed(0) : null

                    return (
                      <div key={p._id} className={`p-3 transition-colors ${isEngaged ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="font-semibold text-sm text-gray-800 truncate">{p.name}</p>
                              {p.jpData?.frontier && (
                                <span className="text-[10px] px-1 py-0.5 bg-red-100 text-red-700 rounded font-bold flex-shrink-0">F</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 mb-1.5">{p.country}{distKm ? ` · ${distKm} km` : ''}</p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.engagementStatus] || 'bg-gray-100 text-gray-600'}`}>
                                {STATUS_LABEL[p.engagementStatus] || p.engagementStatus}
                              </span>
                              {p.population > 0 && (
                                <span className="text-[10px] text-gray-400">👥 {p.population.toLocaleString('fr-FR')}</span>
                              )}
                              {p.jpData?.percentEvangelical > 0 && (
                                <span className="text-[10px] text-gray-400">✝ {p.jpData.percentEvangelical}%</span>
                              )}
                            </div>
                          </div>

                          {/* Bouton Engager */}
                          <button
                            onClick={() => !isEngaged && handleEngage(p)}
                            disabled={isEngaged || isEngaging}
                            className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              isEngaged
                                ? 'bg-green-100 text-green-700 cursor-default'
                                : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                            }`}
                          >
                            {isEngaging
                              ? <Loader2 size={12} className="animate-spin" />
                              : isEngaged
                                ? <><CheckCircle size={12} /> Engagé</>
                                : 'Engager'
                            }
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Coverage Layer — Mode Couverture ─────────────────────────────────────────
// Affiche les polygones Voronoï colorés selon le statut DMM du village.
// Rouge = zone sans engagement, Vert = mouvement actif.
// Charge le GeoJSON Voronoï depuis /public/data/ + croise avec l'API coverage.

const STATUS_COLORS_FILL = {
  'dmm':            { fill: '#15803d', stroke: '#166534', label: 'Mouvement' },
  'tipping-point':  { fill: '#22c55e', stroke: '#16a34a', label: 'Basculement' },
  'midway':         { fill: '#eab308', stroke: '#ca8a04', label: 'Mi-parcours' },
  'pioneer':        { fill: '#f97316', stroke: '#ea580c', label: 'Pionnier' },
  'unreached':      { fill: '#ef4444', stroke: '#dc2626', label: 'Non-atteint' },
  'unknown':        { fill: '#e5e7eb', stroke: '#d1d5db', label: 'Inconnu' },
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Minimal ray-casting point-in-polygon (handles a single ring). */
function pointInRing(point, ring) {
  const [px, py] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect =
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInFeature(lngLat, feature) {
  const geom = feature?.geometry
  if (!geom) return false
  if (geom.type === 'Polygon') {
    return pointInRing(lngLat, geom.coordinates[0])
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some(poly => pointInRing(lngLat, poly[0]))
  }
  return false
}

const DMM_PRIORITY = ['dmm', 'tipping-point', 'midway', 'pioneer', 'unreached']

/** Aggregate people into polygons (returns Map<featureIndex, info>). */
function buildLocalCoverageMap(geojson, peoples) {
  const result = new Map()
  if (!geojson?.features?.length || !peoples?.length) return result

  for (const person of peoples) {
    const coords = person?.location?.coordinates
    if (!coords || coords.length < 2) continue
    const lngLat = [coords[0], coords[1]]

    for (let i = 0; i < geojson.features.length; i++) {
      if (!pointInFeature(lngLat, geojson.features[i])) continue

      const existing = result.get(i) || {
        status: 'unknown',
        peopleCount: 0,
        population: 0,
        churches: 0,
        peoples: [],
      }
      existing.peopleCount += 1
      existing.population += person.population || 0
      existing.churches += person.numberOfChurches || 0
      existing.peoples.push({
        name: person.name || 'Sans nom',
        engagementStatus: person.engagementStatus || 'unknown',
        source: person.source || '',
        population: person.population || 0,
      })

      const newStatus = person.engagementStatus || 'unknown'
      const curIdx = DMM_PRIORITY.indexOf(existing.status)
      const newIdx = DMM_PRIORITY.indexOf(newStatus)
      if (newIdx !== -1 && (curIdx === -1 || newIdx < curIdx)) {
        existing.status = newStatus
      }
      result.set(i, existing)
      break
    }
  }
  return result
}

/** Infer admin level from GADM GID fields, or read explicit admin_level. */
function inferAdminLevel(props = {}) {
  if (props.admin_level != null) return Number(props.admin_level)
  if (!props.GID_2) return 1
  if (!props.GID_3) return 2
  return 3
}

function adminFeatureName(props = {}) {
  const lvl = inferAdminLevel(props)
  if (lvl === 1) return props.NAME_1 || props.name || ''
  if (lvl === 2) return props.NAME_2 || props.name || ''
  return props.NAME_3 || props.name || ''
}

// ─── data files keyed by alpha-3 country code ────────────────────────────────
const COUNTRY_DATA_FILES = {
  CMR: { admin: '/data/Admin123CMR fusionnées.geojson',  villages: '/data/Villages découpés.geojson' },
  CAF: { admin: '/data/CAF_admin123.geojson',            villages: '/data/VCAF_Polygons.geojson' },
  TCD: { admin: '/data/TCD_admin123.geojson',            villages: '/data/VChad_polygons.geojson' },
  GAB: { admin: '/data/GAB_admin123.geojson',            villages: '/data/VGabon_Polygons.geojson' },
  COG: { admin: '/data/Admin123COG fusionnées.geojson',  villages: '/data/VCongoBrazza_Polygons.geojson' },
  COD: { admin: '/data/Admin123COD fusionnées.geojson',  villages: null },
  GNQ: { admin: '/data/Admin123GNQ fusionnées.geojson',  villages: null },
}

// ─── CoverageLevelIndicator (rendered via portal) ────────────────────────────
const LEVEL_BADGE_COLORS = {
  village:        'bg-blue-100 text-blue-700 border-blue-300',
  arrondissement: 'bg-violet-100 text-violet-700 border-violet-300',
  departement:    'bg-emerald-100 text-emerald-700 border-emerald-300',
  region:         'bg-amber-100 text-amber-700 border-amber-300',
}

const CoverageLevelIndicator = ({ level, zoom }) => {
  if (!level) return null
  const cfg = VORONOI_ZOOM_CONFIG[level]
  if (!cfg) return null
  const colors = LEVEL_BADGE_COLORS[level] || 'bg-gray-100 text-gray-700 border-gray-300'
  return createPortal(
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-md pointer-events-none select-none ${colors}`}
    >
      <span>{cfg.label}</span>
      <span className="opacity-60 font-normal">zoom {zoom}</span>
    </div>,
    document.body,
  )
}

// ─── CoverageLayer (zoom-aware) ──────────────────────────────────────────────
const CoverageLayer = ({ visible, countryCode, peoples }) => {
  const map = useMap()

  // Resolve alpha-2 → alpha-3 for the data file map.
  const code3 = React.useMemo(() => {
    if (!countryCode) return null
    const upper = countryCode.toUpperCase()
    if (upper.length === 3) return upper
    const cfg = getCountryConfig(upper)
    return cfg?.code3 || cfg?.code || null
  }, [countryCode])

  const files = code3 ? COUNTRY_DATA_FILES[code3] : null

  // ── state ───────────────────────────────────────────────────────────────
  const [zoom, setZoom]               = React.useState(() => map.getZoom())
  const [adminData, setAdminData]     = React.useState(null)
  const [villageData, setVillageData] = React.useState(null)
  const [voronoiData, setVoronoiData] = React.useState(null)
  const [coverageMap, setCoverageMap] = React.useState(null) // backend (CMR voronoi)
  const [loading, setLoading]         = React.useState(false)
  const [error, setError]             = React.useState(null)

  const layerRef = React.useRef(null)

  // Track zoom changes
  useMapEvents({
    zoomend() { setZoom(map.getZoom()) },
  })

  const level = getVoronoiLevelForZoom(zoom)

  // ── data loading ────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!visible) return
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('token')
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const coverageUrl = `/api/analytics/coverage-voronoi${countryCode ? `?countryCode=${countryCode}` : ''}`

    const tasks = [
      fetch('/data/voronoi.geojson')
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(coverageUrl, { headers })
        .then(r => (r.ok ? r.json() : { coverageMap: {} }))
        .catch(() => ({ coverageMap: {} })),
      files?.admin
        ? fetch(files.admin).then(r => (r.ok ? r.json() : null)).catch(() => null)
        : Promise.resolve(null),
      files?.villages
        ? fetch(files.villages).then(r => (r.ok ? r.json() : null)).catch(() => null)
        : Promise.resolve(null),
    ]

    let cancelled = false
    Promise.all(tasks)
      .then(([voronoi, coverage, admin, villages]) => {
        if (cancelled) return
        setVoronoiData(voronoi)
        setCoverageMap(coverage?.coverageMap || {})
        setAdminData(admin)
        setVillageData(villages)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [visible, countryCode, files?.admin, files?.villages])

  // ── pick the dataset that matches the current zoom level ───────────────
  const { activeData, nameKey, useApiCoverage } = React.useMemo(() => {
    if (!visible) return { activeData: null, nameKey: null, useApiCoverage: false }

    if (level === 'village') {
      if (villageData?.features?.length) {
        return { activeData: villageData, nameKey: 'name', useApiCoverage: false }
      }
      // Fallback to the small CMR-only voronoi tied to the backend coverage map
      return { activeData: voronoiData, nameKey: 'village_name', useApiCoverage: true }
    }

    if (!adminData?.features?.length) {
      return { activeData: null, nameKey: null, useApiCoverage: false }
    }

    const targetLvl = level === 'arrondissement' ? 3
                    : level === 'departement'    ? 2
                    : 1 // region
    const features = adminData.features.filter(
      f => inferAdminLevel(f.properties) === targetLvl,
    )
    // Fall back to the highest available level if requested level is empty
    // (e.g. CAF/COG/COD/GNQ have no level 3).
    const safeFeatures = features.length
      ? features
      : adminData.features.filter(f => inferAdminLevel(f.properties) === 1)

    return {
      activeData: { type: 'FeatureCollection', features: safeFeatures },
      nameKey: null, // use adminFeatureName()
      useApiCoverage: false,
    }
  }, [visible, level, adminData, villageData, voronoiData])

  // Local coverage aggregation (used whenever we are NOT relying on the API)
  const localCoverage = React.useMemo(() => {
    if (useApiCoverage || !activeData) return null
    return buildLocalCoverageMap(activeData, peoples || [])
  }, [useApiCoverage, activeData, peoples])

  // ── style helper ────────────────────────────────────────────────────────
  const styleFeature = React.useCallback(
    (feature, idx) => {
      let info
      if (useApiCoverage && coverageMap) {
        const name = feature.properties?.[nameKey] || ''
        info = coverageMap[name] || coverageMap[String(name).toLowerCase().trim()]
      } else if (localCoverage) {
        info = localCoverage.get(idx)
      }
      const status = info?.status || 'unknown'
      const cfg    = STATUS_COLORS_FILL[status] || STATUS_COLORS_FILL.unknown
      return {
        fillColor:   cfg.fill,
        fillOpacity: status === 'unknown' ? 0.08 : 0.35,
        color:       '#000000',
        weight:      status === 'unknown' ? 0.5 : 1,
        opacity:     status === 'unknown' ? 0.5 : 0.9,
      }
    },
    [useApiCoverage, coverageMap, localCoverage, nameKey],
  )

  // ── imperative Leaflet layer (avoids GeoJSON re-mount issues on zoom) ──
  React.useEffect(() => {
    if (!map) return

    if (layerRef.current) {
      layerRef.current.remove()
      layerRef.current = null
    }
    if (!visible || !activeData?.features?.length) return

    const feats = activeData.features

    const layer = L.geoJSON(activeData, {
      style: feature => styleFeature(feature, feats.indexOf(feature)),
      onEachFeature: (feature, lyr) => {
        const idx   = feats.indexOf(feature)
        const props = feature.properties || {}
        const name  = nameKey
          ? (props[nameKey] || 'Inconnu')
          : (adminFeatureName(props) || 'Inconnu')

        let info
        if (useApiCoverage && coverageMap) {
          info = coverageMap[name] || coverageMap[String(name).toLowerCase().trim()]
        } else if (localCoverage) {
          info = localCoverage.get(idx)
        }

        const status = info?.status || 'unknown'
        const cfg    = STATUS_COLORS_FILL[status] || STATUS_COLORS_FILL.unknown

        lyr.bindPopup(
          `<div style="min-width:180px;font-family:inherit">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <div style="width:12px;height:12px;border-radius:50%;background:${cfg.fill};flex-shrink:0"></div>
              <strong style="font-size:14px">${name}</strong>
            </div>
            <div style="display:inline-flex;align-items:center;gap:4px;background:${cfg.fill}22;border:1px solid ${cfg.fill}66;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;color:${cfg.fill}">
              ${cfg.label}
            </div>
            ${info ? `
              <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;color:#374151">
                <span>👥 ${info.peopleCount} peuple${info.peopleCount > 1 ? 's' : ''}</span>
                ${info.churches ? `<span>⛪ ${info.churches} églises</span>` : ''}
                ${info.population ? `<span>Pop: ${info.population.toLocaleString('fr-FR')}</span>` : ''}
              </div>
              ${info.peoples && info.peoples.length ? `
                <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e5e7eb;max-height:160px;overflow-y:auto;">
                  <p style="font-weight:600;font-size:11px;color:#374151;margin-bottom:4px;">Peuples:</p>
                  <div style="display:flex;flex-direction:column;gap:3px;">
                    ${info.peoples.slice(0, 20).map(p => {
                      const pCfg = STATUS_COLORS_FILL[p.engagementStatus] || STATUS_COLORS_FILL.unknown
                      return `
                        <div style="display:flex;align-items:center;gap:6px;font-size:11px;line-height:1.2;">
                          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${pCfg.fill};flex-shrink:0;"></span>
                          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#374151;" title="${p.name}">${p.name}</span>
                          ${p.source === 'Joshua Project' ? '<span style="font-size:9px;color:#6b7280;">JP</span>' : ''}
                        </div>
                      `
                    }).join('')}
                    ${info.peoples.length > 20 ? `<p style="font-size:10px;color:#6b7280;margin-top:2px;">... et ${info.peoples.length - 20} autres</p>` : ''}
                  </div>
                </div>
              ` : ''}
              ` : `
              <p style="margin-top:6px;font-size:11px;color:#9ca3af;font-style:italic">
                Aucun peuple DMM enregistré dans cette zone
              </p>`}
          </div>`,
          { maxWidth: 300 },
        )

        lyr.on({
          mouseover: (e) => {
            e.target.setStyle({ fillOpacity: 0.6, weight: 1.5 })
            e.target.bringToFront()
          },
          mouseout: (e) => {
            e.target.setStyle(styleFeature(feature, idx))
          },
        })
      },
    })

    layer.addTo(map)
    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        layerRef.current.remove()
        layerRef.current = null
      }
    }
  }, [map, visible, activeData, styleFeature, useApiCoverage, coverageMap, localCoverage, nameKey])

  if (!visible) return null

  return (
    <>
      {loading && createPortal(
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1002] bg-white rounded-full shadow-lg px-4 py-2 text-xs font-medium text-gray-600 flex items-center gap-2 pointer-events-none">
          <Loader2 size={14} className="animate-spin text-teal-600" />
          Chargement des zones de couverture…
        </div>,
        document.body,
      )}
      {!loading && !error && (
        <CoverageLevelIndicator level={level} zoom={zoom} />
      )}
    </>
  )
}

// ── Légende Mode Couverture ───────────────────────────────────────────────────
const CoverageLegend = ({ visible }) => {
  if (!visible) return null
  return (
    <div className="absolute bottom-48 right-4 z-[1001] bg-white rounded-xl shadow-lg p-3 border border-gray-200">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Couverture DMM</p>
      {Object.entries(STATUS_COLORS_FILL)
        .filter(([k]) => k !== 'unknown')
        .map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-2 mb-1.5">
            <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ background: cfg.fill, opacity: 0.8 }} />
            <span className="text-xs text-gray-600">{cfg.label}</span>
          </div>
        ))}
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-100">
        <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-gray-200" />
        <span className="text-xs text-gray-400">Non renseigné</span>
      </div>
    </div>
  )
}

// ── Activity Heatmap Layer ────────────────────────────────────────────────────
// Couche carte qui affiche une heatmap de l'activité DMM (disciples, églises,
// rapports récents) par peuple. Visible uniquement en mode Stratégique.
const ActivityHeatmapLayer = ({ visible }) => {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!visible || data) return
    setLoading(true)
    const token = localStorage.getItem('token')
    fetch('/api/analytics/activity-heatmap', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(res => { setData(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [visible])

  if (!visible || !data?.peoples?.length) return null

  const maxScore = Math.max(...data.peoples.map(p => p.activityScore ?? 0), 1)

  return (
    <>
      {data.peoples.map((p, i) => {
        const [lng, lat] = p.coordinates
        if (!lat || !lng) return null

        const ratio  = maxScore > 0 ? (p.activityScore ?? 0) / maxScore : 0
        const radius = Math.round(6 + ratio * 34)

        // Gradient de couleur : bleu froid (faible) → orange chaud (élevé)
        const r = Math.round(ratio * 255)
        const g = Math.round((1 - ratio) * 140)
        const color = `rgb(${r},${g},200)`

        return (
          <CircleMarker
            key={`heatmap-${i}`}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color:       color,
              fillColor:   color,
              fillOpacity: 0.4,
              weight:      1,
              opacity:     0.7,
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm leading-tight">{p.name}</h3>
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200 flex-shrink-0">
                    🔥 Activité
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">📍 {p.country}</p>
                <div className="bg-orange-50 rounded-lg p-2 mb-2 text-center border border-orange-100">
                  <p className="text-2xl font-black text-orange-700">{p.activityScore ?? 0}</p>
                  <p className="text-[10px] text-orange-500 font-medium">Score d'activité</p>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                  {p.totalChurches  > 0 && <span>⛪ {p.totalChurches} églises</span>}
                  {p.newDisciples   > 0 && <span>👥 {p.newDisciples} disciples</span>}
                  {p.recentReports  > 0 && <span>📋 {p.recentReports} rapports</span>}
                </div>
                {data.quarter && (
                  <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-100 pt-1">
                    Données : {data.quarter}
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

// ── Map Mode Toggle ──────────────────────────────────────────────────────────
const MapModeToggle = ({ mode, onChange }) => (
  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex bg-white/95 backdrop-blur-sm rounded-full shadow-md p-0.5 gap-0.5 border border-neutral-100">
    {[
      { key: 'terrain',   icon: Compass,   label: 'Terrain',     active: 'text-teal-700 bg-teal-50' },
      { key: 'strategic', icon: BarChart2,  label: 'Stratégique', active: 'text-violet-700 bg-violet-50' },
      { key: 'coverage',  icon: Eye,        label: 'Couverture',  active: 'text-emerald-700 bg-emerald-50' },
    ].map(({ key, icon: Icon, label, active }) => (
      <button key={key} onClick={() => onChange(key)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
          mode === key ? active + ' shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'
        }`}>
        <Icon size={12} />
        <span className="hidden sm:inline">{label}</span>
      </button>
    ))}
  </div>
)

// Map click handler component
const MapClickHandler = ({ onMapClick, isAddingPeople }) => {
  useMapEvents({
    click: (e) => {
      if (isAddingPeople) {
        onMapClick(e.latlng)
      }
    },
  })
  return null
}

// NOTE: ViewportBoundsHandler removed - people groups are now filtered by geographic selection only

// Map controller component for programmatic control
const MapController = ({ center, zoom, fitBounds }) => {
  const map = useMap()
  
  useEffect(() => {
    if (fitBounds && fitBounds.length > 0) {
      const bounds = L.latLngBounds(fitBounds)
      map.fitBounds(bounds, { padding: [50, 50] })
    } else if (center) {
      map.flyTo(center, zoom || 12)
    }
  }, [center, zoom, fitBounds, map])
  
  return null
}

// Fly to location component - FIXED: Preserves current zoom level to prevent unwanted zoom resets
// The zoom parameter is now optional and defaults to preserving the user's current zoom
const FlyToLocation = ({ center, zoom = null, preserveZoom = true }) => {
  const map = useMap()
  const prevCenter = useRef(null)
  
  useEffect(() => {
    if (center && JSON.stringify(center) !== JSON.stringify(prevCenter.current)) {
      // If preserveZoom is true (default), use current zoom level
      // This prevents jarring zoom changes when clicking on markers or people groups
      const targetZoom = preserveZoom ? map.getZoom() : (zoom || 12)
      
      // Only fly if the distance is significant (more than 0.01 degrees)
      const currentCenter = map.getCenter()
      const distance = Math.sqrt(
        Math.pow(center[0] - currentCenter.lat, 2) + 
        Math.pow(center[1] - currentCenter.lng, 2)
      )
      
      // If distance is small, just pan smoothly without zoom animation
      if (distance < 0.5) {
        map.panTo(center, { animate: true, duration: 0.5 })
      } else {
        map.flyTo(center, targetZoom, { animate: true, duration: 1 })
      }
      
      prevCenter.current = center
    }
  }, [center, zoom, preserveZoom, map])
  
  return null
}

// Component to handle map resize when sidebar is toggled
const MapResizeHandler = ({ sidebarOpen }) => {
  const map = useMap()
  
  useEffect(() => {
    // Wait for CSS transition to complete (300ms) then invalidate map size
    const timeoutId = setTimeout(() => {
      map.invalidateSize({ animate: true })
    }, 350) // Slightly longer than the 300ms transition
    
    return () => clearTimeout(timeoutId)
  }, [sidebarOpen, map])
  
  return null
}

// Fit all markers component - IMPROVED: Better zoom constraints and smoother animation
// Only triggered explicitly by user action (Fit All button), not automatically
const FitAllMarkers = ({ peoples, trigger }) => {
  const map = useMap()
  
  useEffect(() => {
    if (trigger && peoples && peoples.length > 0) {
      // Filter peoples with valid coordinates
      const peoplesWithCoords = peoples.filter(p => 
        p?.location?.coordinates && 
        Array.isArray(p.location.coordinates) && 
        p.location.coordinates.length >= 2
      )
      if (peoplesWithCoords.length > 0) {
        const bounds = L.latLngBounds(
          peoplesWithCoords.map(p => [p.location.coordinates[1], p.location.coordinates[0]])
        )
        // Use better padding and zoom constraints for smoother experience
        // maxZoom: 12 allows closer zoom for small areas
        // animate: true for smooth transition
        map.fitBounds(bounds, { 
          padding: [80, 80], 
          maxZoom: 12,
          animate: true,
          duration: 0.5
        })
      }
    }
  }, [trigger, peoples, map])
  
  return null
}

// Memoized People Marker Component - prevents unnecessary re-renders
// Only re-renders when the people data actually changes
const PeopleMarker = memo(({ people, onSelect, onDelete, onNavigate, highlighted, mapMode }) => {
  const icon = useMemo(() => {
    if (highlighted) {
      return L.divIcon({
        className: 'custom-marker highlight-pulse',
        html: `<div style="position:relative;">
    <div style="position:absolute;top:-8px;left:-8px;width:26px;height:26px;border-radius:50%;background:rgba(91,95,239,0.25);animation:pulse 1.2s ease-in-out infinite;"></div>
    <div style="background-color:#5B5FEF;width:14px;height:14px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(91,95,239,0.6);position:relative;z-index:2;"></div>
  </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 14],
        popupAnchor: [0, -14],
      })
    }
    return getMarkerIcon(people.engagementStatus, people.source, mapMode, people.population)
  }, [highlighted, people.engagementStatus, people.source, mapMode, people.population])
  
  const position = useMemo(() => 
    [people.location.coordinates[1], people.location.coordinates[0]],
    [people.location.coordinates]
  )
  
  const eventHandlers = useMemo(() => ({
    click: () => onSelect(people._id)
  }), [people._id, onSelect])
  
  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation()
    onDelete(e, people)
  }, [people, onDelete])
  
  const handleNavigate = useCallback(() => {
    onNavigate(`/people-groups/${people._id}`)
  }, [people._id, onNavigate])

  const isJP = people.source === 'Joshua Project'
  
  return (
    <Marker 
      position={position}
      icon={icon}
      eventHandlers={eventHandlers}
      zIndexOffset={highlighted ? 1000 : 0}
    >
      <Popup>
        <div className="min-w-[230px] max-w-[280px]">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-base leading-tight">{people.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              isJP
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : people.source === 'Survey'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-primary-100 text-primary-700 border border-primary-300'
            }`}>
              {isJP ? 'JP' : people.source === 'Survey' ? 'Survey' : 'DMM'}
            </span>
          </div>

          {people.villageName && (
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <MapPin size={11} /> {people.villageName}
            </p>
          )}

          {/* Statut */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${engagementStatusColors[people.engagementStatus] || engagementStatusColors.pioneer}`} />
            <span className="text-sm font-medium">
              {engagementStatusLabels[people.engagementStatus] || people.engagementStatus}
            </span>
            {people.engagementLevel && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs ml-auto">
                Niv. {people.engagementLevel}
              </span>
            )}
          </div>

          {/* Données DMM terrain */}
          {!isJP && (
            <p className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
              <Church size={13} className="text-gray-400" />
              {people.numberOfChurches || 0} églises
              {people.churchGeneration > 0 && (
                <span className="text-gray-400 text-xs ml-1">(Gén. {people.churchGeneration})</span>
              )}
            </p>
          )}

          {/* Mode stratégique — données JP enrichies */}
          {mapMode === 'strategic' && isJP && (
            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
              <div className="flex gap-1 flex-wrap">
                {people.jpData?.frontier && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded-full border border-red-200">
                    🔴 Frontier
                  </span>
                )}
                {people.jpData?.leastReached && (
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded-full border border-orange-200">
                    ⚠ Least Reached
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-600">
                {people.population > 0 && (
                  <span>👥 {people.population.toLocaleString('fr-FR')}</span>
                )}
                {people.religion && <span>🕌 {people.religion}</span>}
                {people.jpData?.percentEvangelical != null && (
                  <span>✝ {people.jpData.percentEvangelical}% évang.</span>
                )}
                {people.jpData?.jpScale && (
                  <span>📊 JP Scale {people.jpData.jpScale}/5</span>
                )}
                {people.language && (
                  <span className="col-span-2">🗣 {people.language}</span>
                )}
              </div>
            </div>
          )}

          {/* Description courte (mode terrain, non-JP) */}
          {!isJP && people.description && (
            <p className="text-gray-500 text-xs mt-2 line-clamp-2">{people.description}</p>
          )}

          <div className="flex gap-2 mt-3">
            <button 
              onClick={handleNavigate}
              className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-1"
            >
              <ExternalLink size={13} />
              Détails
            </button>
            <button 
              onClick={handleDeleteClick}
              className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              title="Supprimer"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.highlighted === nextProps.highlighted &&
    prevProps.mapMode === nextProps.mapMode &&
    prevProps.people._id === nextProps.people._id &&
    prevProps.people.engagementStatus === nextProps.people.engagementStatus &&
    prevProps.people.source === nextProps.people.source &&
    prevProps.people.population === nextProps.people.population &&
    prevProps.people.location.coordinates[0] === nextProps.people.location.coordinates[0] &&
    prevProps.people.location.coordinates[1] === nextProps.people.location.coordinates[1] &&
    prevProps.people.name === nextProps.people.name &&
    prevProps.people.numberOfChurches === nextProps.people.numberOfChurches &&
    prevProps.people.churchGeneration === nextProps.people.churchGeneration
  )
})

PeopleMarker.displayName = 'PeopleMarker'

const MapView = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const { user } = useAuth()
  const [isAddingPeople, setIsAddingPeople] = useState(false)
  const [newPeopleCoords, setNewPeopleCoords] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ engagementStatus: '', search: '', countries: [] })
  const [mapCenter, setMapCenter] = useState([7.3697, 12.3547]) // Default to Cameroon center
  const [showAddModal, setShowAddModal] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedPeople, setSelectedPeople] = useState(null)
  const [fitAllTrigger, setFitAllTrigger] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, name } for confirmation dialog
  const [highlightedPeopleId, setHighlightedPeopleId] = useState(null)
  const [mapZoom, setMapZoom] = useState(null) // null = use default / preserve current zoom
  const [tileLayerKey, setTileLayerKey] = useState('positron') // 'positron' | 'darkMatter' | 'terrain'
  const [availableVillages, setAvailableVillages] = useState([]) // List of villages for dropdown
  const [villageSearchTerm, setVillageSearchTerm] = useState('') // Search term for village dropdown
  const [showVillageDropdown, setShowVillageDropdown] = useState(false) // Toggle village dropdown
  const [showJoshuaProject, setShowJoshuaProject] = useState(true)
  const [showDMMData, setShowDMMData] = useState(true)
  const [showSurveyData, setShowSurveyData] = useState(true)
  const [showIMB, setShowIMB] = useState(true)
  const [showFTT, setShowFTT] = useState(true)
  const [mapMode, setMapMode] = useState('terrain') // 'terrain' | 'strategic' | 'coverage'
  const [showProximityAlert, setShowProximityAlert] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showCorridor, setShowCorridor] = useState(false)

  // Village Status Layer
  const [showVillageLayer, setShowVillageLayer] = useState(false)
  const [villageStatusStats, setVillageStatusStats] = useState(null)
  const [villageLayerCountry, setVillageLayerCountry] = useState('CM')

  // ── Village layer (intégration de /geojson-map) ──────────────────────────
  const [villagesBoundaryData, setVillagesBoundaryData] = useState(null)
  const [adminBoundaryData, setAdminBoundaryData] = useState(null)
  const [villageLayerLoading, setVillageLayerLoading] = useState(false)
  const [dataType, setDataType] = useState('organization')
  const [selectedCountries, setSelectedCountries] = useState([]) // Default to empty = show all countries

  // Sync map mode → source toggles
  // Stratégique = JP auto-activé. Terrain/Couverture = ne touche pas à JP
  // (JP reste affiché par défaut, l'utilisateur peut toggler à la main)
  useEffect(() => {
    if (mapMode === 'strategic') {
      setShowJoshuaProject(true)
      setShowIMB(true)
      setShowFTT(true)
    }
  }, [mapMode])

  // Mapping pays → fichiers GeoJSON de polygones villages (niveau fin)
  const COUNTRY_VILLAGE_SOURCES = {
    CM: ['/data/villages.geojson', '/data/Villages découpés.geojson'],
    GA: ['/data/VGabon_Polygons.geojson'],
    TD: ['/data/VChad_polygons.geojson'],
    CG: ['/data/VCongoBrazza_Polygons.geojson'],
    CF: ['/data/VCAF_Polygons.geojson'],
    GQ: ['/data/Admin123GNQ fusionnées.geojson'],
    CD: ['/data/Admin123COD fusionnées.geojson'],
    RW: [],
  }

  // Mapping pays → fichiers GeoJSON de polygones admin (fallback / overlay)
  const COUNTRY_ADMIN_SOURCES = {
    CM: ['/data/Admin123CMR fusionnées.geojson'],
    GA: ['/data/GAB_admin123.geojson'],
    TD: ['/data/TCD_admin123.geojson'],
    CG: ['/data/Admin123COG fusionnées.geojson'],
    CF: ['/data/CAF_admin123.geojson'],
    GQ: ['/data/Admin123GNQ fusionnées.geojson'],
    CD: ['/data/Admin123COD fusionnées.geojson'],
    RW: [],
  }

  // Charger les polygones GeoJSON quand la couche est activée OU quand le pays
  // sélectionné change. On invalide les anciennes données pour éviter d'afficher
  // les polygones d'un autre pays pendant le chargement.
  useEffect(() => {
    if (!showVillageLayer) return
    setVillageLayerLoading(true)
    setVillagesBoundaryData(null)
    setAdminBoundaryData(null)

    const villageSources = COUNTRY_VILLAGE_SOURCES[villageLayerCountry] || []
    const adminSources = COUNTRY_ADMIN_SOURCES[villageLayerCountry] || []

    if (villageSources.length === 0 && adminSources.length === 0) {
      console.warn(`[MapView] Aucun fichier de polygones disponible pour le pays "${villageLayerCountry}"`)
      setVillageLayerLoading(false)
      return
    }

    const fetchAndMerge = (urls) => Promise.allSettled(
      urls.map(url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null))
    ).then(results => {
      const allFeatures = []
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value?.features) {
          allFeatures.push(...r.value.features)
        }
      })
      return allFeatures.length > 0
        ? { type: 'FeatureCollection', features: allFeatures }
        : null
    })

    Promise.all([fetchAndMerge(villageSources), fetchAndMerge(adminSources)])
      .then(([villagesFC, adminFC]) => {
        const vCount = villagesFC?.features?.length || 0
        const aCount = adminFC?.features?.length || 0
        console.log(`[MapView] Polygones chargés pour ${villageLayerCountry}: ${vCount} villages, ${aCount} admin`)
        setVillagesBoundaryData(villagesFC)
        setAdminBoundaryData(adminFC)
        setVillageLayerLoading(false)
      })
      .catch(err => {
        console.error('[MapView] Erreur chargement polygones:', err)
        setVillageLayerLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVillageLayer, villageLayerCountry])

  // Geographic filter state - replaces viewport-based loading
  // People groups are filtered by geographic selection (country/region/department/arrondissement)
  const [selectedRegion, setSelectedRegion] = useState('') // Admin level 1 (Region)
  const [selectedDepartment, setSelectedDepartment] = useState('') // Admin level 2 (Department)
  const [selectedArrondissement, setSelectedArrondissement] = useState('') // Admin level 3 (Arrondissement)
  const [adminOptions, setAdminOptions] = useState({ regions: [], departments: new Map(), arrondissements: new Map() })
  
  const [newPeople, setNewPeople] = useState({
    name: '',
    villageName: '',
    numberOfChurches: 0,
    churchGeneration: 0,
    engagementStatus: 'pioneer',
    engagementLevel: '',
    description: '',
    region: '',
    country: 'Cameroon',  // Default to Cameroon so new peoples appear on map (matches selectedCountries default)
    countryCode: 'CM',    // Country code for filtering
    population: 0,
  })

  // Handle ?lat=&lng=&zoom=&highlight= params from Analytics Dashboard
  useEffect(() => {
    const lat = parseFloat(searchParams.get('lat'))
    const lng = parseFloat(searchParams.get('lng'))
    const zoom = parseInt(searchParams.get('zoom')) || 12
    const highlight = searchParams.get('highlight')
    const search = searchParams.get('search')

    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenter([lat, lng])
      setMapZoom(zoom)
    }

    if (highlight) {
      // Set search filter to find the group by name
      setFilters(prev => ({ ...prev, search: highlight }))
      // We'll resolve the ID once data loads — see the effect below
    } else if (search) {
      setFilters(prev => ({ ...prev, search }))
    }
  }, [searchParams]) // only on mount / URL change

  // Fetch available villages for dropdown from multiple GeoJSON files
  // This provides villages from Cameroon (villages.geojson), Chad (VChad_polygons.geojson), and Congo (VCongoBrazza_Polygons.geojson)
  useEffect(() => {
    const fetchVillages = async () => {
      try {
        // Load villages from multiple GeoJSON sources
        const villageSources = [
          { url: '/data/villages.geojson', country: 'Cameroon' },
          { url: '/data/VChad_polygons.geojson', country: 'Chad' },
          { url: '/data/VCongoBrazza_Polygons.geojson', country: 'Congo' },
          { url: '/data/Villages découpés.geojson', country: 'Cameroon' }
        ]
        
        const allVillageNames = new Set() // Use Set to avoid duplicates
        
        // Fetch all village sources in parallel
        const fetchPromises = villageSources.map(async (source) => {
          try {
            const response = await fetch(source.url)
            if (response.ok) {
              const geoJsonData = await response.json()
              // Extract village names from GeoJSON features
              const names = geoJsonData.features
                ?.filter(f => f.properties?.name || f.properties?.NAME)
                .map(f => f.properties.name || f.properties.NAME)
                .filter(name => name && name.trim() !== '') || []
              
              console.log(`[MapView] Loaded ${names.length} villages from ${source.url} (${source.country})`)
              return names
            }
            return []
          } catch (err) {
            console.warn(`[MapView] Could not load villages from ${source.url}:`, err.message)
            return []
          }
        })
        
        const results = await Promise.all(fetchPromises)
        
        // Combine all village names into the Set
        results.forEach(names => {
          names.forEach(name => allVillageNames.add(name))
        })
        
        // Convert Set to sorted array
        const villageNames = Array.from(allVillageNames).sort((a, b) => a.localeCompare(b, 'fr'))
        
        console.log(`[MapView] Total unique villages loaded: ${villageNames.length}`)
        setAvailableVillages(villageNames)
        
        if (villageNames.length === 0) {
          // Fallback to API if no GeoJSON files available
          console.log('[MapView] No GeoJSON files available, falling back to API')
          const response = await peopleGroupsApi.getVillages()
          setAvailableVillages(response.data?.villages || [])
        }
      } catch (error) {
        console.error('Error fetching villages:', error)
        // Fallback to API on error
        try {
          const response = await peopleGroupsApi.getVillages()
          setAvailableVillages(response.data?.villages || [])
        } catch (apiError) {
          console.error('Error fetching villages from API:', apiError)
        }
      }
    }
    fetchVillages()
  }, [])

  // Pagination progress state for loading indicator
  const [paginationProgress, setPaginationProgress] = useState(null)
  const abortControllerRef = useRef(null)

  // Fetch peoples with React Query - filtered by geographic selection
  // People groups are shown ONLY when a geographic area is selected (country, region, department, or arrondissement)
  // 
  // PERFORMANCE NOTE: Using getAllWithGeometryPaginated() because this is a MAP component
  // that needs polygon/geometry data for rendering markers and spatial features.
  // Pagination automatically fetches all pages with progress tracking.
  // For list/table views, use getAll() which excludes geometry (~90% smaller payload).
  // Query key includes 'withGeometry' to ensure separate caching from list views.
  const { data: peoplesData, isLoading: isFullLoading, isError, error, refetch } = useQuery({
    queryKey: ['peopleGroupsForMap', mapMode === 'coverage' ? 'noGeometry' : 'withGeometry', selectedCountries, selectedRegion, selectedDepartment, selectedArrondissement],
    queryFn: async () => {
      // Build query params based on geographic selection
      const filters = {}
      
      // Add country filter only when countries are selected (empty = fetch all)
      if (selectedCountries.length > 0) {
        filters.countryCode = selectedCountries.join(',')
      }
      
      // Add region filter (admin1)
      if (selectedRegion) {
        filters.region = selectedRegion
      }
      
      // Add department filter (admin2)
      if (selectedDepartment) {
        filters.admin2 = selectedDepartment
      }
      
      // Add arrondissement filter (admin3)
      if (selectedArrondissement) {
        filters.admin3 = selectedArrondissement
      }
      
      // PERF: in coverage mode the markers are hidden and CoverageLayer only
      // needs lat/lng + engagementStatus to color polygons via point-in-polygon.
      // Skip the heavy `polygon` field on the server (~90% smaller payload).
      const useLightweight = mapMode === 'coverage'
      console.log(`[MapView] Fetching people groups (${useLightweight ? 'NO geometry — coverage mode' : 'WITH geometry'}):`, filters)
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()
      
      // Reset progress
      setPaginationProgress({ page: 0, totalPages: 1, recordsFetched: 0, totalCount: 0, isComplete: false })
      
      try {
        // Use paginated fetch with progress tracking. Lightweight variant
        // (without polygon field) is used in coverage mode for speed.
        const fetcher = useLightweight
          ? peopleGroupsApi.getAllPaginated
          : peopleGroupsApi.getAllWithGeometryPaginated
        const allData = await fetcher(filters, {
          onProgress: (progress) => {
            setPaginationProgress(progress)
            console.log(`[MapView] Pagination progress: Page ${progress.page}/${progress.totalPages}, ${progress.recordsFetched}/${progress.totalCount} records`)
          },
          signal: abortControllerRef.current.signal
        })
        
        // Clear progress when complete
        setPaginationProgress(null)
        return allData
      } catch (err) {
        setPaginationProgress(null)
        if (err.message === 'Fetch cancelled') {
          return [] // Return empty on cancellation
        }
        throw err
      }
    },
    staleTime: 30000,
    retry: 2,
    enabled: true, // Always fetch - when no countries selected, fetch all
  })

  // People groups data - filtered by geographic selection
  const peoples = useMemo(() => {
    return peoplesData || []
  }, [peoplesData])

  // Once peoples data is loaded, find the highlighted group by name and select it
  useEffect(() => {
    const highlight = searchParams.get('highlight')
    if (!highlight || peoples.length === 0) return

    const match = peoples.find(p =>
      p.name?.toLowerCase() === highlight.toLowerCase()
    )
    if (match) {
      setHighlightedPeopleId(match._id)
      setSelectedPeople(match._id)
      if (match.location?.coordinates?.length >= 2) {
        setMapCenter([match.location.coordinates[1], match.location.coordinates[0]])
      }
      // Auto-clear highlight after 8 seconds
      const timer = setTimeout(() => setHighlightedPeopleId(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [peoples, searchParams])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Extract unique regions from people groups data for filter dropdowns
  useEffect(() => {
    if (peoplesData && peoplesData.length > 0) {
      const regions = new Set()
      const departments = new Map() // Map<region, Set<department>>
      const arrondissements = new Map() // Map<department, Set<arrondissement>>
      
      peoplesData.forEach(pg => {
        // Extract region (admin1)
        const region = pg.region || pg.admin1
        if (region) {
          regions.add(region)
          
          // Extract department (admin2)
          const dept = pg.admin2 || pg.department
          if (dept) {
            if (!departments.has(region)) {
              departments.set(region, new Set())
            }
            departments.get(region).add(dept)
            
            // Extract arrondissement (admin3)
            const arr = pg.admin3 || pg.arrondissement
            if (arr) {
              if (!arrondissements.has(dept)) {
                arrondissements.set(dept, new Set())
              }
              arrondissements.get(dept).add(arr)
            }
          }
        }
      })
      
      setAdminOptions({
        regions: Array.from(regions).sort(),
        departments,
        arrondissements
      })
    }
  }, [peoplesData])

  // Reset child filters when parent filter changes
  const handleRegionChange = useCallback((region) => {
    setSelectedRegion(region)
    setSelectedDepartment('')
    setSelectedArrondissement('')
  }, [])

  const handleDepartmentChange = useCallback((department) => {
    setSelectedDepartment(department)
    setSelectedArrondissement('')
  }, [])

  const handleResetGeoFilters = useCallback(() => {
    setSelectedRegion('')
    setSelectedDepartment('')
    setSelectedArrondissement('')
  }, [])

  // Loading state
  const isInitialLoading = isFullLoading

  const createPeopleMutation = useMutation({
    mutationFn: (data) => peopleGroupsApi.create(data),
    onSuccess: () => {
      // Invalidate React Query cache to refresh the list
      queryClient.invalidateQueries(['peopleGroups'])
      queryClient.invalidateQueries(['peopleGroupsWithGeometry'])
      toast.success(t('peopleMap.addSuccess'))
      resetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('peopleMap.addError'))
    },
  })

  // Delete mutation for people groups
  const deletePeopleMutation = useMutation({
    mutationFn: (id) => peopleGroupsApi.delete(id),
    onSuccess: () => {
      // Invalidate React Query cache to refresh the list
      queryClient.invalidateQueries(['peopleGroups'])
      queryClient.invalidateQueries(['peopleGroupsWithGeometry'])
      toast.success(t('peopleMap.deleteSuccess'))
      setDeleteConfirm(null)
      setSelectedPeople(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('peopleMap.deleteError'))
    },
  })

  // Handle delete confirmation
  const handleDeleteClick = (e, people) => {
    e.stopPropagation() // Prevent triggering the parent click
    setDeleteConfirm({ id: people._id, name: people.name })
  }

  const handleConfirmDelete = () => {
    if (deleteConfirm?.id) {
      deletePeopleMutation.mutate(deleteConfirm.id)
    }
  }

  const resetForm = () => {
    setShowAddModal(false)
    setIsAddingPeople(false)
    setNewPeopleCoords(null)
    setVillageSearchTerm('') // Reset village search term
    setShowVillageDropdown(false) // Close village dropdown
    setDataType('organization')
    setNewPeople({
      name: '',
      villageName: '',
      numberOfChurches: 0,
      churchGeneration: 0,
      engagementStatus: 'pioneer',
      engagementLevel: '',
      description: '',
      region: '',
      country: 'Cameroon',  // Default to Cameroon so new peoples appear on map
      countryCode: 'CM',    // Country code for filtering
      population: 0,
    })
  }

  const handleMapClick = (latlng) => {
    setNewPeopleCoords(latlng)
    setShowAddModal(true)
  }

  const handleAddPeople = (e) => {
    e.preventDefault()
    if (!newPeopleCoords) return
    const source = dataType === 'survey' ? 'Survey' : 'DMM'
    createPeopleMutation.mutate({
      ...newPeople,
      numberOfChurches: parseInt(newPeople.numberOfChurches) || 0,
      churchGeneration: parseInt(newPeople.churchGeneration) || 0,
      population: parseInt(newPeople.population) || 0,
      location: { type: 'Point', coordinates: [newPeopleCoords.lng, newPeopleCoords.lat] },
      source,
    })
  }

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setMapCenter([position.coords.latitude, position.coords.longitude]),
        () => toast.error(t('peopleMap.locationError') || "Unable to get your location")
      )
    }
  }

  const handleFitAllMarkers = () => {
    setFitAllTrigger(prev => prev + 1)
  }

  const handlePeopleClick = (people) => {
    setSelectedPeople(people._id)
    if (people?.location?.coordinates && people.location.coordinates.length >= 2) {
      setMapCenter([people.location.coordinates[1], people.location.coordinates[0]])
    }
  }

  // Debug: Log data sources breakdown
  useEffect(() => {
    if (peoples.length > 0) {
      const jpCount = peoples.filter(p => p.source === 'Joshua Project').length
      const manualCount = peoples.filter(p => !p.source || p.source === 'manual' || p.source === 'DMM').length
      const withCoords = peoples.filter(p => 
        p?.location?.coordinates && 
        Array.isArray(p.location.coordinates) && 
        p.location.coordinates.length >= 2 &&
        !(p.location.coordinates[0] === 0 && p.location.coordinates[1] === 0)
      ).length
      console.log(`[MapView] Total people groups: ${peoples.length}`)
      console.log(`[MapView] Joshua Project: ${jpCount}, Manual: ${manualCount}`)
      console.log(`[MapView] With valid coordinates: ${withCoords}`)
      
      // Log first few JP entries for debugging
      const jpSample = peoples.filter(p => p.source === 'Joshua Project').slice(0, 3)
      if (jpSample.length > 0) {
        console.log('[MapView] Sample Joshua Project entries:', jpSample.map(p => ({
          name: p.name,
          coords: p.location?.coordinates,
          status: p.engagementStatus,
          approved: p.approved
        })))
      }
    }
  }, [peoples])
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOCKET.IO REAL-TIME UPDATES
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    console.log('[MapView] Setting up Socket.IO listeners for real-time updates')
    
    // Initialize socket if not already connected
    const token = localStorage.getItem('token')
    initSocket(token)
    
    // Subscribe to people group updates
    const unsubscribe = subscribeToPeopleGroupUpdates((event) => {
      console.log('[MapView] 📍 People group update received:', event.type)
      
      // On any update event, invalidate the query to refetch
      if (event.type === 'added' || event.type === 'updated' || event.type === 'deleted') {
        console.log('[MapView] Invalidating queries due to real-time update')
        queryClient.invalidateQueries({ queryKey: ['peopleGroups'] })
        queryClient.invalidateQueries({ queryKey: ['peopleGroupsWithGeometry'] })
      }
    })
    
    // Cleanup on unmount
    return () => {
      console.log('[MapView] Cleaning up Socket.IO listeners')
      unsubscribe()
    }
  }, [queryClient])
  
  // Filter peoples based on search, engagement status, and source
  // Geographic filtering (country/region/department/arrondissement) is done server-side
  const filteredPeoples = peoples.filter(people => {
    // NOTE: We no longer filter out people without coordinates here.
    // People without valid coordinates will still appear in the sidebar list,
    // but map markers are filtered separately to only show those with coordinates.

    // Filter by source (Joshua Project vs Survey vs DMM)
    // The source field indicates data origin:
    // - 'Joshua Project' = data from Joshua Project database
    // - 'Survey' = data from survey imports
    // - 'DMM' or 'manual' or null = manually entered DMM data
    // This is separate from engagementStatus which can be 'dmm' for any source
    const isJoshuaProject = people.source === 'Joshua Project'
    const isSurvey = people.source === 'Survey'
    const isIMB = people.source === 'PeopleGroups.org'
    const isFTT = people.source === 'Finishing the Task'
    const isDMM = !people.source || people.source === 'DMM' || people.source === 'manual'
    
    if (isJoshuaProject && !showJoshuaProject) return false
    if (isSurvey && !showSurveyData) return false
    if (isIMB && !showIMB) return false
    if (isFTT && !showFTT) return false
    if (isDMM && !showDMMData) return false

    // Filter by search term
    const matchesSearch = !filters.search || 
      people.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      people.villageName?.toLowerCase().includes(filters.search.toLowerCase()) ||
      people.region?.toLowerCase().includes(filters.search.toLowerCase()) ||
      people.description?.toLowerCase().includes(filters.search.toLowerCase())
    
    // Filter by engagement status
    const matchesStatus = !filters.engagementStatus || people.engagementStatus === filters.engagementStatus
    
    return matchesSearch && matchesStatus
  })

  // Calculate stats - include unreached, Joshua Project, and Survey breakdown
  // Use filteredPeoples to show totals only for selected countries
  const stats = {
    total: filteredPeoples.length,
    unreached: filteredPeoples.filter(p => p.engagementStatus === 'unreached').length,
    pioneer: filteredPeoples.filter(p => p.engagementStatus === 'pioneer').length,
    midway: filteredPeoples.filter(p => p.engagementStatus === 'midway').length,
    tippingPoint: filteredPeoples.filter(p => p.engagementStatus === 'tipping-point').length,
    dmm: filteredPeoples.filter(p => p.engagementStatus === 'dmm').length,
    totalChurches: filteredPeoples.reduce((sum, p) => sum + (p.numberOfChurches || 0), 0),
    // Data source specific stats
    joshuaProject: filteredPeoples.filter(p => p.source === 'Joshua Project').length,
    surveySource: filteredPeoples.filter(p => p.source === 'Survey').length,
    imbSource: filteredPeoples.filter(p => p.source === 'PeopleGroups.org').length,
    fttSource: filteredPeoples.filter(p => p.source === 'Finishing the Task').length,
    dmmSource: filteredPeoples.filter(p => !p.source || p.source === 'DMM' || p.source === 'manual').length,
  }

  // Loading state - show full-screen loader for initial load
  if (isInitialLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('peopleMap.loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('peopleMap.loadError')}</h3>
          <p className="text-gray-600 mb-4">
            {error?.message || t('peopleMap.loadErrorDesc')}
          </p>
          <button onClick={() => refetch()} className="btn-primary">
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <style>{`
      @keyframes pulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.8);opacity:.15} }
      .sb-scroll { overflow-y:auto; scrollbar-width:thin; scrollbar-color:#e5e7eb transparent; }
      .sb-scroll::-webkit-scrollbar { width:3px; }
      .sb-scroll::-webkit-scrollbar-thumb { background:#e5e7eb; border-radius:99px; }
      .lbtn { display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border-radius:8px;
              font-size:12px;font-weight:500;border:1px solid transparent;
              transition:all .15s;cursor:pointer;background:transparent;color:#6b7280;text-align:left; }
      .lbtn:hover { background:#f9fafb; border-color:#e5e7eb; color:#374151; }
      .lbtn.on { border-color:currentColor; }
      .slabel { font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
                color:#9ca3af;padding:0 2px;margin:10px 0 3px;display:block; }
    `}</style>
    <div className="h-[calc(100vh-3.5rem)] relative flex overflow-hidden bg-neutral-50">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white shadow-lg z-[1001] overflow-hidden flex flex-col`}>
          {sidebarOpen && (
            <>
              {/* Sidebar Header */}
              <div className="px-3 pt-3 pb-2 border-b border-neutral-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-800 tracking-wide uppercase">Carte</span>
                  <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 sb-scroll px-3 py-2">

                {/* Search */}
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un peuple..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:bg-white transition-all"
                  />
                  {filters.search && (
                    <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Status + Country filters */}
                <div className="flex gap-1.5 mb-2">
                  <select
                    value={filters.engagementStatus}
                    onChange={e => setFilters(prev => ({ ...prev, engagementStatus: e.target.value }))}
                    className="flex-1 min-w-0 text-xs bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-300 text-neutral-700"
                  >
                    <option value="">Tous statuts</option>
                    <option value="unreached">Non-atteint</option>
                    <option value="pioneer">Pionnier</option>
                    <option value="midway">Mi-parcours</option>
                    <option value="tipping-point">Basculement</option>
                    <option value="dmm">Mouvement</option>
                  </select>
                </div>

                {/* COUCHES */}
                <span className="slabel">Couches</span>

                {/* Villages par statut DMM */}
                <button onClick={() => setShowVillageLayer(v => !v)}
                  className={`lbtn mb-1 ${showVillageLayer ? 'on text-emerald-700 bg-emerald-50' : ''}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="flex-1">Villages / statut DMM</span>
                  {showVillageLayer && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-auto">actif</span>}
                </button>

                {showVillageLayer && mapMode !== 'coverage' && (
                  <select
                    value={villageLayerCountry}
                    onChange={e => setVillageLayerCountry(e.target.value)}
                    className="ml-4 mb-1 w-[calc(100%-1.25rem)] text-[11px] bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 focus:outline-none text-neutral-600"
                  >
                    <option value="CM">Cameroun</option>
                    <option value="GA">Gabon</option>
                    <option value="TD">Tchad</option>
                    <option value="CG">Congo Brazzaville</option>
                    <option value="CF">Centrafrique</option>
                    <option value="GQ">Guinée Équatoriale</option>
                    <option value="CD">RD Congo</option>
                    <option value="RW">Rwanda</option>
                  </select>
                )}

                {/* Data sources */}
                {mapMode !== 'coverage' && (
                  <>
                    <button onClick={() => setShowDMMData(!showDMMData)}
                      className={`lbtn ${showDMMData ? 'on text-teal-700 bg-teal-50' : ''}`}>
                      <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="flex-1">Peuples DMM</span>
                      {showDMMData && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 ml-auto">actif</span>}
                    </button>
                    <button onClick={() => setShowSurveyData(!showSurveyData)}
                      className={`lbtn ${showSurveyData ? 'on text-blue-700 bg-blue-50' : ''}`}>
                      <span className="w-2 h-2 rounded bg-blue-400 flex-shrink-0" />
                      <span className="flex-1">Survey</span>
                      {showSurveyData && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 ml-auto">actif</span>}
                    </button>
                    <button onClick={() => setShowJoshuaProject(!showJoshuaProject)}
                      className={`lbtn ${showJoshuaProject ? 'on text-amber-700 bg-amber-50' : ''}`}>
                      <span className="w-2 h-2 bg-amber-400 rotate-45 flex-shrink-0" />
                      <span className="flex-1">Joshua Project</span>
                      {showJoshuaProject && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-auto">actif</span>}
                    </button>
                    <button onClick={() => setShowIMB(!showIMB)}
                      className={`lbtn ${showIMB ? 'on text-emerald-700 bg-emerald-50' : ''}`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="flex-1">IMB / PeopleGroups.org</span>
                      {showIMB && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-auto">actif</span>}
                    </button>
                    <button onClick={() => setShowFTT(!showFTT)}
                      className={`lbtn ${showFTT ? 'on text-violet-700 bg-violet-50' : ''}`}>
                      <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                      <span className="flex-1">Finishing the Task</span>
                      {showFTT && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 ml-auto">actif</span>}
                    </button>
                  </>
                )}

                {/* ANALYSES — mode stratégique */}
                {mapMode === 'strategic' && (
                  <>
                    <span className="slabel">Analyses</span>
                    <button onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`lbtn ${showHeatmap ? 'on text-orange-700 bg-orange-50' : ''}`}>
                      <span className="text-[11px]">🔥</span>
                      <span className="flex-1">Heatmap</span>
                      {showHeatmap && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 ml-auto">actif</span>}
                    </button>
                    <button onClick={() => setShowCorridor(!showCorridor)}
                      className={`lbtn ${showCorridor ? 'on text-violet-700 bg-violet-50' : ''}`}>
                      <span className="text-[11px]">🗺️</span>
                      <span className="flex-1">Corridor</span>
                      {showCorridor && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 ml-auto">actif</span>}
                    </button>
                  </>
                )}

                {/* Outils terrain */}
                {mapMode !== 'coverage' && (
                  <>
                    <span className="slabel">Outils</span>
                    <button onClick={() => setShowProximityAlert(v => !v)}
                      className={`lbtn ${showProximityAlert ? 'on text-teal-700 bg-teal-50' : ''}`}>
                      <Navigation size={12} className="flex-shrink-0" />
                      <span className="flex-1">Proximity Alert</span>
                      {showProximityAlert && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 ml-auto">actif</span>}
                    </button>
                  </>
                )}

                <div className="border-t border-neutral-100 my-2" />
                <span className="slabel">Peuples ({filteredPeoples?.length || 0})</span>

              </div>

              {/* Peoples List (scrolls within the same sb-scroll div above is closed here) */}
              {/* Peoples List */}
              <div className="flex-1 sb-scroll">
                {filteredPeoples.length === 0 ? (
                  <div className="py-8 text-center text-neutral-400">
                    <MapPin size={22} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs">{t('peopleMap.noPeopleFound') || 'Aucun résultat'}</p>
                  </div>
                ) : (
                  <div className="px-2 pb-2 space-y-0.5">
                    {filteredPeoples.map((people) => (
                      <button
                        key={people._id}
                        onClick={() => handlePeopleClick(people)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group ${
                          highlightedPeopleId === people._id
                            ? 'bg-indigo-50 border border-indigo-200'
                            : selectedPeople === people._id
                              ? 'bg-primary-50 border border-primary-100'
                              : 'hover:bg-neutral-50 border border-transparent'
                        }`}
                      >
                        <span className={`w-2 h-2 flex-shrink-0 rounded-full ${
                          engagementStatusColors[people.engagementStatus] || engagementStatusColors.pioneer
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-800 truncate leading-tight">{people.name}</p>
                          <p className="text-[10px] text-neutral-400 truncate">{people.villageName || '—'}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                            people.source === 'Joshua Project' ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'
                          }`}>
                            {people.source === 'Joshua Project' ? 'JP' : 'DMM'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer Stats compact */}
              <div className="flex-shrink-0 px-3 py-2 border-t border-neutral-100 bg-neutral-50/80">
                <div className="grid grid-cols-5 gap-0.5 text-center">
                  {[
                    { v: stats.unreached,    l: 'N.A.',  c: 'text-red-500' },
                    { v: stats.pioneer,      l: 'Pion.', c: 'text-orange-500' },
                    { v: stats.midway,       l: 'Mid.',  c: 'text-yellow-600' },
                    { v: stats.tippingPoint, l: 'Basc.', c: 'text-emerald-600' },
                    { v: stats.dmm,          l: 'DMM',   c: 'text-green-700' },
                  ].map((s, i) => (
                    <div key={i}>
                      <p className={`text-sm font-bold leading-tight ${s.c}`}>{s.v}</p>
                      <p className="text-[9px] text-neutral-400">{s.l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-neutral-400 mt-1 pt-1 border-t border-neutral-100">
                  <span><b className="text-amber-600">{stats.joshuaProject}</b> JP</span>
                  <span>{filteredPeoples.length} total</span>
                  <span><b className="text-teal-600">{stats.dmmSource}</b> DMM</span>
                </div>
              </div>

            </>
          )}
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-[1002] bg-white border border-neutral-200 shadow-md rounded-r-lg p-1 hover:bg-neutral-50 transition-all"
          style={{ left: sidebarOpen ? '288px' : '0' }}
        >
          {sidebarOpen
            ? <ChevronLeft size={14} className="text-neutral-500" />
            : <ChevronRight size={14} className="text-neutral-500" />}
        </button>

        {/* Map Container */}
        <div className="flex-1 relative">
          {/* Mode Toggle — centré en haut de la carte */}
          <MapModeToggle mode={mapMode} onChange={setMapMode} />

          {/* Légende Mode Couverture */}
          <CoverageLegend visible={mapMode === 'coverage'} />

          {/* Proximity Alert Panel — centré et bien positionné */}
          <ProximityAlert
            visible={showProximityAlert && mapMode !== 'coverage'}
            onEngaged={() => {
              setShowProximityAlert(false)
            }}
          />

          {/* Add People button (separate floating button, bottom-right above legend) */}
          <div className="absolute bottom-4 left-4 z-[1000]">
            <button 
              onClick={() => setIsAddingPeople(!isAddingPeople)} 
              className={`bg-white rounded-full shadow-lg border border-neutral-100 p-3 hover:bg-neutral-50 transition-all ${isAddingPeople ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`} 
              title={t('peopleMap.addPeople') || 'Add a people group'}
            >
              <Plus size={20} className={isAddingPeople ? 'text-primary-600' : ''} />
            </button>
          </div>

          {/* Add People Instructions */}
          {isAddingPeople && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] bg-primary-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
              <p className="flex items-center gap-2">
                <MapPin size={18} />
                {t('peopleMap.clickMapInstruction') || 'Click on the map to place the people group'}
                <button onClick={() => setIsAddingPeople(false)} className="ml-4 hover:bg-primary-700 p-1 rounded">
                  <X size={18} />
                </button>
              </p>
            </div>
          )}

          {/* Map */}
          <MapContainer 
            center={mapCenter} 
            zoom={3} 
            className="h-full w-full modern-map" 
            zoomControl={false}
            style={{ cursor: isAddingPeople ? 'crosshair' : 'grab' }}
          >
            <ModernTileLayer providerKey={tileLayerKey} />
            <MapClickHandler onMapClick={handleMapClick} isAddingPeople={isAddingPeople} />
            <FlyToLocation center={mapCenter} zoom={mapZoom} preserveZoom={mapZoom === null} />
            <FitAllMarkers peoples={filteredPeoples} trigger={fitAllTrigger} />

            {/* Modern map controls (zoom + fit + locate) */}
            <MapControls onFitData={handleFitAllMarkers} onLocateMe={handleLocateMe} />

            {/* Map Resize Handler */}
            <MapResizeHandler sidebarOpen={sidebarOpen} />

            {/* Village Status Layer — même logique que /geojson-map */}
            {showVillageLayer && mapMode !== 'coverage' && (
              <VillageStatusLayer
                villagesBoundaryData={villagesBoundaryData}
                adminBoundaryData={adminBoundaryData}
                visible={showVillageLayer}
                onStatusesLoaded={(data) => setVillageStatusStats(data?.statistics)}
                refreshTrigger={0}
                peopleGroups={filteredPeoples}
                selectedCountry={villageLayerCountry}
              />
            )}

            {/* Coverage Layer — Mode Couverture (Voronoï coloré par statut DMM) */}
            <CoverageLayer
              visible={mapMode === 'coverage'}
              countryCode={selectedCountries?.[0] || ''}
              peoples={filteredPeoples}
            />

            {/* Activity Heatmap Layer — mode stratégique uniquement */}
            <ActivityHeatmapLayer visible={mapMode === 'strategic' && showHeatmap} />

            {/* Corridor de percée — mode stratégique uniquement */}
            {mapMode === 'strategic' && showCorridor && (
              <CorridorWrapper
                visible={showCorridor}
                onClose={() => setShowCorridor(false)}
              />
            )}

            {/* Peoples Markers — clusterés, masqués en mode couverture */}
            {mapMode !== 'coverage' && (
              <MarkerClusterGroup
                key={`cluster-${mapMode}`}
                chunkedLoading
                spiderfyOnMaxZoom
                showCoverageOnHover={false}
                maxClusterRadius={60}
                iconCreateFunction={createClusterIcon}
              >
                {filteredPeoples
                  .filter(people => {
                    const coords = people?.location?.coordinates
                    if (!coords || !Array.isArray(coords) || coords.length < 2) return false
                    if (coords[0] === 0 && coords[1] === 0) return false
                    // En mode stratégique avec polygones de villages affichés,
                    // masquer les marqueurs Joshua Project (points bleus) car
                    // ils sont déjà représentés via les polygones colorés.
                    if (mapMode === 'strategic' && showVillageLayer && people.source === 'Joshua Project') {
                      return false
                    }
                    return true
                  })
                  .map((people) => (
                    <PeopleMarker
                      key={`${people._id}-${mapMode}`}
                      people={people}
                      onSelect={setSelectedPeople}
                      onDelete={handleDeleteClick}
                      onNavigate={navigate}
                      highlighted={highlightedPeopleId === people._id}
                      mapMode={mapMode}
                    />
                  ))}
              </MarkerClusterGroup>
            )}
            
            {/* New People Marker (when adding) */}
            {newPeopleCoords && (
              <Marker 
                position={[newPeopleCoords.lat, newPeopleCoords.lng]} 
                icon={createCustomIcon('#8b5cf6')} 
              />
            )}
          </MapContainer>

          {/* Modern legend (bottom-right, with live counts) */}
          <ModernLegend counts={stats} total={filteredPeoples.length} />

          {/* Floating filter panel (top-left) — modern replacement of in-sidebar filters */}
          <FilterPanel
            search={filters.search}
            onSearchChange={(v) => setFilters(prev => ({ ...prev, search: v }))}
            statusFilter={
              filters.engagementStatus
                ? new Set([
                    filters.engagementStatus === 'midway' ? 'mid-journey'
                    : filters.engagementStatus === 'dmm' ? 'movement'
                    : filters.engagementStatus,
                  ])
                : new Set()
            }
            onStatusToggle={(statusKey) => {
              const legacyMap = { 'mid-journey': 'midway', 'movement': 'dmm' }
              const legacy = legacyMap[statusKey] || statusKey
              setFilters(prev => ({
                ...prev,
                engagementStatus: prev.engagementStatus === legacy ? '' : legacy,
              }))
            }}
            sourceFilter={{
              dmm: showDMMData,
              survey: showSurveyData,
              joshuaProject: showJoshuaProject,
              imb: showIMB,
              ftt: showFTT,
            }}
            onSourceToggle={(stateKey) => {
              if (stateKey === 'dmm') setShowDMMData(v => !v)
              else if (stateKey === 'survey') setShowSurveyData(v => !v)
              else if (stateKey === 'joshuaProject') setShowJoshuaProject(v => !v)
              else if (stateKey === 'imb') setShowIMB(v => !v)
              else if (stateKey === 'ftt') setShowFTT(v => !v)
            }}
            country={selectedCountries[0] || ''}
            onCountryChange={(code) => setSelectedCountries(code ? [code] : [])}
            countries={AVAILABLE_COUNTRIES}
            onClearAll={() => {
              setFilters({ engagementStatus: '', search: '', countries: [] })
              setShowDMMData(true)
              setShowSurveyData(true)
              setShowJoshuaProject(true)
              setShowIMB(true)
              setShowFTT(true)
              setSelectedCountries([])
            }}
          />

          {/* Top-right floating cluster: tile-layer switcher + stats badge + add/locate/fit */}
          <div className="absolute top-3 right-3 z-[1000] flex items-start gap-2">
            <StatsBadge peopleCount={filteredPeoples.length} churchCount={stats.totalChurches} />
            <TileLayerSwitcher value={tileLayerKey} onChange={setTileLayerKey} t={t} />
          </div>

          {/* Loading skeleton (subtle overlay while data loads) */}
          <MapLoadingSkeleton visible={isInitialLoading} />

          {/* Empty State - show when no data and not in initial loading */}
          {filteredPeoples.length === 0 && !isInitialLoading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-white rounded-xl shadow-lg p-8 text-center">
              <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t('peopleMap.noPeopleFound') || 'No people found'}</h3>
              <p className="text-gray-600 mb-4">
                {filters.search || filters.engagementStatus 
                  ? (t('activities.empty.withFilters') || 'Try modifying your search filters.')
                  : (t('activities.empty.withoutFilters') || 'Start by adding your first people group on the map.')}
              </p>
              {(filters.search || filters.engagementStatus) && (
                <button 
                  onClick={() => setFilters({ engagementStatus: '', search: '' })}
                  className="btn-secondary mr-2"
                >
                  {t('peopleMap.clearFilters') || 'Clear filters'}
                </button>
              )}
              <button 
                onClick={() => setIsAddingPeople(true)}
                className="btn-primary"
              >
                <Plus size={18} className="inline mr-1" />
                {t('peopleMap.addPeople') || 'Add a people group'}
              </button>
            </div>
          )}
        </div>

        {/* Add People Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{t('peopleMap.newPeople') || 'New People Group'}</h3>
                <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddPeople} className="space-y-4">
                {/* Data Type Selection */}
                <div>
                  <label className="form-label">{t('peopleMap.dataType') || 'Data type'}</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setDataType('organization')}
                      className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                        dataType === 'organization'
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          dataType === 'organization' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            dataType === 'organization' ? 'text-blue-700' : 'text-gray-700'
                          }`}>{t('peopleMap.orgData') || 'Organization'}</p>
                          <p className={`text-xs ${
                            dataType === 'organization' ? 'text-blue-500' : 'text-gray-400'
                          }`}>{t('peopleMap.orgDataDesc') || 'Your org data'}</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDataType('survey')}
                      className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                        dataType === 'survey'
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          dataType === 'survey' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            dataType === 'survey' ? 'text-blue-700' : 'text-gray-700'
                          }`}>{t('peopleMap.surveyData') || 'Survey'}</p>
                          <p className={`text-xs ${
                            dataType === 'survey' ? 'text-blue-500' : 'text-gray-400'
                          }`}>{t('peopleMap.surveyDataDesc') || 'Survey data'}</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">{t('peopleMap.peopleName') || 'People group name'} *</label>
                  <input 
                    type="text" 
                    value={newPeople.name} 
                    onChange={(e) => setNewPeople((prev) => ({ ...prev, name: e.target.value }))} 
                    className="form-input" 
                    required 
                    placeholder="Ex: Peuple Bamiléké"
                  />
                </div>
                
                <div className="relative">
                  <label className="form-label">{t('peopleMap.village') || 'Village'}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={villageSearchTerm || newPeople.villageName} 
                      onChange={(e) => {
                        setVillageSearchTerm(e.target.value)
                        setShowVillageDropdown(true)
                        // If user clears the input, also clear the selected village
                        if (!e.target.value) {
                          setNewPeople((prev) => ({ ...prev, villageName: '' }))
                        }
                      }}
                      onFocus={() => setShowVillageDropdown(true)}
                      className="form-input pr-8" 
                      placeholder={t('peopleMap.searchVillage') || 'Search a village...'}
                    />
                    {(villageSearchTerm || newPeople.villageName) && (
                      <button
                        type="button"
                        onClick={() => {
                          setVillageSearchTerm('')
                          setNewPeople((prev) => ({ ...prev, villageName: '' }))
                          setShowVillageDropdown(false)
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  {/* Village Dropdown */}
                  {showVillageDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {/* Filter villages based on search term */}
                      {availableVillages
                        .filter(village => 
                          !villageSearchTerm || 
                          village.toLowerCase().includes(villageSearchTerm.toLowerCase())
                        )
                        .slice(0, 50) // Limit to 50 results for performance
                        .map((village, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setNewPeople((prev) => ({ ...prev, villageName: village }))
                              setVillageSearchTerm('')
                              setShowVillageDropdown(false)
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors ${
                              newPeople.villageName === village ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {village}
                          </button>
                        ))
                      }
                      
                      {/* No results message - Village must be selected from existing list */}
                      {villageSearchTerm && !availableVillages.some(v => v.toLowerCase().includes(villageSearchTerm.toLowerCase())) && (
                        <div className="px-3 py-2 text-sm text-amber-600 bg-amber-50 border-t">
                          <span className="flex items-center gap-2">
                            <AlertCircle size={14} />
                            {t('common.noResults') || 'No village found. Please select an existing village.'}
                          </span>
                        </div>
                      )}
                      
                      {/* No villages available */}
                      {availableVillages.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          {t('common.noResults') || 'No villages available'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Click outside to close dropdown */}
                  {showVillageDropdown && (
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowVillageDropdown(false)}
                    />
                  )}
                </div>

                <div>
                  <label className="form-label">{t('peopleMap.population') || 'Population'}</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newPeople.population} 
                    onChange={(e) => setNewPeople((prev) => ({ ...prev, population: e.target.value }))} 
                    className="form-input" 
                    placeholder="Ex: 50000"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('peopleMap.numberOfChurches') || 'Number of churches'}</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newPeople.numberOfChurches} 
                      onChange={(e) => setNewPeople((prev) => ({ ...prev, numberOfChurches: e.target.value }))} 
                      className="form-input" 
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('peopleMap.churchGeneration') || 'Church generation'}</label>
                    <input 
                      type="number" 
                      min="0"
                      value={newPeople.churchGeneration} 
                      onChange={(e) => setNewPeople((prev) => ({ ...prev, churchGeneration: e.target.value }))} 
                      className="form-input" 
                      placeholder="1, 2, 3..."
                    />
                  </div>
                </div>

                {/* Auto-calculated Status and Level Preview */}
                {(() => {
                  const calculated = calculateDmmStatus(newPeople.numberOfChurches, newPeople.churchGeneration)
                  return (
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-4 rounded-lg border border-primary-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">📊 {t('peopleMap.autoCalculatedStatus') || 'Auto-calculated status'}</span>
                        <span className="text-xs text-gray-500">({t('peopleMap.basedOnDMM') || 'based on DMM table'})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">{t('peopleMap.engagementStatus') || 'Engagement status'}</label>
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${engagementStatusColors[calculated.status]} bg-opacity-20`}>
                            <span className={`w-3 h-3 rounded-full ${engagementStatusColors[calculated.status]}`}></span>
                            <span className="font-semibold text-gray-800">{engagementStatusLabelsFr[calculated.status]}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">{t('peopleMap.engagementLevel') || 'Engagement level'}</label>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100">
                            <span className="font-semibold text-gray-800">{t('peopleMap.level') || 'Level'} {calculated.level}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {newPeople.numberOfChurches || 0} {t('peopleMap.churches') || 'churches'} × {newPeople.churchGeneration || 0} {t('peopleMap.generations') || 'generations'}
                      </p>
                    </div>
                  )
                })()}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">{t('peopleMap.region') || 'Region'}</label>
                    <input 
                      type="text" 
                      value={newPeople.region} 
                      onChange={(e) => setNewPeople((prev) => ({ ...prev, region: e.target.value }))} 
                      className="form-input" 
                    />
                  </div>
                  <div>
                    <label className="form-label">{t('peopleMap.country') || 'Country'}</label>
                    <input 
                      type="text" 
                      value={newPeople.country} 
                      onChange={(e) => setNewPeople((prev) => ({ ...prev, country: e.target.value }))} 
                      className="form-input" 
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">{t('peopleMap.description') || 'Description'}</label>
                  <textarea 
                    value={newPeople.description} 
                    onChange={(e) => setNewPeople((prev) => ({ ...prev, description: e.target.value }))} 
                    className="form-input" 
                    rows={3} 
                    placeholder={t('peopleMap.descriptionPlaceholder') || 'Additional information...'}
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  <p className="text-gray-600">
                    <MapPin size={14} className="inline mr-1" />
                    {t('peopleMap.coordinates') || 'Coordinates'}: {newPeopleCoords?.lat.toFixed(6)}, {newPeopleCoords?.lng.toFixed(6)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={resetForm} className="flex-1 btn-secondary">
                    {t('common.cancel') || 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    disabled={createPeopleMutation.isPending} 
                    className="flex-1 btn-primary"
                  >
                    {createPeopleMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="inline mr-1 animate-spin" />
                        {t('peopleMap.adding') || 'Adding...'}
                      </>
                    ) : (t('common.add') || 'Add')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">{t('peopleMap.deleteConfirmTitle') || 'Confirm deletion'}</h3>
              </div>
              <p className="text-gray-600 mb-6">
                {t('peopleMap.deleteConfirmMessage') || 'Are you sure you want to delete'} <strong className="text-gray-900">{deleteConfirm.name}</strong>?
                <br />
                <span className="text-sm text-gray-500 mt-2 block">
                  {t('peopleMap.deleteConfirmWarning') || 'This action is irreversible.'}
                </span>
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="flex-1 btn-secondary"
                  disabled={deletePeopleMutation.isPending}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={deletePeopleMutation.isPending}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletePeopleMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('common.loading') || 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      {t('common.delete') || 'Delete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
    </>
  )
}

export default MapView
