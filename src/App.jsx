import { useState, useEffect, useCallback } from 'react'
import CameraMap from './components/CameraMap.jsx'
import CameraPanel from './components/CameraPanel.jsx'
import './App.css'

// Proxied in dev (vite.config.js) and production (netlify.toml).
const API_CAMERAS = '/api/cameras'

async function fetchCameras() {
  const res = await fetch(API_CAMERAS, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 120)}`)
  }
}

function normalizeCamera(raw) {
  // UDOT API shape: { Id, Location, Roadway, Direction, Latitude, Longitude, Views: [{Url}] }
  const view = Array.isArray(raw.Views) && raw.Views.length > 0 ? raw.Views[0] : null
  return {
    id: String(raw.Id ?? raw.id ?? Math.random()),
    name: raw.Location ?? raw.name ?? raw.label ?? 'Unknown',
    roadway: raw.Roadway ?? raw.roadway ?? '',
    direction: raw.Direction ?? raw.direction ?? '',
    lat: parseFloat(raw.Latitude ?? raw.latitude ?? 0),
    lng: parseFloat(raw.Longitude ?? raw.longitude ?? 0),
    imageUrl: view?.Url ?? raw.image_url ?? raw.imageUrl ?? raw.snapshot_url ?? '',
    detailUrl: view?.Url ?? raw.url ?? null,
    active: raw.Status !== 'inactive' && raw.active !== false,
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
