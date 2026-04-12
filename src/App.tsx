import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  getMissingEnvMessage,
  storageBucketName,
  supabase,
} from './lib/supabaseClient'
import { validateVideoSearch } from './lib/videoSearchValidation'
import './App.css'

// One row from storage.list — files usually have id or metadata; folder placeholders have neither.
type ListedFile = {
  name: string
  id: string | null
  metadata?: { mimetype?: string; size?: number } | null
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov']

function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function isVideoMime(mimetype: string | null | undefined): boolean {
  return Boolean(mimetype?.toLowerCase().startsWith('video/'))
}

function isFolder(row: ListedFile): boolean {
  return row.id == null && row.metadata == null
}

function joinPath(prefix: string, name: string): string {
  return prefix ? `${prefix}/${name}` : name
}

// Walk folders with storage.list (recursive). Skips names that look like video files so we do not treat them as folders.
async function listAllVideoPaths(): Promise<string[]> {
  const paths: string[] = []

  async function walk(prefix: string): Promise<void> {
    const { data, error } = await supabase.storage.from(storageBucketName).list(prefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw new Error(error.message)
    }

    for (const row of (data ?? []) as ListedFile[]) {
      const fullPath = joinPath(prefix, row.name)
      if (isVideoFile(row.name) || isVideoMime(row.metadata?.mimetype)) {
        paths.push(fullPath)
      } else if (isFolder(row)) {
        await walk(fullPath)
      }
    }
  }

  await walk('')
  const unique = [...new Set(paths)]
  unique.sort((a, b) => a.localeCompare(b))
  return unique
}

// Fixed point for Boulder, CO (no geolocation — keeps the app simple).
const BOULDER_LAT = 40.014986
const BOULDER_LON = -105.270546

type WeatherInfo = {
  tempF: number
  description: string
  icon: string
}

async function fetchWeather(lat: number, lon: number, apiKey: string): Promise<WeatherInfo> {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('units', 'imperial')
  url.searchParams.set('appid', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) {
    let extra = ''
    try {
      const errJson = (await res.json()) as { message?: string }
      if (typeof errJson.message === 'string') {
        extra = ` (${errJson.message})`
      }
    } catch {
      /* response was not JSON */
    }
    throw new Error(`Weather request failed: HTTP ${res.status}${extra}`)
  }

  const data = (await res.json()) as {
    name?: string
    weather?: Array<{ description?: string; icon?: string }>
    main?: { temp?: number }
  }

  const w = data.weather?.[0]
  const tempF = data.main?.temp
  if (typeof tempF !== 'number') {
    throw new Error('Bad weather data')
  }

  return {
    tempF,
    description: w?.description ?? '',
    icon: w?.icon ?? '01d',
  }
}

export default function App() {
  const configError = getMissingEnvMessage()
  const openWeatherKey = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim() ?? ''

  const [videoPaths, setVideoPaths] = useState<string[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchOkMessage, setSearchOkMessage] = useState<string | null>(null)

  const [localNow, setLocalNow] = useState(() => new Date())
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherInfo | null>(null)

  const [downloadingName, setDownloadingName] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const playbackObjectUrlRef = useRef<string | null>(null)

  async function loadList() {
    if (configError) return
    setListLoading(true)
    setListError(null)
    try {
      setVideoPaths(await listAllVideoPaths())
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to list storage')
      setVideoPaths([])
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    void loadList()
    // loadList should run when configError changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configError])

  useEffect(() => {
    const id = window.setInterval(() => setLocalNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!openWeatherKey) {
      setWeather(null)
      setWeatherError(null)
      setWeatherLoading(false)
      return
    }

    let cancelled = false
    setWeatherLoading(true)
    setWeatherError(null)
    setWeather(null)

    void fetchWeather(BOULDER_LAT, BOULDER_LON, openWeatherKey)
      .then((w) => {
        if (!cancelled) setWeather(w)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not load weather'
          setWeatherError(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [openWeatherKey])

  useEffect(() => {
    return () => {
      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
        playbackObjectUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (configError) {
      setPlaybackUrl(null)
      setPlaybackLoading(false)
      setPlaybackError(null)
      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
        playbackObjectUrlRef.current = null
      }
      return
    }

    if (!selectedPath) {
      setPlaybackUrl(null)
      setPlaybackLoading(false)
      setPlaybackError(null)
      if (playbackObjectUrlRef.current) {
        URL.revokeObjectURL(playbackObjectUrlRef.current)
        playbackObjectUrlRef.current = null
      }
      return
    }

    let cancelled = false
    setPlaybackLoading(true)
    setPlaybackError(null)
    setPlaybackUrl(null)

    if (playbackObjectUrlRef.current) {
      URL.revokeObjectURL(playbackObjectUrlRef.current)
      playbackObjectUrlRef.current = null
    }

    void (async () => {
      const signed = await supabase.storage
        .from(storageBucketName)
        .createSignedUrl(selectedPath, 3600)

      if (cancelled) return

      if (!signed.error && signed.data?.signedUrl) {
        setPlaybackUrl(signed.data.signedUrl)
        setPlaybackLoading(false)
        return
      }

      const { data: blob, error: dlError } = await supabase.storage
        .from(storageBucketName)
        .download(selectedPath)

      if (cancelled) return

      if (dlError || !blob) {
        setPlaybackError(
          dlError?.message ?? signed.error?.message ?? 'Could not load video',
        )
        setPlaybackLoading(false)
        return
      }

      const objectUrl = URL.createObjectURL(blob)
      if (cancelled) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      playbackObjectUrlRef.current = objectUrl
      setPlaybackUrl(objectUrl)
      setPlaybackLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [configError, selectedPath])

  async function handleDownloadClick(filePath: string) {
    if (configError) return

    setDownloadError(null)
    setDownloadingName(filePath)

    const { data, error } = await supabase.storage
      .from(storageBucketName)
      .download(filePath)

    setDownloadingName(null)

    if (error || !data) {
      setDownloadError(error?.message ?? 'Download failed')
      return
    }

    const slash = filePath.lastIndexOf('/')
    const baseName = slash === -1 ? filePath : filePath.slice(slash + 1)
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = baseName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const problem = validateVideoSearch(search)
    if (problem) {
      setSearchError(problem)
      setSearchOkMessage(null)
      return
    }
    const trimmed = search.trim()
    setSearchError(null)
    setActiveFilter(trimmed)
    setSearchOkMessage(`Showing paths containing "${trimmed}".`)
  }

  function clearVideoSearch() {
    setSearch('')
    setActiveFilter('')
    setSearchError(null)
    setSearchOkMessage(null)
  }

  const q = activeFilter.toLowerCase()
  const visiblePaths =
    q === '' ? videoPaths : videoPaths.filter((path) => path.toLowerCase().includes(q))

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h1>Videos</h1>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={Boolean(configError) || listLoading}
          >
            {listLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {configError && <p className="warn">{configError}</p>}
        {listError && <p className="err">{listError}</p>}
        {downloadError && <p className="err">{downloadError}</p>}

        <form className="search" role="search" noValidate onSubmit={handleSearchSubmit}>
          <label htmlFor="video-search">Search videos</label>
          <input
            id="video-search"
            type="search"
            name="q"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setSearchError(null)
              setSearchOkMessage(null)
            }}
            placeholder="Type text, then Apply"
            autoComplete="off"
          />
          {searchError ? <p className="field-error">{searchError}</p> : null}
          {searchOkMessage ? <p className="search-ok">{searchOkMessage}</p> : null}
          <div className="search-actions">
            <button type="submit">Apply</button>
            <button type="button" onClick={clearVideoSearch}>
              Show all
            </button>
          </div>
        </form>

        <ul className="file-list">
          {visiblePaths.length === 0 && !listLoading && !configError && (
            <li className="file-row empty">No videos found.</li>
          )}
          {visiblePaths.map((path) => (
            <li key={path} className={selectedPath === path ? 'file-row selected' : 'file-row'}>
              <button
                type="button"
                className="file-btn"
                onClick={() => setSelectedPath(path)}
                disabled={Boolean(configError)}
              >
                {path}
              </button>
            </li>
          ))}
        </ul>

        <div className="time-weather">
          <div>
            <div className="tw-label">Local time</div>
            <p className="tw-line">
              {localNow.toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
              })}{' '}
              <span className="tw-muted">
                {localNow.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </p>
          </div>

          <div>
            <div className="tw-label">Boulder, CO</div>
            {!openWeatherKey && (
              <p className="tw-muted">
                Add VITE_OPENWEATHER_API_KEY in .env.local (see .env.example).
              </p>
            )}
            {openWeatherKey && weatherLoading && <p className="tw-muted">Loading…</p>}
            {openWeatherKey && weatherError && <p className="err">{weatherError}</p>}
            {openWeatherKey && weather && !weatherLoading && (
              <div className="tw-weather">
                <img
                  src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                  alt=""
                  width={40}
                  height={40}
                />
                <p className="tw-line">
                  {Math.round(weather.tempF)}°F — {weather.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        {!selectedPath && (
          <p className="hint">Choose a file from the list to play it.</p>
        )}

        {selectedPath && (
          <div className="player">
            <div className="player-top">
              <h2>{selectedPath}</h2>
              <div className="player-btns">
                <button
                  type="button"
                  onClick={() => void handleDownloadClick(selectedPath)}
                  disabled={Boolean(configError) || downloadingName === selectedPath}
                >
                  {downloadingName === selectedPath ? 'Downloading…' : 'Download'}
                </button>
                <button type="button" onClick={() => setSelectedPath(null)}>
                  Close
                </button>
              </div>
            </div>

            {playbackLoading && <p>Loading video…</p>}
            {playbackError && <p className="err">{playbackError}</p>}

            {!playbackLoading && playbackUrl && !playbackError && (
              <video key={playbackUrl} src={playbackUrl} controls>
                Video not supported.
              </video>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
