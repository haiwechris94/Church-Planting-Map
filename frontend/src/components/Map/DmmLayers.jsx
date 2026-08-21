import React from 'react'
import { CircleMarker, Tooltip, Popup } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { personsOfPeaceApi, discoveryGroupsApi } from '../../services/api'

/**
 * DmmLayers — couches DMM pour la carte unifiée (Pilier ① Cartographie).
 *
 * - Personnes de paix (Luc 10) colorées selon leur progression.
 * - Groupes de découverte (DBS), la taille du marqueur reflète la génération
 *   (multiplication de groupes) et une étiquette affiche « Gn ».
 *
 * Les données proviennent des nouvelles APIs DMM et se rafraîchissent via
 * react-query, comme le reste de la carte.
 */

export const POP_STATUS = {
  identified: { color: '#f59e0b', label: 'Identifiée' },
  engaging: { color: '#3b82f6', label: 'En relation' },
  confirmed: { color: '#10b981', label: 'Confirmée' },
  leading: { color: '#15803d', label: 'Mène un groupe' },
  inactive: { color: '#9ca3af', label: 'Inactive' },
}

export const DG_STATUS = {
  active: { color: '#3b82f6', label: 'Actif' },
  multiplied: { color: '#8b5cf6', label: 'Multiplié' },
  'became-church': { color: '#15803d', label: 'Devenu église' },
  stalled: { color: '#f97316', label: 'En panne' },
  closed: { color: '#9ca3af', label: 'Fermé' },
}

// location GeoJSON => [lat, lng] attendu par Leaflet
function toLatLng(location) {
  const c = location && location.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const [lng, lat] = c
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return [lat, lng]
}

function PersonsOfPeaceLayer() {
  const { data } = useQuery({
    queryKey: ['dmm', 'persons-of-peace', 'map'],
    queryFn: () => personsOfPeaceApi.list({ limit: 500 }).then((r) => r.data?.data || []),
    staleTime: 60_000,
  })
  const items = data || []
  return (
    <>
      {items.map((p) => {
        const pos = toLatLng(p.location)
        if (!pos) return null
        const st = POP_STATUS[p.status] || POP_STATUS.identified
        return (
          <CircleMarker
            key={`pop-${p._id}`}
            center={pos}
            radius={6}
            pathOptions={{ color: '#fff', weight: 1.5, fillColor: st.color, fillOpacity: 0.9 }}
          >
            <Tooltip direction="top">{`👤 ${p.name}`}</Tooltip>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{p.name}</strong>
                <div>Personne de paix — {st.label}</div>
                {p.village?.name && <div>Village : {p.village.name}</div>}
                {p.discoveryGroup?.name && <div>Groupe : {p.discoveryGroup.name}</div>}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

function DiscoveryGroupsLayer() {
  const { data } = useQuery({
    queryKey: ['dmm', 'discovery-groups', 'map'],
    queryFn: () => discoveryGroupsApi.list({ limit: 500 }).then((r) => r.data?.data || []),
    staleTime: 60_000,
  })
  const items = data || []
  return (
    <>
      {items.map((g) => {
        const pos = toLatLng(g.location)
        if (!pos) return null
        const st = DG_STATUS[g.status] || DG_STATUS.active
        const gen = g.generation || 1
        return (
          <CircleMarker
            key={`dg-${g._id}`}
            center={pos}
            radius={6 + Math.min(gen, 4) * 2}
            pathOptions={{ color: '#fff', weight: 1.5, fillColor: st.color, fillOpacity: 0.75 }}
          >
            <Tooltip direction="top" permanent className="dmm-gen-label">{`G${gen}`}</Tooltip>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{g.name}</strong>
                <div>Groupe de découverte (DBS) — {st.label}</div>
                <div>Génération : {gen}</div>
                <div>Membres : {g.memberCount ?? 0}</div>
                {g.currentPassage && <div>Passage : {g.currentPassage}</div>}
                {g.village?.name && <div>Village : {g.village.name}</div>}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

export default function DmmLayers({ showPersonsOfPeace = false, showDiscoveryGroups = false }) {
  return (
    <>
      {showDiscoveryGroups && <DiscoveryGroupsLayer />}
      {showPersonsOfPeace && <PersonsOfPeaceLayer />}
    </>
  )
}
