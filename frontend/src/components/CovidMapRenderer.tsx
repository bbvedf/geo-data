// src/components/CovidMapRenderer.tsx
import { useEffect, useRef } from 'react'; // AÑADIR
import L from 'leaflet';
import { CovidLocation } from './types';

interface CovidMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: CovidLocation[];
}

export default function CovidMapRenderer({ map, markers, data }: CovidMapRendererProps) {
  const hasSetView = useRef(false); // AÑADIR
  
  useEffect(() => { // AÑADIR useEffect
    // Limpiar marcadores anteriores
    markers.clearLayers();

    // Si no hay datos, no hacer nada
    if (!data || data.length === 0) {
      console.log('CovidMapRenderer: No hay datos');
      return;
    }

    console.log(`CovidMapRenderer: Procesando ${data.length} ubicaciones`);

    // LIMITAR datos si son muchos
    const limitedData = data.length > 2000 ? data.slice(0, 2000) : data;
    
    const maxCasos = Math.max(...limitedData.map(d => d.casos));
    const bounds: [number, number][] = [];
    let sinCoordenadas = 0;

    limitedData.forEach(location => {
      // Verificar coordenadas
      if (!location.lat || !location.lon || isNaN(location.lat) || isNaN(location.lon)) {
        sinCoordenadas++;
        return;
      }

      bounds.push([location.lat, location.lon]);

      const radius = (location.casos / maxCasos) * 20 + 5;
      
      // Color basado en casos
      let color = '#10b981'; // verde
      if (location.casos > 1800) color = '#dc2626';
      else if (location.casos > 1600) color = '#ea580c';
      else if (location.casos > 1400) color = '#f59e0b';

      const circle = L.circleMarker([location.lat, location.lon], {
        radius,
        fillColor: color,
        color: '#1f2937',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6,
      });

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
      console.warn(`${sinCoordenadas} ubicaciones COVID sin coordenadas válidas fueron omitidas`);
    }
    
    if (data.length > 2000) {
      console.warn(`CovidMapRenderer: Limitados a 2000 de ${data.length} ubicaciones`);
    }

    return () => {
      // Limpieza al desmontar
      markers.clearLayers();
      hasSetView.current = false;
    };
  }, [map, markers, data]); // Dependencias

  return null;
}