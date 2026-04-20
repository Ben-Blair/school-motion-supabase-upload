import { useEffect, useState } from 'react'
import { supabase, bucket, missingEnv } from './lib/supabaseClient'
import { parseSearchQuery } from './lib/searchValidation'
import './App.css'

// =============================================================================
// WEATHER — OpenWeatherMap (Boulder, CO). Key: VITE_OPENWEATHER_API_KEY in .env.local
// =============================================================================
const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? ''
const BOULDER = { lat: 40.014986, lon: -105.270546 }

export default function App() {
  // ===========================================================================
  // SUPABASE — env check, bucket file list, loading/errors, video + signed URL
  // ===========================================================================
  const envError = missingEnv()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [selected, setSelected] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)

  // ===========================================================================
  // SEARCH — draft text, applied filter, validation (filters Supabase list)
  // ===========================================================================
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [searchError, setSearchError] = useState(null)

  // ===========================================================================
  // TIME — local clock (sidebar footer)
  // ===========================================================================
  const [now, setNow] = useState(new Date())

  // ===========================================================================
  // WEATHER — OpenWeather fetch result + error (sidebar footer)
  // ===========================================================================
  const [weather, setWeather] = useState(null)
  const [weatherError, setWeatherError] = useState(null)

  // ---------------------------------------------------------------------------
  // Supabase: load .mp4 file names from bucket root
  // ---------------------------------------------------------------------------
  async function loadFiles() {
    if (envError) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.storage.from(bucket).list('', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setFiles((data ?? []).filter((f) => f.name.toLowerCase().endsWith('.mp4')))
  }

  // ---------------------------------------------------------------------------
  // Supabase: initial list on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadFiles()
  }, [])

  // ---------------------------------------------------------------------------
  // Time: tick every second
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // ---------------------------------------------------------------------------
  // Weather: one request on mount (skipped if no API key)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!OPENWEATHER_KEY) return
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${BOULDER.lat}&lon=${BOULDER.lon}&units=imperial&appid=${OPENWEATHER_KEY}`
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) =>
        setWeather({
          temp: Math.round(d.main.temp),
          desc: d.weather?.[0]?.description ?? '',
        }),
      )
      .catch((e) => setWeatherError(e.message))
  }, [])

  // ---------------------------------------------------------------------------
  // Supabase: signed URL when user selects a file (for <video src>)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selected) {
      setVideoUrl(null)
      return
    }
    supabase.storage
      .from(bucket)
      .createSignedUrl(selected, 3600)
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setVideoUrl(data.signedUrl)
      })
  }, [selected])

  // ---------------------------------------------------------------------------
  // Search: filtered list (uses files from Supabase)
  // ---------------------------------------------------------------------------
  const visible = appliedQuery
    ? files.filter((f) =>
        f.name.toLowerCase().includes(appliedQuery.toLowerCase()),
      )
    : files

  function handleSearchSubmit(e) {
    e.preventDefault()
    const result = parseSearchQuery(searchInput)
    if (!result.ok) {
      setSearchError(result.error)
      return
    }
    setSearchError(null)
    setAppliedQuery(result.query)
  }

  function clearSearch() {
    setSearchInput('')
    setAppliedQuery('')
    setSearchError(null)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        {/* --- Header + refresh --- */}
        <div className="sidebar-top">
          <h1>Videos</h1>
          <button onClick={loadFiles} disabled={!!envError || loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* ========== SUPABASE: config / API messages ========== */}
        {envError && <p className="warn">{envError}</p>}
        {error && <p className="err">{error}</p>}

        {/* ========== SEARCH ========== */}
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            placeholder="Type text, then Apply"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value)
              setSearchError(null)
            }}
          />
          {searchError && <p className="field-error">{searchError}</p>}
          <div className="search-actions">
            <button type="submit">Apply</button>
            <button type="button" onClick={clearSearch}>
              Show all
            </button>
          </div>
        </form>

        {/* ========== SUPABASE: file list (click to play) ========== */}
        <ul className="file-list">
          {visible.length === 0 && !loading && !envError && (
            <li className="file-row empty">No videos found.</li>
          )}
          {visible.map((f) => (
            <li
              key={f.name}
              className={selected === f.name ? 'file-row selected' : 'file-row'}
            >
              <button className="file-btn" onClick={() => setSelected(f.name)}>
                {f.name}
              </button>
            </li>
          ))}
        </ul>

        <div className="info">
          {/* ========== TIME ========== */}
          <div>{now.toLocaleTimeString()}</div>

          {/* ========== WEATHER ========== */}
          {!OPENWEATHER_KEY && (
            <div className="muted">Set VITE_OPENWEATHER_API_KEY for weather.</div>
          )}
          {weatherError && <div className="err">{weatherError}</div>}
          {weather && (
            <div className="weather">
              {weather.temp}°F — {weather.desc} (Boulder)
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {!selected && <p className="hint">Select a video to play.</p>}

        {/* ========== SUPABASE: video player (signed URL) ========== */}
        {selected && (
          <div className="player">
            <div className="player-top">
              <h2>{selected}</h2>
              <div className="player-btns">
                <button onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
            {videoUrl && <video key={videoUrl} src={videoUrl} controls />}
          </div>
        )}
      </main>
    </div>
  )
}
