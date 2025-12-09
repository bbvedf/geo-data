// src/components/types.ts
export interface CovidLocation {
  id?: number  // ✅ AÑADIDO para fetch individual
  lat: number
  lon: number
  comunidad: string
  casos: number
  fecha?: string
  provincia?: string
  ingresos_uci?: number
  fallecidos?: number
  altas?: number
  created_at?: string
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

// ✅ Interface completa para calidad del aire
export interface AirQualityStation {
  id: number
  station_code: string
  eoi_code: string
  name: string
  country_code: string
  country: string
  station_class: number
  station_type: string  // ✅ AÑADIDO: TRAFICO, INDUSTRIAL, FONDO
  lat: number
  lon: number
  available_pollutants: string[]
  
  // Campos de medición
  last_measurement?: number
  last_aqi?: number
  pollutant?: string
  unit?: string
  quality_text?: string
  quality_color?: string
  recommendation?: string
  last_updated: string
  
  // Campos de estado
  is_mock?: boolean
  has_real_data?: boolean
  is_active?: boolean  // ✅ AÑADIDO: true/false
  
  // Campos específicos MITECO
  data_source?: string
  measurement_timestamp?: string
  ica_index?: number
  ica_contaminant?: string
  
  // Para modo light (opcional)
  station_code_short?: string
}

export type MapDataType = CovidLocation | WeatherLocation | ElectionLocation | AirQualityStation;
export type MapType = 'covid' | 'weather' | 'elections' | 'air-quality';

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

export function isAirQualityData(data: MapDataType[]): data is AirQualityStation[] {
  return data.length > 0 && 'station_code' in data[0]
}