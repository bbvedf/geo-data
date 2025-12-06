// src/components/types.ts
export interface CovidLocation {
  lat: number
  lon: number
  comunidad: string
  casos: number
  fecha?: string
  provincia?: string
}

export interface WeatherLocation {
  lat: number
  lon: number
  city: string
  temperature: number
  weather_main: string
  weather_description: string
  weather_icon: string
  humidity: number
  wind_speed: number
  timestamp: string
  country?: string
}

// Interface actualizada para soportar tanto datos light como completos
export interface ElectionLocation {
  codigo_ine: string  // ✅ AÑADIDO
  lat: number
  lon: number
  nombre_municipio: string
  nombre_provincia: string
  poblacion: number
  participacion: number
  partido_ganador: string
  
  // Campos opcionales (solo en datos completos)
  nombre_comunidad?: string
  votos_ganador?: number
  pp?: number
  psoe?: number
  vox?: number
  sumar?: number
  erc?: number
  jxcat_junts?: number
  eh_bildu?: number
  eaj_pnv?: number
  bng?: number
  cca?: number
  upn?: number
  pacma?: number
  cup_pr?: number
  fo?: number
  created_at?: string
}

export type MapDataType = CovidLocation | WeatherLocation | ElectionLocation;
export type MapType = 'covid' | 'weather' | 'elections';

// Type guards
export function isWeatherData(data: MapDataType[]): data is WeatherLocation[] {
  return data.length > 0 && 'temperature' in data[0]
}

export function isCovidData(data: MapDataType[]): data is CovidLocation[] {
  return data.length > 0 && 'casos' in data[0]
}

export function isElectionData(data: MapDataType[]): data is ElectionLocation[] {
  return data.length > 0 && 'partido_ganador' in data[0]
}