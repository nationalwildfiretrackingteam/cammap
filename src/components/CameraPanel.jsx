import { useState, useEffect } from 'react'
import './CameraPanel.css'

export default function CameraPanel({ camera, onClose }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [imgError, setImgError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setImgError(false)
    if (!camera.imageUrl) {
      setImgSrc(null)
      return
    }
    // Bust cache on camera change or manual refresh
    const url = new URL(camera.imageUrl, window.location.origin)
    url.searchParams.set('_t', String(Date.now()))
    setImgSrc(url.toString())
  }, [camera.imageUrl, refreshKey])

  const refresh = () => {
    setImgError(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="camera-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-name">{camera.name}</span>
          {(camera.roadway || camera.direction) && (
            <span className="panel-meta">
              {camera.roadway}
              {camera.direction ? ` · ${camera.direction}` : ''}
            </span>
          )}
        </div>
        <div className="panel-actions">
          <button className="icon-btn" onClick={refresh} title="Refresh image">
            ↻
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
      </div>

      <div className="panel-image-wrap">
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={camera.name}
            className="cam-image"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="img-placeholder">
            {imgError ? (
              <>
                <span className="placeholder-icon">⚠</span>
                <span>Image unavailable</span>
                <button className="retry-btn" onClick={refresh}>Retry</button>
              </>
            ) : (
              <>
                <span className="placeholder-icon">📷</span>
                <span>Loading…</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="panel-footer">
        <div className="panel-coords">
          {camera.lat.toFixed(5)}, {camera.lng.toFixed(5)}
        </div>
        <div className="panel-links">
          {camera.detailUrl && (
            <a
              href={camera.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              Open in 511 ↗
            </a>
          )}
          <a
            href={`https://www.google.com/maps?q=${camera.lat},${camera.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-link"
          >
            Google Maps ↗
          </a>
        </div>
      </div>
    </div>
  )
}
