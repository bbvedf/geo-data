import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

interface Location {
  lat: number
  lon: number
  comunidad: string
  casos: number
  fecha?: string
}

interface VanillaMapProps {
  data: Location[]
  height?: string
}

export default function VanillaMap({ data, height = '500px' }: VanillaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup>(L.layerGroup())

  // Fix para iconos
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

    // Calcular radio máximo para normalizar
    const maxCasos = Math.max(...data.map(d => d.casos))
    
    data.forEach(location => {
      // Calcular radio proporcional
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
        <div style="padding: 8px;">
          <h3 style="font-weight: bold; font-size: 1.125rem;">${location.comunidad}</h3>
          <p style="color: #dc2626; font-weight: 600;">
            Casos: ${location.casos.toLocaleString()}
          </p>
          ${location.fecha ? `<p style="color: #6b7280; font-size: 0.875rem;">Fecha: ${location.fecha}</p>` : ''}
          <p style="color: #6b7280; font-size: 0.875rem;">
            Coordenadas: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
          </p>
        </div>
      `)

      circle.addTo(markersRef.current)
    })

    // Ajustar vista a todos los marcadores
    if (data.length > 0) {
      const bounds = data.map(d => [d.lat, d.lon] as [number, number])
      const latLngBounds = L.latLngBounds(bounds)
      mapInstance.current.fitBounds(latLngBounds.pad(0.1))
    }

  }, [data])

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
