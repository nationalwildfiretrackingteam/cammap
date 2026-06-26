import { useState, useEffect, useCallback } from 'react'
import CameraMap from './components/CameraMap.jsx'
import CameraPanel from './components/CameraPanel.jsx'
import './App.css'

// Socrata public open data API — no key needed, CORS enabled, fetch direct from browser.
// Dataset: Utah Open Data "UDOT Traffic Cameras"
const SOCRATA_URL = 'https://opendata.utah.gov/resource/i3u7-ydfp.json'

async function fetchCameras() {
  const res = await fetch(`${SOCRATA_URL}?$limit=50000`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 120)}`)
  }
}

function extractLatLng(raw) {
  // Socrata location type: { latitude, longitude } or GeoJSON { coordinates: [lng, lat] }
  const loc = raw.location ?? raw.geocoded_column ?? {}
  const lat = parseFloat(
    raw.latitude ?? raw.lat ?? loc.latitude ?? loc.coordinates?.[1] ?? 0
  )
  const lng = parseFloat(
    raw.longitude ?? raw.long ?? raw.lng ??
    loc.longitude ?? loc.coordinates?.[0] ?? 0
  )
  return { lat, lng }
}

function normalizeCamera(raw) {
  const { lat, lng } = extractLatLng(raw)
  const id = raw.camera_id ?? raw.id ?? String(Math.random())
  return {
    id: String(id),
    name: raw.location_name ?? raw.camera_name ?? raw.name ?? raw.title ?? 'Unknown',
    roadway: raw.route ?? raw.roadway ?? raw.road ?? '',
    direction: raw.direction ?? raw.dir ?? '',
    lat,
    lng,
    imageUrl: raw.image_url ?? raw.imageurl ?? raw.snapshot_url ?? raw.url ?? '',
    detailUrl: raw.url ?? raw.camera_url ?? `https://udottraffic.utah.gov/tooltip/Cameras/${id}`,
    active: raw.status !== 'Inactive' && raw.active !== false,
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
      const items = Array.isArray(data) ? data : (data.data ?? data.cameras ?? [])
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
