export type TimeRange = 'hour' | 'day' | 'week' | 'month'

export interface EarthquakeProperties {
  mag: number | null
  place: string | null
  time: number | null
  url: string | null
  tsunami?: number
  sig?: number
}

export interface EarthquakeFeature {
  id: string
  type: 'Feature'
  properties: EarthquakeProperties
  geometry: {
    type: 'Point'
    coordinates: [number, number, number] // [lon, lat, depth]
  }
}

export interface EarthquakeGeoJSON {
  type: 'FeatureCollection'
  features: EarthquakeFeature[]
}

