import { useEffect, useState } from 'react'
import { supabase, bucket, missingEnv } from './lib/supabaseClient'
import { parseSearchQuery } from './lib/searchValidation'
import './App.css'

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY ?? ''
const BOULDER = { lat: 40.014986, lon: -105.270546 }

export default function App() {
  const envError = missingEnv()

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [searchError, setSearchError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)

  const [now, setNow] = useState(new Date())
  const [weather, setWeather] = useState(null)
  const [weatherError, setWeatherError] = useState(null)

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

  useEffect(() => {
    loadFiles()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

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
        <div className="sidebar-top">
          <h1>Videos</h1>
          <button onClick={loadFiles} disabled={!!envError || loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {envError && <p className="warn">{envError}</p>}
        {error && <p className="err">{error}</p>}

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
          <div>{now.toLocaleTimeString()}</div>
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
