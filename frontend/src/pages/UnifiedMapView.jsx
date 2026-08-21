import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Rectangle, useMap, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { createPortal } from 'react-dom'
import {
  Loader2, Compass, Eye, Search, Moon, Sun, ChevronLeft, ChevronRight,
  BarChart3, Users, MapPin, Church, X, Minimize2, Map as MapIcon, Download,
  Target, RotateCcw, Layers, Info,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip } from 'recharts'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { masterPeopleApi } from '../services/api'
import MasterPeopleLayer from '../components/Map/MasterPeopleLayer'
import DmmLayers, { POP_STATUS, DG_STATUS } from '../components/Map/DmmLayers'
import { getCountryConfig, SUPPORTED_COUNTRIES } from '../config/supportedCountries'
import { VORONOI_ZOOM_CONFIG, getVoronoiLevelForZoom } from '../config/countryConfig'

/**
 * UnifiedMapView — "one people group = one marker" canonical map.
 *
 * Backed by the Master People API (/api/master-people). Joshua Project and
 * IMB/PeopleGroups.org (CPPI) records that describe the same ethnic group are
 * merged into a single marker; the detail panel shows every contributing source.
 * Source toggles hide a source's ATTRIBUTES without removing the marker when
 * another source remains.
 */
const ALL_SOURCES = ['JP', 'CPPI', 'DMM', 'FTT', 'SURVEY']
const SOURCE_LABELS = {
  JP: 'Joshua Project',
  CPPI: 'IMB / PeopleGroups.org',
  DMM: 'DMM',
  FTT: 'Finishing the Task',
  SURVEY: 'Survey',
}
const STATUS_LABELS = {
  UNREACHED: 'Non atteint',
  FRONTIER: 'Frontier',
  MINIMALLY_REACHED: 'Peu atteint',
  REACHED: 'Atteint',
  UNKNOWN: 'Inconnu',
}
const STATUS_COLORS = {
  UNREACHED: '#ef4444',
  FRONTIER: '#b91c1c',
  MINIMALLY_REACHED: '#f97316',
  REACHED: '#15803d',
  UNKNOWN: '#9ca3af',
}

// ── Coverage mode (mode couverture) — porté depuis MapView.jsx ───────────────
const STATUS_COLORS_FILL = {
  'dmm':            { fill: '#15803d', stroke: '#166534', label: 'Mouvement' },
  'tipping-point':  { fill: '#22c55e', stroke: '#16a34a', label: 'Basculement' },
  'midway':         { fill: '#eab308', stroke: '#ca8a04', label: 'Mi-parcours' },
  'pioneer':        { fill: '#f97316', stroke: '#ea580c', label: 'Pionnier' },
  'unreached':      { fill: '#ef4444', stroke: '#dc2626', label: 'Non-atteint' },
  'unknown':        { fill: '#e5e7eb', stroke: '#d1d5db', label: 'Inconnu' },
}

// Le modèle "master people" utilise UNREACHED/FRONTIER/... — on le convertit
// vers le vocabulaire DMM attendu par STATUS_COLORS_FILL / buildLocalCoverageMap.
const STATUS_TO_COVERAGE = {
  UNREACHED: 'unreached',
  FRONTIER: 'pioneer',
  MINIMALLY_REACHED: 'midway',
  REACHED: 'dmm',
  UNKNOWN: 'unknown',
}

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
const CoverageLayer = ({ visible, countryCode, peoples, levelOverride }) => {
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

  const level = levelOverride || getVoronoiLevelForZoom(zoom)

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
const CoverageLegend = ({ visible, theme }) => {
  if (!visible) return null
  return (
    <div className={`absolute bottom-20 right-4 z-[1001] rounded-xl shadow-lg p-3 ${panelCls(theme)}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${subtleText(theme)}`}>Couverture DMM</p>
      {Object.entries(STATUS_COLORS_FILL)
        .filter(([k]) => k !== 'unknown')
        .map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-2 mb-1.5">
            <div className="w-4 h-3 rounded-sm flex-shrink-0" style={{ background: cfg.fill, opacity: 0.85 }} />
            <span className="text-xs">{cfg.label}</span>
          </div>
        ))}
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-black/10">
        <div className="w-4 h-3 rounded-sm flex-shrink-0 bg-gray-300" />
        <span className={`text-xs ${subtleText(theme)}`}>Non renseigné</span>
      </div>
    </div>
  )
}

// ── Légende couches DMM (Personnes de paix / Groupes DBS) ─────────────────────
// Affichée uniquement quand la couche correspondante est active.
const DmmLegend = ({ showPersonsOfPeace, showDiscoveryGroups, theme }) => {
  if (!showPersonsOfPeace && !showDiscoveryGroups) return null
  return (
    <div className={`absolute bottom-20 right-4 z-[1001] w-52 max-h-[60vh] overflow-y-auto rounded-xl shadow-lg p-3 ${panelCls(theme)}`}>
      {showPersonsOfPeace && (
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${subtleText(theme)}`}>Personnes de paix</p>
          {Object.entries(POP_STATUS).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white shadow-sm" style={{ background: cfg.color }} />
              <span className="text-xs">{cfg.label}</span>
            </div>
          ))}
        </div>
      )}
      {showDiscoveryGroups && (
        <div className={showPersonsOfPeace ? 'mt-2 pt-2 border-t border-black/10' : ''}>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${subtleText(theme)}`}>Groupes de découverte (DBS)</p>
          {Object.entries(DG_STATUS).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-2 mb-1.5">
              <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white shadow-sm" style={{ background: cfg.color }} />
              <span className="text-xs">{cfg.label}</span>
            </div>
          ))}
          <p className={`text-[10px] mt-1 pt-1 border-t border-black/10 leading-snug ${subtleText(theme)}`}>
            La taille du marqueur augmente avec la génération (Gn).
          </p>
        </div>
      )}
    </div>
  )
}

// ── Niveaux administratifs (mode couverture) ─────────────────────────────────
const LEVEL_LABELS = {
  region: 'Région',
  departement: 'Département',
  arrondissement: 'Arrondissement',
  village: 'Village',
}

// ── Map Mode Toggle (Terrain / Stratégique / Couverture) ─────────────────────
const MapModeToggle = ({ mode, onChange, theme }) => (
  <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-[1001] flex rounded-full shadow-md p-0.5 gap-0.5 ${panelCls(theme)}`}>
    {[
      { key: 'terrain',   icon: Compass, label: 'Terrain',     active: 'text-teal-700 bg-teal-50' },
      { key: 'strategic', icon: Target,  label: 'Stratégique', active: 'text-indigo-700 bg-indigo-50' },
      { key: 'coverage',  icon: Eye,     label: 'Couverture',  active: 'text-emerald-700 bg-emerald-50' },
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

// ── Utils ────────────────────────────────────────────────────────────────────
const formatCompact = (n) => {
  const num = Number(n) || 0
  if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + ' Md'
  if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + ' M'
  if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + ' k'
  return String(num)
}

// ── Theming ──────────────────────────────────────────────────────────────────
const THEME_TILES = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
}
const panelCls = (theme) =>
  theme === 'dark'
    ? 'bg-neutral-900/95 text-neutral-100 border border-neutral-700 backdrop-blur'
    : 'bg-white/95 text-gray-800 border border-neutral-100 backdrop-blur'
const subtleText = (theme) => (theme === 'dark' ? 'text-neutral-400' : 'text-gray-500')
const inputCls = (theme) =>
  theme === 'dark'
    ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
    : 'bg-white border-gray-300 text-gray-800'

// ── Theme toggle ─────────────────────────────────────────────────────────────
const ThemeToggle = ({ theme, onToggle }) => (
  <button
    onClick={onToggle}
    title={theme === 'dark' ? 'Passer en clair' : 'Passer en sombre'}
    className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
      theme === 'dark'
        ? 'bg-neutral-800 text-amber-300 hover:bg-neutral-700'
        : 'bg-white text-neutral-600 hover:bg-neutral-100'
    }`}
  >
    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
  </button>
)

// ── Search box (peuples) ─────────────────────────────────────────────────────
const SearchBox = ({ markers, onPick, theme }) => {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return []
    const out = []
    for (const m of markers) {
      if ((m.name || '').toLowerCase().includes(term)) out.push(m)
      if (out.length >= 8) break
    }
    return out
  }, [q, markers])
  return (
    <div className="relative">
      <div className={`flex h-9 items-center gap-2 rounded-full px-3 shadow-md ${panelCls(theme)}`}>
        <Search size={15} className={subtleText(theme)} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Rechercher un peuple…"
          className="w-36 bg-transparent text-sm outline-none placeholder:text-neutral-400 sm:w-56"
        />
        {q && (
          <button onMouseDown={() => { setQ(''); setOpen(false) }} className={subtleText(theme)}>
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className={`absolute right-0 z-[1200] mt-2 max-h-72 w-64 overflow-y-auto rounded-xl shadow-xl ${panelCls(theme)}`}>
          {results.map((m) => (
            <button
              key={m.id}
              onMouseDown={() => { onPick(m); setQ(m.name); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5"
            >
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: STATUS_COLORS[m.status] || STATUS_COLORS.UNKNOWN }}
              />
              <span className="flex-1 truncate">{m.name}</span>
              <span className={`text-[10px] ${subtleText(theme)}`}>{m.country || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── KPI cards ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon: Icon, label, value, color, theme }) => (
  <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-sm ${panelCls(theme)}`}>
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md" style={{ background: `${color}1a`, color }}>
      <Icon size={13} />
    </div>
    <div className="min-w-0 leading-tight">
      <div className="text-xs font-bold">{value}</div>
      <div className={`text-[9px] uppercase tracking-wide ${subtleText(theme)}`}>{label}</div>
    </div>
  </div>
)

const KpiBar = ({ stats, theme }) => (
  <div className="absolute top-16 right-4 z-[1000] hidden w-40 flex-col gap-1.5 sm:flex">
    <KpiCard icon={Users} label="Peuples" value={stats.total.toLocaleString('fr-FR')} color="#6366f1" theme={theme} />
    <KpiCard icon={MapPin} label="Non atteints" value={stats.unreached.toLocaleString('fr-FR')} color="#ef4444" theme={theme} />
    <KpiCard icon={Church} label="Atteints" value={stats.reached.toLocaleString('fr-FR')} color="#15803d" theme={theme} />
    <KpiCard icon={BarChart3} label="Population" value={formatCompact(stats.population)} color="#0ea5e9" theme={theme} />
  </div>
)

// ── Status distribution chart ────────────────────────────────────────────────
const StatusChart = ({ data, theme }) => {
  if (!data || !data.length) return null
  return (
    <div className="mt-3 border-t pt-2" style={{ borderColor: theme === 'dark' ? '#404040' : '#e5e7eb' }}>
      <p className={`mb-1 text-xs font-semibold ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-600'}`}>
        Répartition par statut
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
            {data.map((d) => <Cell key={d.key} fill={d.color} />)}
          </Pie>
          <ReTooltip formatter={(v, n) => [Number(v).toLocaleString('fr-FR'), n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
        {data.map((d) => (
          <div key={d.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="truncate">{d.name}</span>
            <span className={`ml-auto ${subtleText(theme)}`}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mini-map (overview) ──────────────────────────────────────────────────────
const MiniViewport = ({ mainMap }) => {
  const [bounds, setBounds] = useState(null)
  useEffect(() => {
    if (!mainMap) return undefined
    const update = () => setBounds(mainMap.getBounds())
    update()
    mainMap.on('moveend zoomend', update)
    return () => mainMap.off('moveend zoomend', update)
  }, [mainMap])
  useMapEvents({
    click(e) { if (mainMap) mainMap.setView(e.latlng, mainMap.getZoom(), { animate: true }) },
  })
  if (!bounds) return null
  return (
    <Rectangle
      bounds={bounds}
      pathOptions={{ color: '#6366f1', weight: 2, fillColor: '#6366f1', fillOpacity: 0.15 }}
    />
  )
}

const OverviewMiniMap = ({ mainMap, theme, collapsed, onToggle }) => {
  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        title="Afficher la mini-carte"
        className={`absolute bottom-6 right-4 z-[1000] flex h-9 w-9 items-center justify-center rounded-lg shadow-lg ${panelCls(theme)}`}
      >
        <MapIcon size={18} />
      </button>
    )
  }
  return (
    <div
      className={`absolute bottom-6 right-4 z-[1000] overflow-hidden rounded-xl shadow-xl ${panelCls(theme)}`}
      style={{ width: 200 }}
    >
      <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold">
        <span>Vue d'ensemble</span>
        <button onClick={onToggle} title="Réduire"><Minimize2 size={13} /></button>
      </div>
      <div style={{ width: 200, height: 140 }}>
        <MapContainer
          center={[7, 20]}
          zoom={2}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          boxZoom={false}
          keyboard={false}
          touchZoom={false}
        >
          <TileLayer key={theme} url={THEME_TILES[theme].url} attribution="" />
          <MiniViewport mainMap={mainMap} />
        </MapContainer>
      </div>
    </div>
  )
}

// ── Export helpers ───────────────────────────────────────────────────────────
const csvEscape = (v) => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
const buildCsv = (rows) => {
  const headers = ['name', 'country', 'status', 'population', 'sources', 'lng', 'lat']
  const lines = [headers.join(',')]
  for (const m of rows) {
    lines.push([
      m.name,
      m.country,
      m.status,
      m.population || 0,
      (m.sourceTypes || []).join('|'),
      m.coordinates?.[0] ?? '',
      m.coordinates?.[1] ?? '',
    ].map(csvEscape).join(','))
  }
  return lines.join('\n')
}
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
const exportPng = async (mapInstance) => {
  if (!mapInstance) return
  const el = mapInstance.getContainer()
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(el, { useCORS: true, backgroundColor: null, logging: false })
  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `carte-peuples-${new Date().toISOString().slice(0, 10)}.png`)
      resolve()
    }, 'image/png')
  })
}

// ── Export menu ──────────────────────────────────────────────────────────────
const ExportMenu = ({ markers, mapInstance, theme }) => {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const doCsv = () => {
    const csv = '\ufeff' + buildCsv(markers)
    downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `peuples-visibles-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    setOpen(false)
  }
  const doPng = async () => {
    setBusy(true)
    try { await exportPng(mapInstance) } catch (e) { console.error(e) } finally { setBusy(false); setOpen(false) }
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        title="Exporter"
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md ${panelCls(theme)}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
      </button>
      {open && (
        <div className={`absolute right-0 z-[1200] mt-2 w-52 overflow-hidden rounded-xl shadow-xl ${panelCls(theme)}`}>
          <button
            onMouseDown={doPng}
            disabled={!mapInstance || busy}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 disabled:opacity-50"
          >
            <MapIcon size={14} /> Exporter la carte (PNG)
          </button>
          <button
            onMouseDown={doCsv}
            disabled={!markers.length}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-black/5 disabled:opacity-50"
          >
            <BarChart3 size={14} /> Exporter les données ({markers.length} · CSV)
          </button>
        </div>
      )}
    </div>
  )
}

// ── Top 5 pays (peuples non atteints) ────────────────────────────────────────
const TopCountries = ({ data, theme }) => {
  if (!data || !data.length) return null
  const max = data[0].count || 1
  return (
    <div className="mt-3 border-t pt-2" style={{ borderColor: theme === 'dark' ? '#404040' : '#e5e7eb' }}>
      <p className={`mb-1.5 text-xs font-semibold ${theme === 'dark' ? 'text-neutral-300' : 'text-gray-600'}`}>
        Top 5 pays · peuples non atteints
      </p>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={d.code} className="flex items-center gap-2 text-[11px]">
            <span className="w-4 text-right tabular-nums opacity-60">{i + 1}</span>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center justify-between">
                <span className="truncate">{d.label}</span>
                <span className="ml-2 font-semibold">{d.count.toLocaleString('fr-FR')}</span>
              </div>
              <div className={`h-1.5 w-full rounded-full ${theme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100'}`}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${Math.max(6, (d.count / max) * 100)}%`, background: '#ef4444' }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UnifiedMapView() {
  const [activeSources, setActiveSources] = useState(() => new Set(ALL_SOURCES))
  const [statusFilter, setStatusFilter] = useState('')
  // Couches DMM (Pilier ① Cartographie)
  const [showPersonsOfPeace, setShowPersonsOfPeace] = useState(false)
  const [showDiscoveryGroups, setShowDiscoveryGroups] = useState(false)
  const [selected, setSelected] = useState(null)
  const [mapMode, setMapMode] = useState('terrain') // 'terrain' | 'coverage'
  // Thème clair/sombre (persisté).
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('unifiedMap.theme') || 'light' } catch { return 'light' }
  })
  useEffect(() => {
    try { localStorage.setItem('unifiedMap.theme', theme) } catch { /* noop */ }
  }, [theme])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [miniMapOpen, setMiniMapOpen] = useState(true)
  const [mapInstance, setMapInstance] = useState(null)
  const [levelOverride, setLevelOverride] = useState(null) // null = auto (zoom)
  const [showInfoBubble, setShowInfoBubble] = useState(true)
  const [showKpis, setShowKpis] = useState(true)
  const [detailTab, setDetailTab] = useState('apercu')
  // Pays sélectionné, PARTAGÉ entre le mode terrain et le mode couverture.
  // '' = tous les pays (terrain) ; sinon un code ISO alpha-3.
  // Pays actif restauré depuis localStorage ; Cameroun (CMR) par défaut.
  const [selectedCountry, setSelectedCountry] = useState(() => {
    try {
      const saved = localStorage.getItem('unifiedMap.selectedCountry')
      // '' est une valeur valide (« Tous les pays »), donc on teste null explicitement.
      return saved !== null ? saved : 'CMR'
    } catch {
      return 'CMR'
    }
  })
  // Mémorise le pays sélectionné pour le restaurer à la prochaine ouverture.
  useEffect(() => {
    try {
      localStorage.setItem('unifiedMap.selectedCountry', selectedCountry)
    } catch { /* localStorage indisponible */ }
  }, [selectedCountry])
  // Le mode couverture exige un pays concret disposant de fonds admin ; on se
  // rabat sur CMR si le pays courant n'en a pas (ex. « Tous les pays »).
  const coverageCountry = COUNTRY_DATA_FILES[selectedCountry] ? selectedCountry : 'CMR'

  // Fetch all markers once; toggles filter client-side for instant response.
  const { data, isLoading, error } = useQuery({
    queryKey: ['master-people-markers'],
    queryFn: async () => (await masterPeopleApi.getMarkers({ limit: 20000 })).data,
    staleTime: 5 * 60 * 1000,
  })

  const markers = useMemo(() => {
    let arr = data?.markers || []
    if (statusFilter) arr = arr.filter((m) => m.status === statusFilter)
    if (selectedCountry) arr = arr.filter((m) => m.country === selectedCountry)
    return arr
  }, [data, statusFilter, selectedCountry])

  // Liste des pays réellement présents dans les marqueurs (code ISO alpha-3).
  // On affiche un nom FR pour les pays supportés, sinon le code brut.
  const availableCountries = useMemo(() => {
    const set = new Set()
    for (const m of data?.markers || []) if (m.country) set.add(m.country)
    if (selectedCountry) set.add(selectedCountry) // garde l'option courante même sans marqueurs
    const label = (code) => SUPPORTED_COUNTRIES[code]?.nameFr || code
    return [...set]
      .map((code) => ({ code, label: label(code) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data, selectedCountry])

  const sourceVisibleMarkers = useMemo(
    () => markers.filter((m) => (m.sourceTypes || []).some((t) => activeSources.has(t))),
    [markers, activeSources]
  )
  const visibleCount = sourceVisibleMarkers.length

  // KPI + répartition par statut (calculés sur les marqueurs visibles).
  const stats = useMemo(() => {
    let unreached = 0, reached = 0, population = 0
    for (const m of sourceVisibleMarkers) {
      population += m.population || 0
      if (m.status === 'UNREACHED' || m.status === 'FRONTIER') unreached += 1
      else if (m.status === 'REACHED') reached += 1
    }
    return { total: sourceVisibleMarkers.length, unreached, reached, population }
  }, [sourceVisibleMarkers])

  const statusChartData = useMemo(() => {
    const counts = {}
    for (const m of sourceVisibleMarkers) {
      const s = m.status || 'UNKNOWN'
      counts[s] = (counts[s] || 0) + 1
    }
    return Object.entries(counts)
      .map(([key, value]) => ({
        key,
        value,
        name: STATUS_LABELS[key] || key,
        color: STATUS_COLORS[key] || STATUS_COLORS.UNKNOWN,
      }))
      .sort((a, b) => b.value - a.value)
  }, [sourceVisibleMarkers])

  // Top 5 pays par nombre de peuples non atteints (UNREACHED + FRONTIER).
  const topUnreachedCountries = useMemo(() => {
    const counts = {}
    for (const m of sourceVisibleMarkers) {
      if (m.status === 'UNREACHED' || m.status === 'FRONTIER') {
        const c = m.country || '—'
        counts[c] = (counts[c] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([code, count]) => ({ code, count, label: SUPPORTED_COUNTRIES[code]?.nameFr || code }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [sourceVisibleMarkers])

  // Adapte les marqueurs "master people" au format attendu par CoverageLayer.
  // PERF: on ne calcule QUE en mode couverture, et on pré-filtre par la
  // bounding box du pays sélectionné pour éviter un point-in-polygon sur les
  // ~20 000 marqueurs mondiaux à chaque changement de pays.
  const coveragePeoples = useMemo(() => {
    if (mapMode !== 'coverage') return []
    const b = SUPPORTED_COUNTRIES[coverageCountry]?.bounds // [minLng, minLat, maxLng, maxLat]
    const out = []
    for (const m of data?.markers || []) {
      const c = m.coordinates
      if (!c || c.length < 2) continue
      if (b && (c[0] < b[0] || c[0] > b[2] || c[1] < b[1] || c[1] > b[3])) continue
      out.push({
        location: { coordinates: c },
        engagementStatus: STATUS_TO_COVERAGE[m.status] || 'unknown',
        population: m.population || 0,
        numberOfChurches: 0,
        name: m.name,
        source: (m.sourceTypes || []).join(' + '),
      })
    }
    return out
  }, [data, mapMode, coverageCountry])

  const toggleSource = (s) => {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  const handleSearchPick = useCallback((m) => {
    setSelected(m)
    if (mapInstance && Array.isArray(m.coordinates) && m.coordinates.length === 2) {
      const [lng, lat] = m.coordinates
      mapInstance.setView([lat, lng], 9, { animate: true })
    }
  }, [mapInstance])

  // Detail (all sources + aliases) for the selected master people.
  const { data: detail } = useQuery({
    queryKey: ['master-people-detail', selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => {
      const [srcs, aliases] = await Promise.all([
        masterPeopleApi.getSources(selected.id),
        masterPeopleApi.getAliases(selected.id),
      ])
      return { sources: srcs.data.sources || [], aliases: aliases.data.aliases || [] }
    },
  })

  // Profil consolidé (langue, religion, photo, description, synchro, coords).
  const { data: profile } = useQuery({
    queryKey: ['master-people-profile', selected?.id],
    enabled: !!selected?.id,
    queryFn: async () => (await masterPeopleApi.getProfile(selected.id)).data,
  })

  // Couverture territoriale (polygones admin + villages), à la demande.
  const { data: coverage } = useQuery({
    queryKey: ['master-people-coverage', selected?.id],
    enabled: !!selected?.id && detailTab === 'localisation',
    queryFn: async () => (await masterPeopleApi.getCoverage(selected.id)).data,
  })

  // Activités liées (via PeopleGroup), à la demande.
  const { data: activities } = useQuery({
    queryKey: ['master-people-activities', selected?.id],
    enabled: !!selected?.id && detailTab === 'activites',
    queryFn: async () => (await masterPeopleApi.getActivities(selected.id)).data,
  })

  const ov = profile?.overview || {}
  const fmtDate = (d) => {
    if (!d) return null
    const dt = new Date(d)
    return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('fr-FR')
  }

  const activeSourceRows = (detail?.sources || []).filter((src) => activeSources.has(src.sourceType))
  const aliasNames = detail
    ? [...new Set(
        detail.aliases
          .filter((a) => ['NAME_ACROSS', 'NAME_IN_COUNTRY', 'DISPLAY', 'ALTERNATE'].includes(a.aliasType))
          .map((a) => a.alias)
      )].slice(0, 15)
    : []

  // Stratégique : on met l'accent sur les peuples non atteints / à atteindre.
  const displayMarkers = useMemo(
    () => (mapMode === 'strategic'
      ? markers.filter((m) => ['UNREACHED', 'FRONTIER', 'MINIMALLY_REACHED'].includes(m.status))
      : markers),
    [mapMode, markers],
  )

  const resetFilters = () => {
    setActiveSources(new Set(ALL_SOURCES))
    setStatusFilter('')
    setSelectedCountry('')
  }

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Recherche + bascule thème (haut-droite) */}
      <div className="absolute top-3 right-4 z-[1001] flex items-center gap-2">
        <SearchBox markers={sourceVisibleMarkers} onPick={handleSearchPick} theme={theme} />
        <ExportMenu markers={sourceVisibleMarkers} mapInstance={mapInstance} theme={theme} />
        <button
          onClick={() => setShowKpis((v) => !v)}
          title={showKpis ? 'Masquer les indicateurs' : 'Afficher les indicateurs'}
          aria-pressed={showKpis}
          className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-colors ${
            showKpis
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : theme === 'dark'
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          <BarChart3 size={16} />
        </button>
        <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />
      </div>
      {/* Cartes KPI — colonne discrète à droite, masquables et cachées quand un peuple est sélectionné */}
      {!isLoading && !error && !selected && showKpis && <KpiBar stats={stats} theme={theme} />}
      {/* ── Mode toggle (Terrain / Stratégique / Couverture) ───────── */}
      <MapModeToggle mode={mapMode} onChange={setMapMode} theme={theme} />

      {/* Encart niveau (mode couverture) */}
      {mapMode === 'coverage' && (
        <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[1001] rounded-full px-3 py-1 text-[11px] font-medium shadow-md ${panelCls(theme)}`}>
          Affichage : {LEVEL_LABELS[levelOverride] || 'Auto (zoom)'} — Cliquez une zone pour les détails
        </div>
      )}

      {/* Info-bulle terrain / stratégique */}
      {mapMode !== 'coverage' && showInfoBubble && (
        <div className={`absolute top-14 left-1/2 -translate-x-1/2 z-[1001] flex max-w-md items-center gap-2 rounded-full px-3 py-1.5 text-[11px] shadow-md ${panelCls(theme)}`}>
          <Info size={13} className="flex-shrink-0 text-indigo-500" />
          <span>Un seul point = un peuple — Toutes les sources sont regroupées sous une seule identité.</span>
          <button onClick={() => setShowInfoBubble(false)} className={subtleText(theme)}><X size={12} /></button>
        </div>
      )}

      {/* Légende de statut en bas de carte (terrain / stratégique) */}
      {mapMode !== 'coverage' && (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full px-4 py-1.5 shadow-md ${panelCls(theme)}`}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 text-[11px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[k] }} />
              {v}
            </span>
          ))}
        </div>
      )}


      {/* Légende Mode Couverture */}
      <CoverageLegend visible={mapMode === 'coverage'} theme={theme} />

      {/* Légende couches DMM (Personnes de paix / Groupes DBS) */}
      {mapMode !== 'coverage' && (
        <DmmLegend showPersonsOfPeace={showPersonsOfPeace} showDiscoveryGroups={showDiscoveryGroups} theme={theme} />
      )}
      {/* ── Barre latérale rétractable ───────────────────────────────── */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className={`absolute top-4 left-4 z-[1000] flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-lg ${panelCls(theme)}`}
          title="Afficher le panneau"
        >
          <ChevronRight size={16} /> Filtres
        </button>
      )}
      {sidebarOpen && (
      <div className={`absolute top-4 left-4 z-[1000] w-72 max-h-[85vh] overflow-y-auto rounded-xl p-4 shadow-lg ${panelCls(theme)}`}>
        <div className="mb-1 flex items-start justify-between">
          <h3 className="font-bold">Carte unifiée des peuples</h3>
          <button onClick={() => setSidebarOpen(false)} className={subtleText(theme)} title="Réduire le panneau">
            <ChevronLeft size={18} />
          </button>
        </div>
        <p className={`mb-3 text-xs ${subtleText(theme)}`}>
          Un peuple = un marqueur. Désactiver une source masque ses attributs sans supprimer le
          marqueur tant qu'une autre source existe.
        </p>

        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold text-gray-600">Sources</p>
          {ALL_SOURCES.map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={activeSources.has(s)} onChange={() => toggleSource(s)} />
              <span>{SOURCE_LABELS[s]}</span>
            </label>
          ))}
        </div>

        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold text-gray-600">Couches DMM</p>
          <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
            <input type="checkbox" checked={showDiscoveryGroups} onChange={() => setShowDiscoveryGroups((v) => !v)} />
            <span>Groupes de découverte (DBS)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
            <input type="checkbox" checked={showPersonsOfPeace} onChange={() => setShowPersonsOfPeace((v) => !v)} />
            <span>Personnes de paix</span>
          </label>
        </div>

        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold text-gray-600">Statut</p>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded border px-2 py-1 text-sm"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold text-gray-600">Pays</p>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full rounded border px-2 py-1 text-sm"
          >
            <option value="">Tous les pays</option>
            {availableCountries.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>

        {mapMode === 'coverage' && (
          <div className="mb-3">
            <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-600">
              <Layers size={12} /> Niveau
            </p>
            <select
              value={levelOverride || ''}
              onChange={(e) => setLevelOverride(e.target.value || null)}
              className={`w-full rounded border px-2 py-1 text-sm ${inputCls(theme)}`}
            >
              <option value="">Auto (selon le zoom)</option>
              <option value="region">Région</option>
              <option value="departement">Département</option>
              <option value="arrondissement">Arrondissement</option>
              <option value="village">Village</option>
            </select>
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={resetFilters}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${inputCls(theme)}`}
            title="Réinitialiser les filtres"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>

        <div className="text-xs text-gray-600">
          {isLoading && 'Chargement des marqueurs…'}
          {error && <span className="text-red-600">Erreur de chargement des données.</span>}
          {!isLoading && !error && (
            <span>
              Peuples affichés : <b>{visibleCount.toLocaleString('fr-FR')}</b> sur{' '}
              {(data?.count ?? (data?.markers?.length || 0)).toLocaleString('fr-FR')}
            </span>
          )}
        </div>

        {/* Répartition par statut */}
        {!isLoading && !error && <StatusChart data={statusChartData} theme={theme} />}

        {/* Top 5 pays par peuples non atteints */}
        {!isLoading && !error && <TopCountries data={topUnreachedCountries} theme={theme} />}

        <div className="mt-3 border-t pt-2">
          <p className="mb-1 text-xs font-semibold text-gray-600">Légende (statut)</p>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 py-0.5 text-xs">
              <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[k] }} />
              {v}
            </div>
          ))}
          <p className="mt-2 text-[11px] text-gray-400">
            Le double anneau indique un peuple présent dans plusieurs sources (fusionné).
          </p>
        </div>
      </div>
      )}

      {/* ── Selected people detail ────────────────────────────────── */}
      {selected && (
        <div className={`absolute top-16 right-4 z-[1000] w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-xl p-4 shadow-xl ${panelCls(theme)}`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold">{selected.name}</h3>
              <p className={`text-xs ${subtleText(theme)}`}>
                ROP3 {selected.rop3 || '—'} · {selected.country || '—'}
              </p>
            </div>
            <button onClick={() => setSelected(null)} className={subtleText(theme)}>
              ✕
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {(selected.sourceTypes || []).map((t) => (
              <span
                key={t}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  activeSources.has(t)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-400 line-through'
                }`}
              >
                {SOURCE_LABELS[t] || t}
              </span>
            ))}
          </div>

          {/* Onglets */}
          <div className="mt-3 flex gap-1 overflow-x-auto border-b border-neutral-200/40 pb-1">
            {[
              ['apercu', 'Aperçu'],
              ['sources', 'Sources'],
              ['population', 'Population'],
              ['localisation', 'Localisation'],
              ['activites', 'Activités'],
              ['notes', 'Notes'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setDetailTab(key)}
                className={`whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                  detailTab === key
                    ? 'bg-indigo-100 text-indigo-700'
                    : `${subtleText(theme)} hover:bg-black/5`
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs">
            {detailTab === 'apercu' && (
              <div className="flex flex-col gap-1.5">
                {ov.photoUrl ? (
                  <img
                    src={ov.photoUrl}
                    alt={selected.name}
                    className="h-32 w-full rounded-lg object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-lg bg-neutral-200/40 text-[11px] text-neutral-400">
                    Photo indisponible
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1">
                  <span>Statut</span><b className="text-right">{STATUS_LABELS[selected.status] || '—'}</b>
                  <span>Pays</span><b className="text-right">{selected.country || '—'}</b>
                  <span>Région</span><b className="text-right">{ov.region || '—'}</b>
                  <span>Population totale</span><b className="text-right">{(selected.population || 0).toLocaleString('fr-FR')}</b>
                  <span>Langue principale</span><b className="text-right">{ov.language || '—'}</b>
                  <span>Religion principale</span><b className="text-right">{ov.religion || '—'}</b>
                </div>
                {ov.description ? (
                  <p className={`mt-1 ${subtleText(theme)}`}>
                    {ov.description.length > 220 ? ov.description.slice(0, 220) + '…' : ov.description}
                  </p>
                ) : (
                  <p className={`mt-1 italic ${subtleText(theme)}`}>{profile ? 'Aucune description.' : 'Chargement…'}</p>
                )}
              </div>
            )}

            {detailTab === 'sources' && (
              <div>
                <p className="mb-1 font-semibold">Sources actives ({activeSourceRows.length})</p>
                {activeSourceRows.map((src) => (
                  <div key={src._id} className="mb-2 rounded-lg border border-neutral-200/40 p-2">
                    <div className="font-semibold">{SOURCE_LABELS[src.sourceType] || src.sourceType}</div>
                    <div className={subtleText(theme)}>{src.sourceName || '—'} · {src.countryName || src.countryCode || ''}</div>
                    {src.population ? <div className={subtleText(theme)}>Population : {Number(src.population).toLocaleString('fr-FR')}</div> : null}
                    <div className={subtleText(theme)}>ID {src.sourceType} : {src.sourceRecordId}</div>
                    <div className={subtleText(theme)}>Dernière synchro : {fmtDate((profile?.sources || []).find((p) => p.sourceRecordId === src.sourceRecordId)?.lastSyncedAt) || '—'}</div>
                  </div>
                ))}
                {detail && activeSourceRows.length === 0 && (
                  <p className={`italic ${subtleText(theme)}`}>Aucune source active — activez une source pour voir ses attributs.</p>
                )}
                {!detail && <p className={subtleText(theme)}>Chargement des sources…</p>}
                {detail?.sources?.length ? (
                  <p className="mt-1 text-[11px] text-indigo-500">Voir toutes les sources ({detail.sources.length})</p>
                ) : null}
              </div>
            )}

            {detailTab === 'population' && (
              <div className="flex flex-col gap-1.5">
                <p>Population totale : <b>{(selected.population || 0).toLocaleString('fr-FR')}</b></p>
                <p className="font-semibold">Par source</p>
                {activeSourceRows.length ? activeSourceRows.map((src) => (
                  <div key={src._id} className="flex items-center justify-between">
                    <span>{SOURCE_LABELS[src.sourceType] || src.sourceType}</span>
                    <span>{src.population ? Number(src.population).toLocaleString('fr-FR') : '—'}</span>
                  </div>
                )) : <p className={`italic ${subtleText(theme)}`}>Non disponible.</p>}
              </div>
            )}

            {detailTab === 'localisation' && (
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold">Point représentatif <span className={`font-normal ${subtleText(theme)}`}>(méthode : {profile?.localisation?.method || 'Calculée'})</span></p>
                {(() => {
                  const rep = profile?.localisation?.representative
                    || (Array.isArray(selected.coordinates) && selected.coordinates.length === 2 ? selected.coordinates : null)
                  return (
                    <p className={subtleText(theme)}>
                      {rep ? `Lat ${Number(rep[1]).toFixed(4)}, Lng ${Number(rep[0]).toFixed(4)}` : '—'}
                    </p>
                  )
                })()}
                {profile?.localisation?.sourcePoints?.length ? (
                  <>
                    <p className="mt-1 font-semibold">Points des sources</p>
                    {profile.localisation.sourcePoints.map((sp) => (
                      <div key={sp.sourceType} className={`flex items-center justify-between ${subtleText(theme)}`}>
                        <span>{SOURCE_LABELS[sp.sourceType] || sp.sourceType}</span>
                        <span>{Number(sp.coordinates[1]).toFixed(3)}, {Number(sp.coordinates[0]).toFixed(3)}</span>
                      </div>
                    ))}
                  </>
                ) : null}
                {aliasNames.length > 0 && (
                  <>
                    <p className="mt-1 font-semibold">Autres noms</p>
                    <p className={subtleText(theme)}>{aliasNames.join(', ')}</p>
                  </>
                )}
                <p className="mt-1 font-semibold">Couverture territoriale</p>
                {coverage ? (
                  <>
                    <p className={subtleText(theme)}>
                      Région : {coverage.counts.region} · Districts : {coverage.counts.departement} · Sous-districts : {coverage.counts.arrondissement} · Villages : {coverage.counts.village}
                    </p>
                    {coverage.territories?.length ? (
                      <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-neutral-200/40">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className={subtleText(theme)}>
                              <th className="px-2 py-1 text-left font-semibold">Territoire</th>
                              <th className="px-2 py-1 text-left font-semibold">Niveau</th>
                              <th className="px-2 py-1 text-right font-semibold">Pop.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {coverage.territories.slice(0, 30).map((t, i) => (
                              <tr key={`${t.level}-${t.name}-${i}`} className="border-t border-neutral-200/30">
                                <td className="px-2 py-1">{t.name}</td>
                                <td className="px-2 py-1">{t.level}</td>
                                <td className="px-2 py-1 text-right">{t.population ? Number(t.population).toLocaleString('fr-FR') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={`italic ${subtleText(theme)}`}>Aucun territoire rattaché.</p>
                    )}
                  </>
                ) : (
                  <p className={subtleText(theme)}>Calcul de la couverture…</p>
                )}
                <button
                  onClick={() => { setMapMode('coverage'); if (selected.country) setSelectedCountry(selected.country) }}
                  className="mt-1 self-start rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                >
                  Voir en mode Couverture
                </button>
              </div>
            )}

            {detailTab === 'activites' && (
              <div className="flex flex-col gap-1.5">
                {!activities && <p className={subtleText(theme)}>Chargement des activités…</p>}
                {activities && activities.activities.length === 0 && (
                  <p className={`italic ${subtleText(theme)}`}>Aucune activité liée à ce peuple.</p>
                )}
                {activities && activities.activities.map((a) => (
                  <div key={a.id} className="rounded-lg border border-neutral-200/40 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{a.type}</span>
                      <span className={subtleText(theme)}>{fmtDate(a.date) || '—'}</span>
                    </div>
                    <p className={subtleText(theme)}>{a.description}</p>
                    <div className={`mt-0.5 flex items-center gap-2 text-[10px] ${subtleText(theme)}`}>
                      {a.village && <span>📍 {a.village}</span>}
                      {a.participants ? <span>👥 {a.participants}</span> : null}
                      {a.user && <span>· {a.user}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'notes' && (
              <p className={`italic ${subtleText(theme)}`}>Aucune note (données backend requises).</p>
            )}
          </div>
        </div>
      )}

      {/* Mini-carte de navigation */}
      <OverviewMiniMap mainMap={mapInstance} theme={theme} collapsed={!miniMapOpen} onToggle={() => setMiniMapOpen((o) => !o)} />

      {/* ── Map ───────────────────────────────────────────────────── */}
      <MapContainer ref={setMapInstance} center={[7, 20]} zoom={3} className="h-full w-full" preferCanvas worldCopyJump>
        <TileLayer
          key={theme}
          url={THEME_TILES[theme].url}
          attribution={THEME_TILES[theme].attribution}
          crossOrigin="anonymous"
        />
        {mapMode === 'coverage' && (
          <CoverageLayer visible countryCode={coverageCountry} peoples={coveragePeoples} levelOverride={levelOverride} />
        )}
        {mapMode !== 'coverage' && !isLoading && !error && (
          <>
            <MasterPeopleLayer markers={displayMarkers} activeSources={activeSources} onSelect={setSelected} />
            <DmmLayers showPersonsOfPeace={showPersonsOfPeace} showDiscoveryGroups={showDiscoveryGroups} />
          </>
        )}
      </MapContainer>
    </div>
  )
}
