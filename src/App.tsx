import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { CircleMarker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Activity, Filter, List, Moon, Sun, Zap, MapPin, Calendar, Search, TrendingUp } from 'lucide-react'
import { fetchEarthquakes } from '@/lib/usgs'
import type { EarthquakeFeature, TimeRange } from '@/types/earthquake'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [range, setRange] = useState<TimeRange>('day')
  const [minMag, setMinMag] = useState<number>(2.5)
  const [query, setQuery] = useState<string>('')
  const [pendingRange, setPendingRange] = useState<TimeRange>('day')
  const [pendingMinMag, setPendingMinMag] = useState<number>(2.5)
  const [pendingQuery, setPendingQuery] = useState<string>('')
  const [data, setData] = useState<EarthquakeFeature[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EarthquakeFeature | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [autoFitEnabled, setAutoFitEnabled] = useState(true)
  const [page, setPage] = useState<number>(1)
  const [eventsOpen, setEventsOpen] = useState(false)

  const { toast } = useToast()
  const suppressFitRef = useRef(false)

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    let isActive = true
    setLoading(true)
    setError(null)
    fetchEarthquakes(range)
      .then((geo) => {
        if (!isActive) return
        setData(geo.features)
      })
      .catch((e: unknown) => {
        if (!isActive) return
        const message = e instanceof Error ? e.message : 'Unknown error'
        setError(message)
        toast({
          title: 'Failed to load earthquakes',
          description: message,
          variant: 'destructive',
        })
      })
      .finally(() => isActive && setLoading(false))

    return () => {
      isActive = false
    }
  }, [range])

  const filtered = useMemo(() => {
    return data.filter((f) => {
      const magOk = (f.properties.mag ?? -Infinity) >= minMag
      const q = query.trim().toLowerCase()
      const placeOk = q ? (f.properties.place ?? '').toLowerCase().includes(q) : true
      return magOk && placeOk
    })
  }, [data, minMag, query])

  const sortedByTimeDesc = useMemo(() => {
    return [...filtered].sort((a, b) => (b.properties.time ?? 0) - (a.properties.time ?? 0))
  }, [filtered])

  const pointsMemo = useMemo(() => filtered.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number]), [filtered])

  const pageSize = 9
  const totalPages = Math.max(1, Math.ceil(sortedByTimeDesc.length / pageSize))

  useEffect(() => {
    setPage(1)
    setAutoFitEnabled(true)
  }, [sortedByTimeDesc.length])

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedByTimeDesc.slice(start, start + pageSize)
  }, [sortedByTimeDesc, page])

  const stats = useMemo(() => {
    const mags = filtered.map(f => f.properties.mag ?? 0)
    return {
      total: filtered.length,
      maxMag: Math.max(...mags, 0),
      avgMag: mags.length ? (mags.reduce((a, b) => a + b, 0) / mags.length) : 0,
      recent: filtered.filter(f => f.properties.time && Date.now() - f.properties.time < 3600000).length
    }
  }, [filtered])

  function getPageNumbers(current: number, total: number, max = 7) {
    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    const half = Math.floor(max / 2)
    let start = Math.max(1, current - half)
    let end = start + max - 1
    if (end > total) {
      end = total
      start = end - max + 1
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  function FitBounds({ points, disabled }: { points: Array<[number, number]>; disabled?: boolean }) {
    const map = useMap()
    useEffect(() => {
      if (disabled) return
      if (suppressFitRef.current) {
        suppressFitRef.current = false
        return
      }
      if (points.length === 0) return
      const bounds = L.latLngBounds(points.map(([lat, lon]) => L.latLng(lat, lon)))
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 6, animate: false })
    }, [points, disabled, map])
    return null
  }

  function MapSelectionSync({ feature }: { feature: EarthquakeFeature | null }) {
    const map = useMap()
    useEffect(() => {
      if (!feature) return
      const [lon, lat] = feature.geometry.coordinates
      const target = L.latLng(lat, lon)
      const zoom = Math.max(map.getZoom(), 5)
      map.flyTo(target, zoom, { duration: 0.5 })
    }, [feature, map])
    return null
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const getMagnitudeColor = (mag: number) => {
    if (mag > 6) return 'red'
    if (mag > 4) return 'orange'
    return 'green'
  }

  const getMagnitudeColorClass = (mag: number) => {
    if (mag > 6) return 'bg-red-500 text-white'
    if (mag > 4) return 'bg-yellow-500 text-black'
    return 'bg-green-500 text-white'
  }

  return (
    <div className={`min-h-screen transition-all duration-300 overflow-hidden ${
      theme === 'dark' 
        ? 'bg-black text-white' 
        : 'bg-white text-black'
    }`}>
      {/* Header */}
      <header className={`border-b ${
        theme === 'dark' 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-gray-100 border-gray-300'
      }`}>
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Earthquake Visualizer
              </h1>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Real-time seismic activity monitoring
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats cards */}
            <div className="hidden lg:flex items-center gap-4">
              <div className={`rounded-lg px-3 py-2 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Total Events</div>
                <div className="text-lg font-bold text-green-500">{stats.total}</div>
              </div>
              <div className={`rounded-lg px-3 py-2 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Max Magnitude</div>
                <div className="text-lg font-bold text-red-500">M {stats.maxMag.toFixed(1)}</div>
              </div>
              <div className={`rounded-lg px-3 py-2 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Recent (1h)</div>
                <div className="text-lg font-bold text-yellow-500">{stats.recent}</div>
              </div>
            </div>

            <button
              className={`hidden md:flex h-10 items-center gap-2 rounded-xl px-4 text-sm border transition-all duration-300 hover:scale-105 ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                  : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            
            <div className="md:hidden flex items-center gap-2">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <button className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-300 hover:scale-105 ${
                    theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                  }`}>
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className={`w-[90vw] sm:w-[380px] border-r ${
                  theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
                }`}>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filters
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <Label className={`mb-3 block text-sm font-medium flex items-center gap-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        Time Range
                      </Label>
                      <select
                        className={`w-full rounded-lg border p-3 text-sm transition-all ${
                          theme === 'dark' 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-black'
                        }`}
                        value={pendingRange}
                        onChange={(e) => setPendingRange(e.target.value as TimeRange)}
                      >
                        <option value="day">Past Day</option>
                        <option value="hour">Past Hour</option>
                        <option value="week">Past 7 Days</option>
                        <option value="month">Past 30 Days</option>
                      </select>
                    </div>
                    <div>
                      <Label className={`mb-3 block text-sm font-medium flex items-center gap-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <TrendingUp className="w-4 h-4" />
                        Min Magnitude
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={0.1}
                        value={pendingMinMag}
                        onChange={(e) => setPendingMinMag(parseFloat(e.target.value))}
                        className={`${
                          theme === 'dark' 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-black'
                        }`}
                      />
                    </div>
                    <div>
                      <Label className={`mb-3 block text-sm font-medium flex items-center gap-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        <Search className="w-4 h-4" />
                        Search Location
                      </Label>
                      <Input
                        placeholder="e.g., California, Alaska..."
                        value={pendingQuery}
                        onChange={(e) => setPendingQuery(e.target.value)}
                        className={`${
                          theme === 'dark' 
                            ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-500' 
                            : 'bg-white border-gray-300 text-black placeholder:text-gray-500'
                        }`}
                      />
                    </div>
                    <button
                      className={`w-full flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                        theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                      onClick={() => { 
                        setRange(pendingRange); 
                        setMinMag(pendingMinMag); 
                        setQuery(pendingQuery); 
                        setSidebarOpen(false); 
                        setSelected(null); 
                        setAutoFitEnabled(true); 
                      }}
                    >
                      <Zap className="w-4 h-4" />
                      Apply Filters
                    </button>
                    <div className={`text-center p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="text-2xl font-bold text-green-500">{filtered.length}</div>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>earthquake events found</div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet open={eventsOpen} onOpenChange={setEventsOpen}>
                <SheetTrigger asChild>
                  <button className={`flex h-10 items-center gap-2 rounded-xl px-4 text-sm border transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' 
                      : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                  }`}>
                    <List className="w-4 h-4" />
                    Events
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className={`w-[92vw] sm:w-[420px] border-l ${
                  theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
                }`}>
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <List className="w-5 h-5" />
                      Recent Events
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
                    {pageItems.map((f) => {
                      const timeLabel = f.properties.time ? new Date(f.properties.time).toLocaleString() : '—'
                      const mag = f.properties.mag ?? 0
                      const isActive = selected?.id === f.id
                      const magColor = getMagnitudeColorClass(mag)
                      
                      return (
                        <button
                          key={f.id}
                          onClick={() => { 
                            suppressFitRef.current = true; 
                            setAutoFitEnabled(false); 
                            setSelected(f); 
                            setDetailsOpen(false) 
                          }}
                          className={`w-full rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] border ${
                            isActive 
                              ? theme === 'dark' 
                                ? 'border-white bg-gray-800' 
                                : 'border-black bg-gray-100'
                              : theme === 'dark'
                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                                : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium truncate max-w-[240px]">{f.properties.place ?? 'Unknown Location'}</div>
                            <div className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-3 text-xs font-bold ${magColor}`}>
                              M {mag.toFixed(1)}
                            </div>
                          </div>
                          <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <Calendar className="w-3 h-3" />
                            {timeLabel}
                          </div>
                        </button>
                      )
                    })}
                    <div className="pt-4 flex items-center justify-center gap-2 text-sm">
                      {getPageNumbers(page, totalPages).map((p) => (
                        <button
                          key={p}
                          className={`w-8 h-8 rounded-lg font-medium transition-all ${
                            p === page 
                              ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                              : theme === 'dark' 
                                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                                : 'text-gray-600 hover:text-black hover:bg-gray-200'
                          }`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-[340px_1fr_380px] h-[calc(100vh-89px)]">
        {/* Sidebar (visible on md+) */}
        <aside className={`hidden md:block border-r p-6 overflow-y-auto ${
          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
        }`}>
          <div className="space-y-6">
            <div className={`text-center p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
            }`}>
              <h3 className="font-bold text-lg mb-2">Live Statistics</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{stats.total}</div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">M{stats.maxMag.toFixed(1)}</div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Max</div>
                </div>
              </div>
            </div>

            <div>
              <div className={`text-sm font-medium mb-3 flex items-center gap-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Calendar className="w-4 h-4" />
                Time Range
              </div>
              <select
                className={`w-full rounded-lg border p-3 text-sm transition-all ${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-black'
                }`}
                value={pendingRange}
                onChange={(e) => setPendingRange(e.target.value as TimeRange)}
              >
                <option value="day">Past Day</option>
                <option value="hour">Past Hour</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>
            </div>
            <div>
              <div className={`text-sm font-medium mb-3 flex items-center gap-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <TrendingUp className="w-4 h-4" />
                Min Magnitude
              </div>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={pendingMinMag}
                onChange={(e) => setPendingMinMag(parseFloat(e.target.value))}
                className={`${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-black'
                }`}
              />
            </div>
            <div>
              <div className={`text-sm font-medium mb-3 flex items-center gap-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <Search className="w-4 h-4" />
                Search Location
              </div>
              <Input
                placeholder="e.g., California, Alaska..."
                value={pendingQuery}
                onChange={(e) => setPendingQuery(e.target.value)}
                className={`${
                  theme === 'dark' 
                    ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-500' 
                    : 'bg-white border-gray-300 text-black placeholder:text-gray-500'
                }`}
              />
            </div>
            <button
              className={`w-full flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
              }`}
              onClick={() => { 
                setRange(pendingRange); 
                setMinMag(pendingMinMag); 
                setQuery(pendingQuery); 
                setSelected(null); 
                setAutoFitEnabled(true); 
              }}
            >
              <Zap className="w-4 h-4" />
              Apply Filters
            </button>
            <div className={`text-center p-3 rounded-lg border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="text-2xl font-bold text-green-500">{filtered.length}</div>
              <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>earthquake events found</div>
            </div>
          </div>
        </aside>

        {/* Map area */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
              {loading && (
               <div className={`absolute top-4 right-4 z-[1000] flex items-center gap-3 rounded-xl px-4 py-3 text-sm border ${
                theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium">Loading earthquake data...</span>
              </div>
            )}
              {!loading && filtered.length === 0 && !error && (
               <div className={`absolute top-4 right-4 z-[1000] flex items-center gap-3 rounded-xl px-4 py-3 text-sm border ${
                theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
              }`}>
                <Search className="w-4 h-4 text-yellow-500" />
                <span>No earthquakes match your filters</span>
              </div>
            )}
            <MapContainer
              center={[20, 0]}
              zoom={2}
              minZoom={2}
              className="h-full w-full"
              worldCopyJump
            >
              {theme === 'dark' ? (
                <>
                  {/* Esri World Dark Gray Canvas base */}
                  <TileLayer
                    attribution='Tiles &copy; Esri — Esri, HERE, Garmin, FAO, NOAA, USGS, EPA, NPS'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                    opacity={0.95}
                  />
                  {/* Reference labels layer */}
                  <TileLayer
                    attribution='Labels &copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                    opacity={0.9}
                  />
                </>
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              )}
              {!loading && !error && (
                <>
                  <MarkerClusterGroup chunkedLoading>
                    {filtered.map((f) => {
                      const [lon, lat, depth] = f.geometry.coordinates
                      const mag = f.properties.mag ?? 0
                      const radius = Math.max(3, mag * 1.5)
                      const color = getMagnitudeColor(mag)
                      
                      return (
                        <CircleMarker 
                          key={f.id} 
                          center={[lat, lon]} 
                          radius={radius} 
                          pathOptions={{ 
                            color: selected?.id === f.id ? (theme === 'dark' ? 'white' : 'black') : color,
                            fillColor: selected?.id === f.id ? (theme === 'dark' ? 'white' : 'black') : color,
                            fillOpacity: 0.8, 
                            weight: selected?.id === f.id ? 4 : 2,
                            className: selected?.id === f.id ? 'earthquake-marker-selected' : 'earthquake-marker'
                          }} 
                          eventHandlers={{ 
                            click: () => { 
                              suppressFitRef.current = true; 
                              setAutoFitEnabled(false); 
                              setSelected(f); 
                              setDetailsOpen(false) 
                            } 
                          }}
                        >
                          <Popup className="earthquake-popup">
                            <div className={`space-y-2 text-sm p-2 rounded-lg ${
                              theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-black'
                            }`}>
                              <div className="font-medium flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getMagnitudeColorClass(mag).split(' ')[0]}`}></div>
                                M {mag.toFixed(1)} — {f.properties.place ?? 'Unknown'}
                              </div>
                              <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>Depth: {depth.toFixed(0)} km</div>
                              {f.properties.time && (
                                <div className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{new Date(f.properties.time).toLocaleString()}</div>
                              )}
                              {f.properties.url && (
                                <a className="text-blue-500 underline hover:text-blue-700" href={f.properties.url} target="_blank" rel="noreferrer">
                                  View Details →
                                </a>
                              )}
                            </div>
                          </Popup>
                        </CircleMarker>
                      )
                    })}
                  </MarkerClusterGroup>
                  <FitBounds points={pointsMemo} disabled={!autoFitEnabled} />
                  <MapSelectionSync feature={selected} />
                </>
              )}
            </MapContainer>
          </div>
        </section>

        {/* Events List panel (desktop) */}
        <aside className={`hidden md:flex flex-col border-l p-4 overflow-hidden ${
          theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
        }`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <Activity className="w-5 h-5" />
              Recent Events
            </div>
            <div className={`text-xs flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <MapPin className="w-3 h-3" />
              Sorted by time
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {pageItems.map((f) => {
              const timeLabel = f.properties.time ? new Date(f.properties.time).toLocaleString() : '—'
              const mag = f.properties.mag ?? 0
              const isActive = selected?.id === f.id
              const magColor = getMagnitudeColorClass(mag)
              const depth = f.geometry.coordinates[2]
              
              return (
                <button
                  key={f.id}
                  onClick={() => { 
                    suppressFitRef.current = true; 
                    setAutoFitEnabled(false); 
                    setSelected(f); 
                    setDetailsOpen(false) 
                  }}
                  className={`w-full rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] border group ${
                    isActive 
                      ? theme === 'dark' 
                        ? 'border-white bg-gray-800' 
                        : 'border-black bg-gray-100'
                      : theme === 'dark'
                        ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="font-medium truncate max-w-[200px]">
                      {f.properties.place ?? 'Unknown Location'}
                    </div>
                    <div className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-3 text-xs font-bold ${magColor}`}>
                      M {mag.toFixed(1)}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className={`flex items-center justify-between ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {timeLabel.split(',')[0]}
                      </div>
                      <div className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                        {depth.toFixed(0)}km deep
                      </div>
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {timeLabel.split(',')[1]?.trim()}
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}>
                      <div className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>← Selected on map</div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          
          <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
            <div className="flex items-center justify-center gap-2 text-sm">
              {page > 1 && (
                <button 
                  className={`px-3 py-1 rounded-lg transition-all ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-200'
                  }`} 
                  onClick={() => setPage(page - 1)}
                >
                  ← Prev
                </button>
              )}
              
              {getPageNumbers(page, totalPages).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 rounded-lg font-medium transition-all ${
                    p === page 
                      ? theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                      : theme === 'dark' 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                        : 'text-gray-600 hover:text-black hover:bg-gray-200'
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              
              {page < totalPages && (
                <button 
                  className={`px-3 py-1 rounded-lg transition-all ${
                    theme === 'dark' 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-200'
                  }`} 
                  onClick={() => setPage(page + 1)}
                >
                  Next →
                </button>
              )}
            </div>
            
            <div className={`mt-3 text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Page {page} of {totalPages} • {filtered.length} total events
            </div>
          </div>
        </aside>
      </main>

      {/* Details Dialog */}
      <Dialog open={detailsOpen && !!selected} onOpenChange={(open) => { if (!open) setSelected(null); setDetailsOpen(open) }}>
        <DialogContent className={`border ${
          theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'
        }`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                {selected ? (
                  <div>
                    <div className="text-lg">
                      M {selected.properties.mag?.toFixed(1) ?? '-'} Earthquake
                    </div>
                    <div className={`text-sm font-normal ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selected.properties.place ?? 'Unknown Location'}
                    </div>
                  </div>
                ) : 'Event Details'}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Magnitude</div>
                  <div className="text-2xl font-bold text-red-500">M {selected.properties.mag?.toFixed(1) ?? '-'}</div>
                </div>
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Depth</div>
                  <div className="text-2xl font-bold text-yellow-500">{selected.geometry.coordinates[2].toFixed(0)} km</div>
                </div>
              </div>
              
              {selected.properties.time && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className={`text-xs mb-2 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar className="w-3 h-3" />
                    Time of Occurrence
                  </div>
                  <div className="text-lg font-medium">
                    {new Date(selected.properties.time).toLocaleString()}
                  </div>
                </div>
              )}
              
              {typeof selected.properties.sig === 'number' && (
                <div className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Significance Score</div>
                  <div className="text-lg font-medium text-green-500">{selected.properties.sig}</div>
                </div>
              )}
              
              <div className={`p-3 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                <div className={`text-xs mb-2 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <MapPin className="w-3 h-3" />
                  Coordinates
                </div>
                <div className="text-sm font-mono">
                  {selected.geometry.coordinates[1].toFixed(4)}°, {selected.geometry.coordinates[0].toFixed(4)}°
                </div>
              </div>
              
              {selected.properties.url && (
                <div className="pt-2">
                  <a 
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 ${
                      theme === 'dark' ? 'bg-white text-black' : 'bg-black text-white'
                    }`} 
                    href={selected.properties.url} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    <Activity className="w-4 h-4" />
                    View on USGS
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <style jsx global>{`
        .earthquake-marker {
          animation: pulse-glow 2s ease-in-out infinite alternate;
        }
        
        .earthquake-marker-selected {
          animation: pulse-selected 1s ease-in-out infinite alternate;
        }
        
        @keyframes pulse-glow {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
        
        @keyframes pulse-selected {
          from { opacity: 0.8; }
          to { opacity: 1; }
        }
        
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
        }
        
        .leaflet-popup-content {
          margin: 0 !important;
        }
        
        .leaflet-popup-tip {
          background: ${theme === 'dark' ? 'rgb(17 24 39)' : 'rgb(255 255 255)'} !important;
        }
      `}</style>
    </div>
  )
}

export default App