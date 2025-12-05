// src/components/WeatherMapRenderer.tsx
import { useEffect, useRef } from 'react'; // AÑADIR
import L from 'leaflet';
import { WeatherLocation } from './types';

interface WeatherMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: WeatherLocation[];
}

// Función para obtener emoji según icono de OpenWeatherMap
function getWeatherIcon(iconCode: string): string {
  const iconMap: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌦️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  
  return iconMap[iconCode] || '🌡️';
}

export default function WeatherMapRenderer({ map, markers, data }: WeatherMapRendererProps) {
  const hasSetView = useRef(false); // AÑADIR
  
  useEffect(() => { // AÑADIR useEffect
    // Limpiar marcadores anteriores
    markers.clearLayers();

    // Si no hay datos, no hacer nada
    if (!data || data.length === 0) {
      console.log('WeatherMapRenderer: No hay datos');
      return;
    }

    console.log(`WeatherMapRenderer: Procesando ${data.length} ubicaciones`);

    // LIMITAR datos si son muchos
    const limitedData = data.length > 1000 ? data.slice(0, 1000) : data;
    
    // Encontrar min/max temperatura para escala de color
    const temperatures = limitedData.map(d => d.temperature);
    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);
    
    const bounds: [number, number][] = [];
    let sinCoordenadas = 0;

    limitedData.forEach(location => {
      // Verificar coordenadas
      if (!location.lat || !location.lon || isNaN(location.lat) || isNaN(location.lon)) {
        sinCoordenadas++;
        return;
      }

      bounds.push([location.lat, location.lon]);

      // Color basado en temperatura
      let color = '#3b82f6'; // azul - frío
      if (location.temperature >= 25) color = '#dc2626'; // rojo - calor
      else if (location.temperature >= 15) color = '#f59e0b'; // naranja - templado
      else if (location.temperature >= 5) color = '#28a745'; // verde - fresco

      // Radio basado en temperatura (normalizado)
      const tempRange = maxTemp - minTemp;
      const normalizedTemp = tempRange > 0 ? (location.temperature - minTemp) / tempRange : 0.5;
      const radius = Math.min(normalizedTemp * 15 + 8, 20); // Máximo 20px

      const circle = L.circleMarker([location.lat, location.lon], {
        radius,
        fillColor: color,
        color: '#1f2937',
        weight: 1,
        opacity: 0.9,
        fillOpacity: 0.7,
      });

      // Icono del tiempo
      const weatherIcon = getWeatherIcon(location.weather_icon);
      
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
      `);

      circle.addTo(markers);
    });

    // Ajustar vista SOLO UNA VEZ
    if (bounds.length > 0 && !hasSetView.current) {
      setTimeout(() => {
        const latLngBounds = L.latLngBounds(bounds);
        map.fitBounds(latLngBounds.pad(0.1), {
          animate: false, // Sin animación para evitar bucle
          duration: 0
        });
        hasSetView.current = true;
      }, 100);
    }

    // Debug
    if (sinCoordenadas > 0) {
      console.warn(`${sinCoordenadas} ubicaciones de clima sin coordenadas válidas fueron omitidas`);
    }
    
    if (data.length > 1000) {
      console.warn(`WeatherMapRenderer: Limitados a 1000 de ${data.length} ubicaciones`);
    }

    return () => {
      // Limpieza al desmontar
      markers.clearLayers();
      hasSetView.current = false;
    };
  }, [map, markers, data]); // Dependencias

  return null;
}