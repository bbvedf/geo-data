// /home/bbvedf/prog/geo-data/frontend/src/components/AirQualityMapRenderer.tsx
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { AirQualityStation } from './types';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface AirQualityMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: AirQualityStation[];
}

const getAqiColor = (aqi: number | undefined): string => {
  if (!aqi || aqi < 1) return '#cccccc';
  const colors = ['#00e400', '#feca57', '#ff7e00', '#ff0000', '#8f3f97'];
  return colors[aqi - 1] || '#cccccc';
};

const getAqiText = (aqi: number | undefined): string => {
  if (!aqi) return 'Sin datos';
  const texts = ['Buena', 'Moderada', 'Mala', 'Muy Mala', 'Extremadamente Mala'];
  return texts[aqi - 1] || 'Sin datos';
};

// Popup ligero inicial
const createLightPopup = (station: AirQualityStation): string => {
  const aqiColor = getAqiColor(station.last_aqi);  
  const aqiText = getAqiText(station.last_aqi);
  
  return `
    <div style="padding: 12px; min-width: 220px;">
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <div style="width: 36px; height: 36px; background: ${aqiColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
          <span style="font-size: 1.25rem;"></span>
        </div>
        <div>
          <h4 style="margin: 0; font-size: 1rem;">${station.name || 'Estación'}</h4>
          <p style="margin: 0; color: #666; font-size: 0.875rem;">AQI: ${station.last_aqi || 'N/A'}</p>
        </div>
      </div>
      <div style="background: ${aqiColor}20; border: 1px solid ${aqiColor}; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
        <strong style="color: ${aqiColor};">${aqiText}</strong>
      </div>
      <p style="color: #666; font-size: 12px; margin: 0;">Haz clic para ver detalles completos...</p>
    </div>
  `;
};

// Popup completo (con todos los datos)
const createFullPopup = (fullData: any): string => {
  const aqiColor = getAqiColor(fullData.last_aqi);  
  const aqiText = getAqiText(fullData.last_aqi);
  
  const pollutantsList = fullData.available_pollutants && fullData.available_pollutants.length > 0
    ? fullData.available_pollutants.map((p: string) => `<span class="badge bg-secondary me-1">${p}</span>`).join('')
    : '<span class="text-muted">No especificado</span>';

  return `
    <div style="padding: 12px; min-width: 280px;">
      <div style="display: flex; align-items-flex-start; margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; background: ${aqiColor}; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
          <span style="font-size: 1.25rem;"></span>
        </div>
        <div>
          <h3 style="margin: 0 0 4px 0; font-size: 1.125rem;">${fullData.name || 'Estación'}</h3>
          <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">Código: ${fullData.station_code || 'N/A'}</p>
        </div>
      </div>
      
      <div style="background: ${aqiColor}20; border: 1px solid ${aqiColor}; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 1.5rem; margin-right: 8px;"></span>
          <div>
            <div style="font-weight: 600; color: ${aqiColor};">${aqiText} (AQI: ${fullData.last_aqi || 'N/A'})</div>
            ${fullData.last_measurement ? `
              <div style="color: #6b7280; font-size: 0.875rem;">
                ${fullData.pollutant || 'PM2.5'}: <strong>${fullData.last_measurement.toFixed(1)} ${fullData.unit || 'µg/m³'}</strong>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; font-size: 0.875rem;">
        <div>
          <strong>📍 Coordenadas</strong><br/>
          ${fullData.lat?.toFixed(4) || 'N/A'}, ${fullData.lon?.toFixed(4) || 'N/A'}
        </div>
        <div>
          <strong>🏷️ Clase</strong><br/>
          ${fullData.station_class ? `Clase ${fullData.station_class}` : 'N/A'}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 500; margin-bottom: 4px; font-size: 0.875rem;">🌫️ Contaminantes:</div>
        ${pollutantsList}
      </div>
      
      ${fullData.recommendation ? `
        <div style="background: #f9fafb; border-radius: 6px; padding: 10px; border-left: 3px solid ${aqiColor}; margin-bottom: 10px;">
          <div style="font-weight: 500; font-size: 0.875rem; margin-bottom: 4px;">💡 Recomendación:</div>
          <div style="color: #6b7280; font-size: 0.75rem;">${fullData.recommendation}</div>
        </div>
      ` : ''}
      
      <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 0.75rem; color: #9ca3af;">
        ${fullData.is_mock ? '📄 Datos simulados' : '🌍 Fuente: EEA'}
      </div>
    </div>
  `;
};

export default function AirQualityMapRenderer({ map, markers, data }: AirQualityMapRendererProps) {
  const hasSetView = useRef(false);
  const markerClusterRef = useRef<any>(null);
  const loadedDetailsRef = useRef<Set<number>>(new Set());

  // Cargar detalle completo de estación
  const loadStationDetail = async (stationId: number) => {
    if (loadedDetailsRef.current.has(stationId)) return null;
    
    try {
      const response = await api.get(`/api/air-quality/station/${stationId}`);
      loadedDetailsRef.current.add(stationId);
      return response.data.data;
    } catch (error) {
      console.error('Error cargando detalle estación:', error);
      return null;
    }
  };

  const clearClusters = useCallback(() => {
    if (markerClusterRef.current) {
      try {
        markerClusterRef.current.clearLayers();
        if (markers.hasLayer(markerClusterRef.current)) {
          markers.removeLayer(markerClusterRef.current);
        }
        markerClusterRef.current = null;
      } catch (error) {
        console.warn('Error limpiando clusters:', error);
      }
    }
  }, [markers]);

  useEffect(() => {
    markers.clearLayers();
    clearClusters();

    if (!data || data.length === 0) {
      console.log('AirQualityMapRenderer: No hay datos');
      return;
    }

    console.log(`AirQualityMapRenderer: Procesando ${data.length} estaciones`);

    const validData = data.filter(station => 
      station.lat && station.lon && 
      !isNaN(station.lat) && !isNaN(station.lon) &&
      station.lat >= 35 && station.lat <= 44 &&
      station.lon >= -10 && station.lon <= 5
    );

    if (validData.length === 0) {
      console.warn('No hay estaciones válidas');
      return;
    }

    const limitedData = validData.length > 500 ? validData.slice(0, 500) : validData;

    // Crear cluster group
    const markerCluster = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 12,
      chunkedLoading: true,
      chunkDelay: 50,
      iconCreateFunction: (cluster: any) => {
        const markers = cluster.getAllChildMarkers();
        const aqiCounts: Record<number, number> = {};
        
        markers.forEach((marker: any) => {
          const aqi = marker.options.aqi || 1;
          aqiCounts[aqi] = (aqiCounts[aqi] || 0) + 1;
        });
        
        let worstAqi = 1;
        let maxCount = 0;
        Object.entries(aqiCounts).forEach(([aqiStr, count]) => {
          const aqi = parseInt(aqiStr);
          if (count > maxCount || (count === maxCount && aqi > worstAqi)) {
            maxCount = count;
            worstAqi = aqi;
          }
        });
        
        const color = getAqiColor(worstAqi);
        const childCount = cluster.getChildCount();
        
        let sizeClass = 'small';
        if (childCount > 100) sizeClass = 'large';
        else if (childCount > 50) sizeClass = 'medium';
        
        return L.divIcon({
          html: `<div class="cluster-icon ${sizeClass}" style="background-color:${color}">${childCount}</div>`,
          className: `marker-cluster marker-cluster-${sizeClass}`,
          iconSize: L.point(40, 40)
        });
      }
    });

    markerClusterRef.current = markerCluster;

    // Procesar estaciones por lotes
    const BATCH_SIZE = 100;
    let processed = 0;

    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, limitedData.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const station = limitedData[i];
        const aqi = station.last_aqi || 1;
        const color = getAqiColor(aqi);
        const radius = Math.min((aqi * 2) + 4, 10);
        
        const circle = L.circleMarker([station.lat, station.lon], {
          radius,
          fillColor: color,
          color: '#333',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.7,
        } as any);

        (circle as any).options.aqi = aqi;
        (circle as any).options.station_id = station.id;

        // Popup inicial ligero
        const initialPopup = createLightPopup(station);
        const popup = L.popup({
          maxWidth: 320,
          minWidth: 280,
          autoPan: true,
          autoPanPadding: [50, 50]
        }).setContent(initialPopup);

        circle.bindPopup(popup);

        // Al abrir popup, cargar datos completos
        circle.on('popupopen', async () => {
          const stationId = (circle as any).options.station_id;
          
          if (!stationId) return;

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
          const fullData = await loadStationDetail(stationId);
          
          if (fullData) {
            popup.setContent(createFullPopup(fullData));
          } else {
            popup.setContent(initialPopup + '<p style="color: red;">Error cargando datos</p>');
          }
        });

        markerCluster.addLayer(circle);
        processed++;
      }

      if (endIndex < limitedData.length) {
        setTimeout(() => processBatch(endIndex), 0);
      } else {
        console.log(`✅ Procesadas ${processed} estaciones`);
        markers.addLayer(markerCluster);
        
        if (!hasSetView.current && limitedData.length > 0) {
          setTimeout(() => {
            const bounds = L.latLngBounds(limitedData.map(s => [s.lat, s.lon]));
            
            if (bounds.isValid()) {
              map.fitBounds(bounds.pad(0.1), {
                animate: false,
                duration: 0,
                maxZoom: 8
              });
            } else {
              map.setView([40.4168, -3.7038], 6);
            }
            
            hasSetView.current = true;
          }, 200);
        }
      }
    };

    processBatch(0);

    return () => {
      clearClusters();
      markers.clearLayers();
      hasSetView.current = false;
    };
  }, [map, markers, data, clearClusters]);

  useEffect(() => {
    return () => {
      clearClusters();
      loadedDetailsRef.current.clear();
    };
  }, [clearClusters]);

  return null;
}