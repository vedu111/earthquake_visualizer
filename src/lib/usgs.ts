import type { EarthquakeGeoJSON, TimeRange } from '@/types/earthquake'

const FEED_BY_RANGE: Record<TimeRange, string> = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
}

export async function fetchEarthquakes(range: TimeRange): Promise<EarthquakeGeoJSON> {
  const url = FEED_BY_RANGE[range]
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`USGS request failed: ${response.status}`)
  }
  return (await response.json()) as EarthquakeGeoJSON
}

