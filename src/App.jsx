import { useState, useEffect, useCallback } from 'react'
import CameraMap from './components/CameraMap.jsx'
import CameraPanel from './components/CameraPanel.jsx'
import './App.css'

const API_BASE = 'https://prod-ut.ibi511.com'
const API_CCTV = '/api/cctv'
const PAGE_SIZE = 200

async function fetchCameraPage(start) {
  // Build query string manually — URLSearchParams with bracket keys throws
  // "The string did not match the expected pattern." on Safari/WebKit.
  const url = `${API_CCTV}?start=${start}&length=${PAGE_SIZE}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 120)}`)
  }
}

function normalizeCamera(raw) {
  return {
    id: raw.id ?? raw.cctv_id ?? raw.cctvId ?? String(Math.random()),
    name: raw.name ?? raw.cctv_label ?? raw.label ?? raw.title ?? 'Unknown',
    roadway: raw.roadway ?? raw.road ?? raw.highway ?? '',
    direction: raw.direction ?? raw.dir ?? '',
    lat: parseFloat(raw.latitude ?? raw.lat ?? 0),
    lng: parseFloat(raw.longitude ?? raw.lon ?? raw.lng ?? 0),
    imageUrl:
      raw.image_url ??
      raw.imageUrl ??
      raw.snapshot_url ??
      raw.url ??
      `${API_BASE}/cctv/${raw.id ?? raw.cctv_id}/image`,
    detailUrl: raw.url ?? null,
    active: raw.active !== false && raw.status !== 'inactive',
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
      const first = await fetchCameraPage(0)
      // API may return a plain array or a DataTables-style {data, recordsTotal} object.
      const firstItems = Array.isArray(first) ? first : (first.data ?? [])
      const total = Array.isArray(first)
        ? first.length
        : (first.recordsTotal ?? first.iTotalRecords ?? firstItems.length)
      let all = [...firstItems]

      const remaining = total - PAGE_SIZE
      if (remaining > 0) {
        const pages = Math.ceil(remaining / PAGE_SIZE)
        const fetches = Array.from({ length: pages }, (_, i) =>
          fetchCameraPage((i + 1) * PAGE_SIZE)
        )
        const results = await Promise.all(fetches)
        for (const r of results) {
          all = all.concat(Array.isArray(r) ? r : (r.data ?? []))
        }
      }

      const normalized = all
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
