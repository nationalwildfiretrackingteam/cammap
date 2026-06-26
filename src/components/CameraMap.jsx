import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './CameraMap.css'

// Fix Leaflet default marker icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const activeIcon = new L.DivIcon({
  className: '',
  html: `<div class="cam-marker active"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -10],
})

const inactiveIcon = new L.DivIcon({
  className: '',
  html: `<div class="cam-marker inactive"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  popupAnchor: [0, -8],
})

const selectedIcon = new L.DivIcon({
  className: '',
  html: `<div class="cam-marker selected"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
})

function FlyToSelected({ selected }) {
  const map = useMap()
  const prevId = useRef(null)

  useEffect(() => {
    if (selected && selected.id !== prevId.current) {
      prevId.current = selected.id
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 13), {
        duration: 0.8,
      })
    }
  }, [selected, map])

  return null
}

export default function CameraMap({ cameras, selected, onSelect }) {
  // Utah center
  const center = [39.5, -111.5]

  return (
    <MapContainer
      center={center}
      zoom={7}
      style={{ height: '100%', width: '100%', background: '#1a1d2e' }}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FlyToSelected selected={selected} />

      {cameras.map((cam) => (
        <Marker
          key={cam.id}
          position={[cam.lat, cam.lng]}
          icon={
            selected?.id === cam.id
              ? selectedIcon
              : cam.active
              ? activeIcon
              : inactiveIcon
          }
          eventHandlers={{ click: () => onSelect(cam) }}
        >
          <Popup className="cam-popup">
            <div className="popup-content">
              <strong>{cam.name}</strong>
              {cam.roadway && <span>{cam.roadway}{cam.direction ? ` · ${cam.direction}` : ''}</span>}
              <button className="popup-view-btn" onClick={() => onSelect(cam)}>
                View Camera
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
