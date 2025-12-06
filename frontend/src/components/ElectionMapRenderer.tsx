// /home/bbvedf/prog/geo-data/frontend/src/components/ElectionMapRenderer.tsx
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { ElectionLocation } from './types';
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface ElectionMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: ElectionLocation[];
}

const getPartyColor = (party: string): string => {
  const colors: Record<string, string> = {
    'PP': '#0056A8', 'PSOE': '#E30613', 'VOX': '#63BE21',
    'SUMAR': '#EA5F94', 'ERC': '#FFB232', 'JXCAT_JUNTS': '#FFD100',
    'EH_BILDU': '#6DBE45', 'EAJ_PNV': '#008D3C', 'BNG': '#6A3B8C',
    'CCA': '#FF7F00', 'UPN': '#800080', 'sin_datos': '#CCCCCC'
  };
  return colors[party] || colors[party.toUpperCase()] || '#666';
};

const getRadiusByPopulation = (poblacion: number): number => {
  if (!poblacion) return 4;
  if (poblacion > 1000000) return 14;
  if (poblacion > 500000) return 12;
  if (poblacion > 100000) return 10;
  if (poblacion > 50000) return 8;
  if (poblacion > 10000) return 6;
  return 4;
};

// Popup simple inicial (sin datos completos)
const createLightPopup = (location: ElectionLocation, partyColor: string): string => {
  return `
    <div style="padding: 10px; min-width: 200px;">
      <h4 style="margin: 0 0 10px 0;">${location.nombre_municipio}</h4>
      <p style="margin: 5px 0;"><strong>Provincia:</strong> ${location.nombre_provincia}</p>
      <div style="display: flex; align-items: center; margin: 10px 0;">
        <div style="width: 12px; height: 12px; background: ${partyColor}; border-radius: 50%; margin-right: 8px;"></div>
        <strong>${location.partido_ganador?.toUpperCase()}</strong>
      </div>
      ${location.participacion ? `<p><strong>Participación:</strong> ${location.participacion.toFixed(1)}%</p>` : ''}
      <p style="color: #666; font-size: 12px; margin-top: 10px;">Haz clic para ver detalles completos...</p>
    </div>
  `;
};

// Popup completo (cargado bajo demanda)
const createFullPopup = (fullData: any, partyColor: string): string => {
  return `
    <div style="padding: 12px; min-width: 280px; font-family: Arial, sans-serif;">
      <h3 style="margin: 0 0 12px 0; color: #1f2937; border-bottom: 2px solid ${partyColor}; padding-bottom: 8px;">
        ${fullData.nombre_municipio}
      </h3>
      
      <div style="margin-bottom: 12px;">
        <p style="margin: 4px 0; color: #6b7280;"><strong>Provincia:</strong> ${fullData.nombre_provincia}</p>
        <p style="margin: 4px 0; color: #6b7280;"><strong>Comunidad:</strong> ${fullData.nombre_comunidad}</p>
        ${fullData.poblacion ? `<p style="margin: 4px 0; color: #6b7280;"><strong>Población:</strong> ${fullData.poblacion.toLocaleString()}</p>` : ''}
      </div>
      
      <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <div style="width: 14px; height: 14px; background: ${partyColor}; border-radius: 50%; margin-right: 8px;"></div>
          <strong style="color: ${partyColor}; font-size: 16px;">${fullData.partido_ganador?.toUpperCase()}</strong>
        </div>
        ${fullData.votos_ganador ? `<p style="margin: 4px 0;"><strong>Votos:</strong> ${fullData.votos_ganador.toLocaleString()}</p>` : ''}
        ${fullData.participacion ? `
          <div style="margin-top: 8px;">
            <p style="margin: 2px 0; font-size: 14px;"><strong>Participación:</strong> ${fullData.participacion.toFixed(1)}%</p>
            <div style="height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-top: 4px;">
              <div style="width: ${fullData.participacion}%; height: 100%; background: ${fullData.participacion >= 75 ? '#10b981' : fullData.participacion >= 60 ? '#f59e0b' : '#dc2626'};"></div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
        <div style="background: #f9fafb; padding: 6px; border-radius: 4px;">
          <span style="color: #0056A8; font-weight: bold;">PP:</span> ${fullData.pp?.toLocaleString() || '0'}
        </div>
        <div style="background: #f9fafb; padding: 6px; border-radius: 4px;">
          <span style="color: #E30613; font-weight: bold;">PSOE:</span> ${fullData.psoe?.toLocaleString() || '0'}
        </div>
        <div style="background: #f9fafb; padding: 6px; border-radius: 4px;">
          <span style="color: #63BE21; font-weight: bold;">VOX:</span> ${fullData.vox?.toLocaleString() || '0'}
        </div>
        <div style="background: #f9fafb; padding: 6px; border-radius: 4px;">
          <span style="color: #EA5F94; font-weight: bold;">SUMAR:</span> ${fullData.sumar?.toLocaleString() || '0'}
        </div>
      </div>
      
      <p style="color: #9ca3af; font-size: 11px; margin: 0; padding-top: 8px; border-top: 1px solid #e5e7eb;">
        Coordenadas: ${fullData.lat.toFixed(4)}, ${fullData.lon.toFixed(4)}
      </p>
    </div>
  `;
};

export default function ElectionMapRenderer({ map, markers, data }: ElectionMapRendererProps) {
  const hasSetView = useRef(false);
  const markerClusterRef = useRef<any>(null);
  const loadedDetailsRef = useRef<Set<string>>(new Set());
  
  const clearClusters = useCallback(() => {
    if (markerClusterRef.current) {
      try {
        markerClusterRef.current.clearLayers();
        if (markers.hasLayer(markerClusterRef.current)) {
          markers.removeLayer(markerClusterRef.current);
        }
        markerClusterRef.current = null;
      } catch (error) {
        console.error('Error limpiando clusters:', error);
      }
    }
  }, [markers]);

  // Función para cargar datos completos de un municipio
  const loadMunicipalityDetail = async (codigoIne: string) => {
    if (loadedDetailsRef.current.has(codigoIne)) return null;
    
    try {
      const response = await api.get(`/api/elections/municipality/${codigoIne}`);
      loadedDetailsRef.current.add(codigoIne);
      return response.data.data;
    } catch (error) {
      console.error('Error cargando detalle del municipio:', error);
      return null;
    }
  };

  const renderClusters = useCallback(() => {
    clearClusters();
    
    if (!data || data.length === 0) {
      console.log('ElectionMapRenderer: No hay datos');
      return;
    }

    console.log(`ElectionMapRenderer: Procesando ${data.length} municipios`);

    // Filtrar datos válidos
    const validData = data.filter(location => 
      location.lat && location.lon && 
      !isNaN(location.lat) && !isNaN(location.lon) &&
      location.lat >= 35 && location.lat <= 44 &&
      location.lon >= -10 && location.lon <= 5
    );

    if (validData.length === 0) {
      console.warn('No hay puntos válidos');
      return;
    }

    console.log(`Renderizando ${validData.length} puntos válidos`);

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
        const partidosCount: Record<string, number> = {};
        
        markers.forEach((marker: any) => {
          const partido = marker.options.partido_ganador || 'sin_datos';
          partidosCount[partido] = (partidosCount[partido] || 0) + 1;
        });
        
        let mayoritario = 'sin_datos';
        let maxCount = 0;
        Object.entries(partidosCount).forEach(([partido, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mayoritario = partido;
          }
        });
        
        const color = getPartyColor(mayoritario);
        const childCount = cluster.getChildCount();
        
        let size = 'small';
        if (childCount > 100) size = 'large';
        else if (childCount > 50) size = 'medium';
        
        return L.divIcon({
          html: `<div class="cluster-icon ${size}" style="background-color:${color}">${childCount}</div>`,
          className: `marker-cluster marker-cluster-${size}`,
          iconSize: L.point(40, 40)
        });
      }
    });

    markerClusterRef.current = markerCluster;

    // Procesar markers en batch
    const BATCH_SIZE = 500;
    let processed = 0;

    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, validData.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const location = validData[i];
        const partyColor = getPartyColor(location.partido_ganador);
        const radius = Math.min(getRadiusByPopulation(location.poblacion || 10000), 6);

        const circle = L.circleMarker([location.lat, location.lon], {
          radius,
          fillColor: partyColor,
          color: '#333',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7,
        } as any);

        (circle as any).options.partido_ganador = location.partido_ganador;
        (circle as any).options.codigo_ine = location.codigo_ine;

        // Popup inicial ligero
        const initialPopup = createLightPopup(location, partyColor);
        const popup = L.popup({
          maxWidth: 300,
          minWidth: 250,
          autoPan: false
        }).setContent(initialPopup);

        circle.bindPopup(popup);

        // Al abrir popup, cargar datos completos
        circle.on('popupopen', async () => {
          const codigoIne = (circle as any).options.codigo_ine;
          
          // Mostrar loading en HTML simple
          popup.setContent(`
            <div style="padding: 20px; text-align: center;">
              <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
              <p style="margin-top: 10px;">Cargando datos completos...</p>
            </div>
          `);

          // Cargar datos completos
          const fullData = await loadMunicipalityDetail(codigoIne);
          
          if (fullData) {
            popup.setContent(createFullPopup(fullData, partyColor));
          } else {
            popup.setContent(initialPopup + '<p style="color: red;">Error cargando datos</p>');
          }
        });

        markerCluster.addLayer(circle);
        processed++;
      }

      if (endIndex < validData.length) {
        setTimeout(() => processBatch(endIndex), 0);
      } else {
        console.log(`✅ Procesados ${processed} municipios`);
        markers.addLayer(markerCluster);
        
        if (!hasSetView.current) {
          setTimeout(() => {
            map.setView([40.4168, -3.7038], 6);
            hasSetView.current = true;
          }, 300);
        }
      }
    };

    processBatch(0);

  }, [data, map, markers, clearClusters]);

  useEffect(() => {
    if (!map || !markers) return;

    const timer = setTimeout(() => {
      renderClusters();
    }, 100);

    return () => {
      clearTimeout(timer);
      clearClusters();
      hasSetView.current = false;
    };
  }, [map, markers, data, renderClusters, clearClusters]);

  useEffect(() => {
    return () => {
      clearClusters();
      loadedDetailsRef.current.clear();
    };
  }, [clearClusters]);

  return null;
}