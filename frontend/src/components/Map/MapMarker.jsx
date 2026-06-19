import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Create custom marker icon
const createIcon = (color, size = 30) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

const MapMarker = ({
  position,
  color = '#0ea5e9',
  size = 30,
  onClick,
  children,
  ...props
}) => {
  if (!position || !Array.isArray(position) || position.length !== 2) {
    return null
  }

  return (
    <Marker
      position={position}
      icon={createIcon(color, size)}
      eventHandlers={{
        click: onClick,
      }}
      {...props}
    >
      {children && <Popup>{children}</Popup>}
    </Marker>
  )
}

export default MapMarker
