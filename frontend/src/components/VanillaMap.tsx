import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Interfaces para ambos tipos de datos
interface CovidLocation {
  lat: number
  lon: number
  comunidad: string
  casos: number
  fecha?: string
  provincia?: string
}

interface WeatherLocation {
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

// Type guard para verificar tipo de datos
function isWeatherData(data: any[]): data is WeatherLocation[] {
  return data.length > 0 && 'temperature' in data[0]
}

function isCovidData(data: any[]): data is CovidLocation[] {
  return data.length > 0 && 'casos' in data[0]
}

interface VanillaMapProps {
  data: (CovidLocation | WeatherLocation)[]
  height?: string
  type?: 'covid' | 'weather' | 'auto'
}

export default function VanillaMap({ data, height = '500px', type = 'auto' }: VanillaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup>(L.layerGroup())

  // Determinar tipo de datos
  const dataType = type === 'auto' 
    ? (data.length > 0 && 'temperature' in data[0] ? 'weather' : 'covid')
    : type

  // Fix para iconos de Leaflet
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current).setView([40.4168, -3.7038], 6)
    mapInstance.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)

    markersRef.current.addTo(map)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Actualizar marcadores cuando cambian datos
  useEffect(() => {
    if (!mapInstance.current || !data.length) return

    markersRef.current.clearLayers()

    if (dataType === 'covid' && isCovidData(data)) {
      // MODO COVID - Círculos proporcionales a casos
      const maxCasos = Math.max(...data.map(d => d.casos))
      
      data.forEach(location => {
        const radius = (location.casos / maxCasos) * 20 + 5
        
        // Color basado en casos
        let color = '#10b981' // verde
        if (location.casos > 1800) color = '#dc2626'
        else if (location.casos > 1600) color = '#ea580c'
        else if (location.casos > 1400) color = '#f59e0b'

        const circle = L.circleMarker([location.lat, location.lon], {
          radius,
          fillColor: color,
          color: '#1f2937',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.6,
        })

        circle.bindPopup(`
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="font-weight: bold; font-size: 1.125rem; margin-bottom: 8px;">
              ${location.comunidad}
            </h3>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></div>
              <span style="color: #dc2626; font-weight: 600;">
                Casos: ${location.casos.toLocaleString()}
              </span>
            </div>
            ${location.fecha ? `<p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 4px;">Fecha: ${location.fecha}</p>` : ''}
            ${location.provincia ? `<p style="color: #6b7280; font-size: 0.875rem; margin-bottom: 4px;">Provincia: ${location.provincia}</p>` : ''}
            <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">
              Coordenadas: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
            </p>
          </div>
        `)

        circle.addTo(markersRef.current)
      })

    } else if (dataType === 'weather' && isWeatherData(data)) {
      // MODO CLIMA - Iconos y colores por temperatura
      
      // Encontrar min/max temperatura para escala de color
      const temperatures = data.map(d => d.temperature)
      const minTemp = Math.min(...temperatures)
      const maxTemp = Math.max(...temperatures)
      
      data.forEach(location => {
        // Color basado en temperatura
        let color = '#3b82f6' // azul - frío
        if (location.temperature >= 25) color = '#dc2626' // rojo - calor
        else if (location.temperature >= 15) color = '#f59e0b' // naranja - templado
        else if (location.temperature >= 5) color = '#28a745' // verde - fresco

        // Radio basado en temperatura (normalizado)
        const tempRange = maxTemp - minTemp
        const normalizedTemp = tempRange > 0 ? (location.temperature - minTemp) / tempRange : 0.5
        const radius = normalizedTemp * 15 + 8 // Entre 8 y 23 px

        const circle = L.circleMarker([location.lat, location.lon], {
          radius,
          fillColor: color,
          color: '#1f2937',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.7,
        })

        // Icono del tiempo (usando emoji como fallback)
        const weatherIcon = getWeatherIcon(location.weather_icon)
        
        circle.bindPopup(`
          <div style="padding: 10px; min-width: 220px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 1.5rem; margin-right: 10px;">${weatherIcon}</span>
              <div>
                <h3 style="font-weight: bold; font-size: 1.125rem; margin: 0;">
                  ${location.city}
                </h3>
                <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">
                  ${location.country || 'ES'}
                </p>
              </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 50%; margin-right: 6px;"></div>
                <span style="font-weight: 600; color: ${color};">${location.temperature}°C</span>
              </div>
              <div style="color: #6b7280; font-size: 0.875rem;">
                <div style="display: flex; align-items: center;">
                  💧 ${location.humidity}%
                </div>
              </div>
              <div style="color: #6b7280; font-size: 0.875rem;">
                <div style="display: flex; align-items: center;">
                  💨 ${location.wind_speed} m/s
                </div>
              </div>
              <div style="color: #6b7280; font-size: 0.875rem;">
                ${location.weather_description}
              </div>
            </div>
            
            <p style="color: #9ca3af; font-size: 0.75rem; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 6px;">
              Actualizado: ${new Date(location.timestamp).toLocaleTimeString()}
              <br/>
              Coordenadas: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
            </p>
          </div>
        `)

        circle.addTo(markersRef.current)
      })
    }

    // Ajustar vista a todos los marcadores
    if (data.length > 0) {
      const bounds = data.map(d => [d.lat, d.lon] as [number, number])
      const latLngBounds = L.latLngBounds(bounds)
      mapInstance.current.fitBounds(latLngBounds.pad(0.1))
    }

  }, [data, dataType])

  // Función para obtener emoji según icono de OpenWeatherMap
  function getWeatherIcon(iconCode: string): string {
    const iconMap: Record<string, string> = {
      '01d': '☀️', '01n': '🌙',  // clear sky
      '02d': '⛅', '02n': '☁️',  // few clouds
      '03d': '☁️', '03n': '☁️',  // scattered clouds
      '04d': '☁️', '04n': '☁️',  // broken clouds
      '09d': '🌧️', '09n': '🌧️', // shower rain
      '10d': '🌦️', '10n': '🌦️', // rain
      '11d': '⛈️', '11n': '⛈️',  // thunderstorm
      '13d': '❄️', '13n': '❄️',  // snow
      '50d': '🌫️', '50n': '🌫️', // mist
    }
    
    return iconMap[iconCode] || '🌡️'
  }

  return (
    <div style={{ height, width: '100%' }}>
      <div 
        ref={mapRef} 
        style={{ 
          height: '100%', 
          width: '100%', 
          borderRadius: '8px',
          zIndex: 1 
        }}
      />
    </div>
  )
}