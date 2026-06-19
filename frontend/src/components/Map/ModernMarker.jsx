import L from 'leaflet'

/**
 * STATUS_PALETTE – DMM engagement status palette aligned with the legend, filter,
 * and cluster icons. Single source of truth for marker colors.
 */
export const STATUS_PALETTE = {
  'unreached':     '#dc2626', // red
  'pioneer':       '#f97316', // orange
  'mid-journey':   '#eab308', // yellow
  'tipping-point': '#10b981', // emerald
  'movement':      '#15803d', // dark green
  'unknown':       '#6b7280', // gray
}

/**
 * sizeFromPopulation – returns marker diameter in px from population.
 * Uses log10 scale clamped between 14px and 36px.
 */
export const sizeFromPopulation = (population) => {
  const pop = Number(population) || 0
  if (pop <= 0) return 16
  const size = 12 + Math.min(24, Math.log10(pop + 1) * 4.5)
  return Math.round(size)
}

/**
 * createModernMarker – returns a Leaflet DivIcon that is:
 *   - circular, color-coded by status
 *   - sized by population (log scale)
 *   - has a subtle source ring (DMM=solid, survey=dashed, JP=double)
 *   - hover/active animation via CSS class
 */
export const createModernMarker = ({
  status = 'unreached',
  source = 'dmm',
  population = 0,
  active = false,
  highlighted = false,
} = {}) => {
  const color = STATUS_PALETTE[status] || STATUS_PALETTE.unknown
  const size = sizeFromPopulation(population)
  const ringColor =
    source === 'joshua-project' ? '#ffffff' : source === 'survey' ? '#fef3c7' : '#ffffff'
  const ringStyle =
    source === 'joshua-project'
      ? `box-shadow: 0 0 0 2px ${color}, 0 0 0 4px ${ringColor}, 0 2px 6px rgba(0,0,0,0.25);`
      : source === 'survey'
        ? `box-shadow: 0 0 0 2px ${ringColor}, 0 2px 6px rgba(0,0,0,0.25); border: 1.5px dashed ${color};`
        : `box-shadow: 0 0 0 2px ${ringColor}, 0 2px 6px rgba(0,0,0,0.25);`

  const scale = active || highlighted ? 1.25 : 1
  const transform = `transform: scale(${scale});`
  const pulse = active ? 'modern-marker-pulse' : ''

  const html = `
    <div class="modern-marker ${pulse}" style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: 50%;
      ${ringStyle}
      ${transform}
      transition: transform 0.18s ease, box-shadow 0.18s ease;
      cursor: pointer;
    "></div>
  `

  return L.divIcon({
    html,
    className: 'modern-marker-wrapper',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

/**
 * createClusterIcon – cluster icon factory for react-leaflet-cluster.
 * Color-blends based on dominant status of the children (best-effort).
 */
export const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount()

  // Try to derive a dominant status color from child markers' options
  let dominant = STATUS_PALETTE.unreached
  try {
    const markers = cluster.getAllChildMarkers ? cluster.getAllChildMarkers() : []
    const tally = {}
    for (const m of markers) {
      const s = m?.options?.peopleStatus
      if (s) tally[s] = (tally[s] || 0) + 1
    }
    const topKey = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0]
    if (topKey && STATUS_PALETTE[topKey]) dominant = STATUS_PALETTE[topKey]
  } catch (_) {
    /* fallback below */
  }

  const size = count < 10 ? 32 : count < 50 ? 40 : count < 200 ? 48 : 56
  const fontSize = count < 100 ? 12 : 11

  const html = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${dominant};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: ${fontSize}px;
      box-shadow: 0 0 0 4px ${dominant}33, 0 0 0 8px ${dominant}1a, 0 4px 10px rgba(0,0,0,0.2);
      border: 2px solid white;
      cursor: pointer;
    ">${count}</div>
  `
  return L.divIcon({
    html,
    className: 'modern-cluster-wrapper',
    iconSize: [size, size],
  })
}
