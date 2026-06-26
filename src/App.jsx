import { useState, useEffect, useCallback } from 'react'
import CameraMap from './components/CameraMap.jsx'
import CameraPanel from './components/CameraPanel.jsx'
import './App.css'

// Public ArcGIS MapServer (Jordan City GIS, layer 5 = UDOT Traffic Cameras).
// ArcGIS services carry CORS headers; no API key required.
const ARCGIS_URL =
  'https://gis.wjordan.com/arcgis/rest/services/CityInfo/MapServer/5/query' +
  '?where=1%3D1&outFields=*&outSR=4326&f=json'

async function fetchCameras() {
  const res = await fetch(ARCGIS_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 120)}`)
  }
  if (data.error) throw new Error(`ArcGIS error: ${data.error.message}`)
  return data
}

function normalizeCamera(raw) {
  // ArcGIS FeatureSet: each feature has .attributes (field map) and .geometry {x,y} in WGS84
  const attr = raw.attributes ?? raw
  const geo = raw.geometry ?? {}

  // Geometry is already in WGS84 (outSR=4326): x=lng, y=lat
  const lat = geo.y ?? parseFloat(attr.LATITUDE ?? attr.latitude ?? attr.LAT ?? 0)
  const lng = geo.x ?? parseFloat(attr.LONGITUDE ?? attr.longitude ?? attr.LNG ?? 0)

  // Pick the most descriptive string field for name and URL — field names vary by server
  const id = String(attr.OBJECTID ?? attr.objectid ?? attr.ID ?? attr.id ?? Math.random())
  const name =
    attr.CAMERA_NAME ?? attr.NAME ?? attr.LOCATION ?? attr.LABEL ?? attr.name ?? 'Camera'
  const imageUrl =
    attr.IMAGE_URL ?? attr.CAMERA_URL ?? attr.URL ?? attr.image_url ?? attr.url ?? ''
  const detailUrl =
    attr.URL ?? attr.DETAIL_URL ?? attr.CAMERA_URL ??
    `https://udottraffic.utah.gov/tooltip/Cameras/${id}`

  return {
    id,
    name,
    roadway: attr.ROADWAY ?? attr.ROAD ?? attr.roadway ?? attr.road ?? '',
    direction: attr.DIRECTION ?? attr.direction ?? '',
    lat,
    lng,
    imageUrl,
    detailUrl,
    active: attr.STATUS !== 'Inactive' && attr.STATUS !== 0,
  }
}

export default function App() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCameras()
      // ArcGIS FeatureSet shape: { features: [{attributes, geometry}] }
      const items = data.features ?? (Array.isArray(data) ? data : [])
      const normalized = items
        .map(normalizeCamera)
        .filter((c) => isFinite(c.lat) && isFinite(c.lng) && (c.lat !== 0 || c.lng !== 0))
      setCameras(normalized)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filtered = search.trim()
    ? cameras.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.roadway.toLowerCase().includes(search.toLowerCase())
      )
    : cameras

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="header-icon">📷</span>
          <h1>Utah DOT Camera Map</h1>
          {!loading && (
            <span className="camera-count">{cameras.length} cameras</span>
          )}
        </div>
        <div className="header-right">
          <input
            type="search"
            className="search-input"
            placeholder="Search cameras or roads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="refresh-btn" onClick={loadAll} title="Refresh">
            ↻
          </button>
        </div>
      </header>

      <div className="app-body">
        {loading && (
          <div className="overlay">
            <div className="spinner" />
            <p>Loading cameras…</p>
          </div>
        )}
        {error && !loading && (
          <div className="overlay error">
            <p>Failed to load cameras: {error}</p>
            <button onClick={loadAll}>Retry</button>
          </div>
        )}

        <CameraMap
          cameras={filtered}
          selected={selected}
          onSelect={setSelected}
        />

        {selected && (
          <CameraPanel camera={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  )
}
