// src/components/types.ts (versión completa corregida)
export interface CovidLocation {
  id?: number
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

export interface ElectionLocation {
  codigo_ine: string
  lat: number
  lon: number
  nombre_municipio: string
  nombre_provincia: string
  poblacion: number
  participacion: number
  partido_ganador: string
  
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

export interface AirQualityStation {
  id: number
  station_code: string
  eoi_code: string
  name: string
  country_code: string
  country: string
  station_class: number
  station_type: string
  lat: number
  lon: number
  available_pollutants: string[]
  
  last_measurement?: number
  last_aqi?: number
  pollutant?: string
  unit?: string
  quality_text?: string
  quality_color?: string
  recommendation?: string
  last_updated: string
  
  is_mock?: boolean
  has_real_data?: boolean
  is_active?: boolean
  
  data_source?: string
  measurement_timestamp?: string
  ica_index?: number
  ica_contaminant?: string
  
  station_code_short?: string
}

// Versión ligera para listas
export interface AirQualityStationLight {
  id: number;
  name: string;
  lat: number;
  lon: number;
  last_aqi: number | null;
  quality_color: string | null;
  pollutant: string | null;
  station_code: string;
  is_active: boolean;
  station_class: string | null;
  station_type: string | null;
}

// Estadísticas
export interface AirQualityStats {
  pollutant: string;
  description: string;
  total_stations: number;
  stations_with_data: number;
  avg_concentration: number;
  min_concentration: number;
  max_concentration: number;
  quality_distribution: Record<string, number>;
  timestamp: string;
  is_mock_data: boolean;
}

// Alias para compatibilidad
export type AirQualityStationFull = AirQualityStation;

// ACTUALIZADO: Ahora incluye AirQualityStationLight
export type MapDataType = 
  | CovidLocation 
  | WeatherLocation 
  | ElectionLocation 
  | AirQualityStation
  | AirQualityStationLight;
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

export function isAirQualityData(data: MapDataType[]): data is AirQualityStation[] | AirQualityStationLight[] {
  if (data.length === 0) return false;
  const item = data[0];
  return 'station_code' in item && ('available_pollutants' in item || 'last_aqi' in item);
}

export function isAirQualityLightData(data: MapDataType[]): data is AirQualityStationLight[] {
  if (data.length === 0) return false;
  const item = data[0];
  return 'name' in item && 'station_code' in item && 'last_aqi' in item && !('available_pollutants' in item);
}