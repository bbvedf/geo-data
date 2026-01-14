// /home/bbvedf/prog/geo-data/frontend/src/components/CovidMapRenderer.tsx
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { CovidLocation } from './types';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/geo',
});

interface CovidMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: CovidLocation[];
}

// Popup ligero inicial
const createLightPopup = (location: CovidLocation, color: string): string => {
  return `
    <div style="padding: 10px; min-width: 200px;">
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
      ${location.provincia ? `<p style="color: #6b7280; font-size: 0.875rem;">Provincia: ${location.provincia}</p>` : ''}
      <p style="color: #666; font-size: 12px; margin-top: 10px;">Haz clic para ver detalles completos...</p>
    </div>
  `;
};

// Popup completo (con todos los datos)
const createFullPopup = (fullData: any, color: string): string => {
  return `
    <div style="padding: 12px; min-width: 240px;">
      <h3 style="font-weight: bold; font-size: 1.125rem; margin-bottom: 10px; color: #1f2937; border-bottom: 2px solid ${color}; padding-bottom: 6px;">
        ${fullData.comunidad}
      </h3>
      
      <div style="margin-bottom: 10px;">
        <div style="display: flex; align-items: center; margin-bottom: 6px;">
          <div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; margin-right: 8px;"></div>
          <span style="color: #dc2626; font-weight: 600;">
            Casos: ${fullData.casos.toLocaleString()}
          </span>
        </div>
        ${fullData.fecha ? `<p style="margin: 4px 0; color: #6b7280; font-size: 0.875rem;">📅 Fecha: ${fullData.fecha}</p>` : ''}
        ${fullData.provincia ? `<p style="margin: 4px 0; color: #6b7280; font-size: 0.875rem;">📍 Provincia: ${fullData.provincia}</p>` : ''}
      </div>
      
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
        ${fullData.ingresos_uci !== undefined ? `
          <div style="margin-bottom: 6px;">
            <span style="color: #f59e0b; font-weight: 600;">🏥 UCI:</span> ${fullData.ingresos_uci?.toLocaleString() || 'N/A'}
          </div>
        ` : ''}
        ${fullData.fallecidos !== undefined ? `
          <div style="margin-bottom: 6px;">
            <span style="color: #dc2626; font-weight: 600;">💀 Fallecidos:</span> ${fullData.fallecidos?.toLocaleString() || 'N/A'}
          </div>
        ` : ''}
        ${fullData.altas !== undefined ? `
          <div>
            <span style="color: #10b981; font-weight: 600;">✅ Altas:</span> ${fullData.altas?.toLocaleString() || 'N/A'}
          </div>
        ` : ''}
      </div>
      
      <p style="color: #9ca3af; font-size: 11px; margin: 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
        Coordenadas: ${fullData.lat.toFixed(4)}, ${fullData.lon.toFixed(4)}
      </p>
    </div>
  `;
};

export default function CovidMapRenderer({ map, markers, data }: CovidMapRendererProps) {
  const hasSetView = useRef(false);
  const loadedDetailsRef = useRef<Set<number>>(new Set());

  // Función para cargar detalle completo
  const loadCaseDetail = async (caseId: number) => {
    if (loadedDetailsRef.current.has(caseId)) return null;
    
    try {
      const response = await api.get(`/api/covid/case/${caseId}`);
      loadedDetailsRef.current.add(caseId);
      return response.data.data;
    } catch (error) {
      console.error('Error cargando detalle del caso:', error);
      return null;
    }
  };

  const renderMarkers = useCallback(() => {
    markers.clearLayers();

    if (!data || data.length === 0) {
      console.log('CovidMapRenderer: No hay datos');
      return;
    }

    console.log(`CovidMapRenderer: Procesando ${data.length} ubicaciones`);

    // Limitar datos si son muchos
    const limitedData = data.length > 2000 ? data.slice(0, 2000) : data;
    
    const maxCasos = Math.max(...limitedData.map(d => d.casos));
    const bounds: [number, number][] = [];
    let sinCoordenadas = 0;

    limitedData.forEach(location => {
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
      } as any);

      // Guardar ID en el marker
      (circle as any).options.case_id = location.id;

      // Popup inicial ligero
      const initialPopup = createLightPopup(location, color);
      const popup = L.popup({
        maxWidth: 300,
        minWidth: 250,
        autoPan: true,
        autoPanPadding: [50, 50]
      }).setContent(initialPopup);

      circle.bindPopup(popup);

      // Al abrir popup, cargar datos completos
      circle.on('popupopen', async () => {
        const caseId = (circle as any).options.case_id;
        
        if (!caseId) {
          return; // Sin ID, no se puede cargar detalle
        }

        // Mostrar loading
        popup.setContent(`
          <div style="padding: 20px; text-align: center;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <style>
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <p style="margin-top: 10px;">Cargando detalles...</p>
          </div>
        `);

        // Cargar datos completos
        const fullData = await loadCaseDetail(caseId);
        
        if (fullData) {
          popup.setContent(createFullPopup(fullData, color));
        } else {
          popup.setContent(initialPopup + '<p style="color: red;">Error cargando datos completos</p>');
        }
      });

      circle.addTo(markers);
    });

    // Ajustar vista SOLO UNA VEZ
    if (bounds.length > 0 && !hasSetView.current) {
      setTimeout(() => {
        const latLngBounds = L.latLngBounds(bounds);
        map.fitBounds(latLngBounds.pad(0.1), {
          animate: false,
          duration: 0
        });
        hasSetView.current = true;
      }, 100);
    }

    if (sinCoordenadas > 0) {
      console.warn(`${sinCoordenadas} ubicaciones sin coordenadas válidas fueron omitidas`);
    }
    
    if (data.length > 2000) {
      console.warn(`CovidMapRenderer: Limitados a 2000 de ${data.length} ubicaciones`);
    }
  }, [map, markers, data]);

  useEffect(() => {
    if (!map || !markers) return;

    const timer = setTimeout(() => {
      renderMarkers();
    }, 100);

    return () => {
      clearTimeout(timer);
      markers.clearLayers();
      hasSetView.current = false;
    };
  }, [map, markers, data, renderMarkers]);

  useEffect(() => {
    return () => {
      markers.clearLayers();
      loadedDetailsRef.current.clear();
    };
  }, [markers]);

  return null;
}