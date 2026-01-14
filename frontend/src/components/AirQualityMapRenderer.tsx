// frontend/src/components/AirQualityMapRenderer.tsx
// Componente bajo nivel del mapa
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { AirQualityStation } from './types';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/geo',
});

interface AirQualityMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: AirQualityStation[];
  // Nuevas props
  useClustering?: boolean;
  selectedPollutant?: string;
}

// Mapeo de contaminante a color
const getPollutantColor = (station: AirQualityStation): string => {
  const colors: Record<string, string> = {
    'O3': '#3498db',      // Azul
    'NO2': '#e74c3c',     // Rojo
    'PM10': '#2ecc71',    // Verde
    'PM2.5': '#e67e22',   // Naranja
    'SO2': '#9b59b6',     // Morado
    'SIN_CONTAMINANTE': '#95a5a6' // Gris
  };
  
  const pollutant = station.pollutant || station.ica_contaminant;
  return colors[pollutant || 'SIN_CONTAMINANTE'] || '#95a5a6';
};

// Para mantener compatibilidad con AQI (usado en popups)
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
  const pollutantColor = getPollutantColor(station);
  const isActive = station.is_active !== false;
  
  return `
    <div style="padding: 12px; min-width: 240px;">
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <div style="width: 36px; height: 36px; background: ${pollutantColor}; border-radius: ${isActive ? '50%' : '4px'}; display: flex; align-items: center; justify-content: center; margin-right: 10px; opacity: ${isActive ? '1' : '0.6'};">
          <span style="font-size: 1rem; color: white; font-weight: bold;">
             ${isActive ? '●' : '◆'}
          </span>
        </div>
        <div>
          <h4 style="margin: 0; font-size: 1rem;">${station.name || 'Estación'}</h4>
          <p style="margin: 0; color: #666; font-size: 0.875rem;">
            ${isActive ? '🟢 Activa' : '⚪ Inactiva'} | 
            AQI: ${station.last_aqi || 'N/A'} | 
            ${station.pollutant || 'No definido'}
          </p>
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
  const pollutantColor = getPollutantColor(fullData);
  const isActive = fullData.is_active !== false;
  
  const pollutantsList = fullData.available_pollutants && fullData.available_pollutants.length > 0
    ? fullData.available_pollutants.map((p: string) => `<span class="badge bg-secondary me-1">${p}</span>`).join('')
    : '<span class="text-muted">No especificado</span>';

  return `
    <div style="padding: 12px; min-width: 280px;">
      <div style="display: flex; align-items-flex-start; margin-bottom: 12px;">
        <div style="width: 40px; height: 40px; background: ${pollutantColor}; border-radius: ${isActive ? '50%' : '4px'}; display: flex; align-items: center; justify-content: center; margin-right: 12px; opacity: ${isActive ? '1' : '0.6'};">
          <span style="font-size: 1.25rem; color: white; font-weight: bold;">
             ${isActive ? '●' : '◆'}
          </span>
        </div>
        <div>
          <h3 style="margin: 0 0 4px 0; font-size: 1.125rem;">${fullData.name || 'Estación'}</h3>
          <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">
            ${isActive ? '🟢 Activa' : '⚪ Inactiva'} | 
            Código: ${fullData.station_code || 'N/A'}
          </p>
        </div>
      </div>
      
      <div style="background: ${aqiColor}20; border: 1px solid ${aqiColor}; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div>
            <div style="font-weight: 600; color: ${aqiColor};">${aqiText} (AQI: ${fullData.last_aqi || 'N/A'})</div>
            ${fullData.last_measurement ? `
              <div style="color: #6b7280; font-size: 0.875rem;">
                ${fullData.pollutant || 'PM2.5'}: <strong>${fullData.last_measurement.toFixed(1)} ${fullData.unit || 'ICA'}</strong>
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
          <strong>🏷️ Tipo</strong><br/>
          ${fullData.station_type || 'N/A'}
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
        ${fullData.is_mock ? '📄 Datos simulados' : '🌍 Fuente: MITECO ICA'}
      </div>
    </div>
  `;
};

// Función para crear marcadores (activas = círculo, inactivas = triángulo)
const createMarker = (station: AirQualityStation): L.Layer => {
  const pollutantColor = getPollutantColor(station);
  const isActive = station.is_active !== false;
  
  if (isActive) {
    // ============ ESTACIONES ACTIVAS ============
    // Círculo sólido y brillante
    const circle = L.circleMarker([station.lat, station.lon], {
      radius: 8,
      fillColor: pollutantColor,
      color: '#333',
      weight: 2,
      opacity: 1.0,
      fillOpacity: 0.9,
      className: 'active-station-marker'
    } as any);

    (circle as any).options.aqi = station.last_aqi || 1;
    (circle as any).options.station_id = station.id;
    (circle as any).options.is_active = true;
    (circle as any).options.pollutant = station.pollutant || station.ica_contaminant || 'SIN_CONTAMINANTE';

    return circle;
    
  } else {
    // ============ ESTACIONES INACTIVAS ============
    // Cuadrado/diamante en lugar de triángulo
    const icon = L.divIcon({
      html: `
        <div style="
          position: relative;
          width: 14px;
          height: 14px;
          transform: rotate(45deg);
          background: ${pollutantColor};
          opacity: 0.85;
          border: 2px solid #333;
          border-opacity: 0.85;
        "></div>
      `,
      className: 'inactive-station-icon',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -7]
    });
    
    const marker = L.marker([station.lat, station.lon], { 
      icon,
      opacity: 0.6,
      interactive: true
    } as any);

    (marker as any).options.aqi = station.last_aqi || 1;
    (marker as any).options.station_id = station.id;
    (marker as any).options.is_active = false;
    (marker as any).options.pollutant = station.pollutant || station.ica_contaminant || 'SIN_CONTAMINANTE';

    return marker;
  }
};

// Función para configurar popup en un marcador
const setupPopup = (marker: L.Layer, station: AirQualityStation) => {
  const initialPopup = createLightPopup(station);
  const popup = L.popup({
    maxWidth: 320,
    minWidth: 280,
    autoPan: true,
    autoPanPadding: [50, 50]
  }).setContent(initialPopup);

  marker.bindPopup(popup);

  return { marker, popup, initialPopup };
};

export default function AirQualityMapRenderer({ 
  map, 
  markers, 
  data,
  useClustering = true,
  selectedPollutant = 'ALL'
}: AirQualityMapRendererProps) {
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
    console.log(`Configuración: clustering=${useClustering}, contaminante=${selectedPollutant}`);

    const validData = data.filter(station => 
      station.lat && station.lon && 
      !isNaN(station.lat) && !isNaN(station.lon)
    );

    if (validData.length === 0) {
      console.warn('No hay estaciones válidas');
      return;
    }

    // Contar activas vs inactivas
    const activeCount = validData.filter(s => s.is_active !== false).length;
    const inactiveCount = validData.filter(s => s.is_active === false).length;
    console.log(`📊 Activas: ${activeCount}, Inactivas: ${inactiveCount}`);

    const limitedData = validData.length > 500 ? validData.slice(0, 500) : validData;

    if (useClustering) {
      // CON CLUSTERING
      const markerCluster = (L as any).markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 12,
        chunkedLoading: true,
        chunkDelay: 50,
        iconCreateFunction: (cluster: any) => {
          const childMarkers = cluster.getAllChildMarkers();
          const pollutantCounts: Record<string, number> = {};
          const activeCount = childMarkers.filter((m: any) => m.options.is_active !== false).length;
          const inactiveCount = childMarkers.filter((m: any) => m.options.is_active === false).length;
          
          childMarkers.forEach((marker: any) => {
            const pollutant = marker.options.pollutant || 'SIN_CONTAMINANTE';
            pollutantCounts[pollutant] = (pollutantCounts[pollutant] || 0) + 1;
          });
          
          // Determinar el contaminante más común
          let mostCommonPollutant = 'SIN_CONTAMINANTE';
          let maxCount = 0;
          Object.entries(pollutantCounts).forEach(([poll, count]) => {
            if (count > maxCount) {
              maxCount = count;
              mostCommonPollutant = poll;
            }
          });
          
          const color = getPollutantColor({ pollutant: mostCommonPollutant } as AirQualityStation);
          const childCount = cluster.getChildCount();
          
          let sizeClass = 'small';
          if (childCount > 100) sizeClass = 'large';
          else if (childCount > 50) sizeClass = 'medium';
          
          // Tooltip para el cluster
          let tooltipContent = `<div style="padding: 4px; font-size: 12px;">
            <strong>${childCount} estaciones</strong>`;
          
          if (inactiveCount > 0) {
            tooltipContent += `<br/>${activeCount} activas, ${inactiveCount} inactivas`;
          }
          
          if (selectedPollutant !== 'ALL') {
            const pollutantName = mostCommonPollutant === 'SIN_CONTAMINANTE' ? 'No definido' : mostCommonPollutant;
            tooltipContent += `<br/>Predomina: ${pollutantName}`;
          }
          
          tooltipContent += '</div>';
          
          const icon = L.divIcon({
            html: `<div class="cluster-icon ${sizeClass}" style="background-color:${color}">${childCount}</div>`,
            className: `marker-cluster marker-cluster-${sizeClass}`,
            iconSize: L.point(40, 40)
          });
          
          // Añadir tooltip
          (cluster as any).bindTooltip(tooltipContent, {
            permanent: false,
            direction: 'top',
            offset: [0, -20],
            className: 'cluster-tooltip'
          });
          
          return icon;
        }
      });

      markerClusterRef.current = markerCluster;

      // Procesar estaciones por lotes
      const BATCH_SIZE = 100;
      let processed = 0;

      const processBatch = (startIndex: number) => {
        const endIndex = Math.min(startIndex + BATCH_SIZE, limitedData.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const marker = createMarker(limitedData[i]);
          
          // Configurar popup
          const { marker: markerWithPopup, popup, initialPopup } = setupPopup(marker, limitedData[i]);
          
          // Manejar apertura de popup
          markerWithPopup.on('popupopen', async () => {
            const stationId = (markerWithPopup as any).options.station_id;
            
            if (!stationId) return;

            // Loading
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

            const fullData = await loadStationDetail(stationId);
            
            if (fullData) {
              popup.setContent(createFullPopup(fullData));
            } else {
              popup.setContent(initialPopup + '<p style="color: red; font-size: 0.875rem;">Error cargando datos</p>');
            }
          });

          markerCluster.addLayer(markerWithPopup);
          processed++;
        }

        if (endIndex < limitedData.length) {
          setTimeout(() => processBatch(endIndex), 0);
        } else {
          console.log(`✅ Procesadas ${processed} estaciones (con clustering)`);
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
    } else {
      // SIN CLUSTERING
      console.log(`✅ Mostrando ${limitedData.length} estaciones sin clustering`);
      
      limitedData.forEach(station => {
        const marker = createMarker(station);
        const { marker: markerWithPopup, popup, initialPopup } = setupPopup(marker, station);
        
        // Manejar apertura de popup
        markerWithPopup.on('popupopen', async () => {
          const stationId = (markerWithPopup as any).options.station_id;
          
          if (!stationId) return;

          // Loading
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

          const fullData = await loadStationDetail(stationId);
          
          if (fullData) {
            popup.setContent(createFullPopup(fullData));
          } else {
            popup.setContent(initialPopup + '<p style="color: red; font-size: 0.875rem;">Error cargando datos</p>');
          }
        });

        markers.addLayer(markerWithPopup);
      });

      if (!hasSetView.current && limitedData.length > 0) {
        setTimeout(() => {
          const bounds = L.latLngBounds(limitedData.map(s => [s.lat, s.lon]));
          
          if (bounds.isValid()) {
            map.fitBounds(bounds.pad(0.2), {
              animate: false,
              duration: 0,
              maxZoom: 10
            });
          } else {
            map.setView([40.4168, -3.7038], 7);
          }
          
          hasSetView.current = true;
        }, 200);
      }
    }

    return () => {
      clearClusters();
      markers.clearLayers();
      hasSetView.current = false;
    };
  }, [map, markers, data, clearClusters, useClustering, selectedPollutant]);

  useEffect(() => {
    return () => {
      clearClusters();
      loadedDetailsRef.current.clear();
    };
  }, [clearClusters]);

  return null;
}