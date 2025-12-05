
// src/components/ElectionMapRenderer.tsx
import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
// Importa el plugin completo
import 'leaflet.markercluster';
// Importa los estilos
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { ElectionLocation } from './types';

interface ElectionMapRendererProps {
  map: L.Map;
  markers: L.LayerGroup;
  data: ElectionLocation[];
}

// Función para obtener color de partido
const getPartyColor = (party: string): string => {
  const colors: Record<string, string> = {
    'PP': '#0056A8',
    'PSOE': '#E30613',
    'VOX': '#63BE21',
    'SUMAR': '#EA5F94',
    'ERC': '#FFB232',
    'JXCAT_JUNTS': '#FFD100',
    'EH_BILDU': '#6DBE45',
    'EAJ_PNV': '#008D3C',
    'BNG': '#6A3B8C',
    'CCA': '#FF7F00',
    'UPN': '#800080',
    'PACMA': '#00AA4F',
    'CUP_PR': '#FF0000',
    'FO': '#000000',
    'sin_datos': '#CCCCCC',
    'OTROS': '#666666'
  };
  return colors[party] || colors[party.toUpperCase()] || '#666';
};

// Función para obtener nombre del partido
const getPartyName = (partyCode: string): string => {
  const translations: Record<string, string> = {
    'PP': 'PP',
    'PSOE': 'PSOE',
    'VOX': 'VOX',
    'SUMAR': 'SUMAR',
    'ERC': 'ERC',
    'JXCAT_JUNTS': 'JxCat/Junts',
    'EH_BILDU': 'EH Bildu',
    'EAJ_PNV': 'EAJ-PNV',
    'BNG': 'BNG',
    'CCA': 'CCA',
    'UPN': 'UPN',
    'PACMA': 'PACMA',
    'CUP_PR': 'CUP/PR',
    'FO': 'FO',
    'sin_datos': 'Sin Datos'
  };
  return translations[partyCode] || partyCode;
};

// Radio basado en población
const getRadiusByPopulation = (poblacion: number): number => {
  if (!poblacion) return 4;
  if (poblacion > 1000000) return 14;
  if (poblacion > 500000) return 12;
  if (poblacion > 100000) return 10;
  if (poblacion > 50000) return 8;
  if (poblacion > 10000) return 6;
  return 4;
};

// Función para crear popup content
const createPopupContent = (location: ElectionLocation, partyColor: string, partyName: string): string => {
  return `
    <div style="padding: 10px; min-width: 240px; font-family: Arial, sans-serif;">
      <h3 style="font-weight: bold; font-size: 1.125rem; margin-bottom: 8px; color: #1f2937;">
        ${location.nombre_municipio}
      </h3>
      
      <div style="margin-bottom: 8px;">
        <p style="color: #6b7280; font-size: 0.875rem; margin: 2px 0;">
          <strong>Provincia:</strong> ${location.nombre_provincia}
        </p>
        <p style="color: #6b7280; font-size: 0.875rem; margin: 2px 0;">
          <strong>Comunidad:</strong> ${location.nombre_comunidad}
        </p>
        ${location.poblacion ? `
          <p style="color: #6b7280; font-size: 0.875rem; margin: 2px 0;">
            <strong>Población:</strong> ${location.poblacion.toLocaleString()}
          </p>
        ` : ''}
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
      
      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: center; margin-bottom: 6px;">
          <div style="width: 12px; height: 12px; background-color: ${partyColor}; border-radius: 50%; margin-right: 8px;"></div>
          <span style="font-weight: 600; color: ${partyColor};">
            ${partyName}
          </span>
        </div>
        
        ${location.votos_ganador ? `
          <p style="color: #6b7280; font-size: 0.875rem; margin: 4px 0 2px 0;">
            <strong>Votos Ganador:</strong> ${location.votos_ganador.toLocaleString()}
          </p>
        ` : ''}
        
        ${location.participacion ? `
          <div style="margin: 6px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #6b7280; font-size: 0.875rem;">
                <strong>Participación:</strong> ${location.participacion.toFixed(1)}%
              </span>
              <span style="color: #6b7280; font-size: 0.75rem;">${location.participacion >= 75 ? '📈 Alta' : location.participacion >= 60 ? '📊 Media' : '📉 Baja'}</span>
            </div>
            <div style="height: 4px; background-color: #e5e7eb; border-radius: 2px; overflow: hidden;">
              <div style="width: ${location.participacion}%; height: 100%; background-color: ${location.participacion >= 75 ? '#10b981' : location.participacion >= 60 ? '#f59e0b' : '#dc2626'};"></div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center;">
          <div style="width: 8px; height: 8px; background-color: #0056A8; border-radius: 50%; margin-right: 6px;"></div>
          <span style="color: #6b7280; font-size: 0.75rem;">PP: ${location.pp?.toLocaleString() || '0'}</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 8px; height: 8px; background-color: #E30613; border-radius: 50%; margin-right: 6px;"></div>
          <span style="color: #6b7280; font-size: 0.75rem;">PSOE: ${location.psoe?.toLocaleString() || '0'}</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 8px; height: 8px; background-color: #63BE21; border-radius: 50%; margin-right: 6px;"></div>
          <span style="color: #6b7280; font-size: 0.75rem;">VOX: ${location.vox?.toLocaleString() || '0'}</span>
        </div>
        <div style="display: flex; align-items: center;">
          <div style="width: 8px; height: 8px; background-color: #EA5F94; border-radius: 50%; margin-right: 6px;"></div>
          <span style="color: #6b7280; font-size: 0.75rem;">SUMAR: ${location.sumar?.toLocaleString() || '0'}</span>
        </div>
      </div>
      
      <p style="color: #9ca3af; font-size: 0.75rem; margin: 0; padding-top: 6px; border-top: 1px solid #e5e7eb;">
        ${location.created_at ? `Última actualización: ${new Date(location.created_at).toLocaleDateString()}` : ''}
        <br/>
        Coordenadas: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}
      </p>
    </div>
  `;
};

export default function ElectionMapRenderer({ map, markers, data }: ElectionMapRendererProps) {
  const hasSetView = useRef(false);
  const markerClusterRef = useRef<any>(null);
  
  // Función para limpiar clusters
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

  // Función para renderizar clusters (optimizada)
  const renderClusters = useCallback(() => {
    // 1. Limpiar clusters anteriores
    clearClusters();
    
    // 2. Si no hay datos, no hacer nada
    if (!data || data.length === 0) {
      console.log('ElectionMapRenderer: No hay datos');
      return;
    }

    console.log(`ElectionMapRenderer: Procesando ${data.length} municipios`);

    // 3. Filtrar datos válidos UNA SOLA VEZ
    const validData = data.filter(location => 
      location.lat && location.lon && 
      !isNaN(location.lat) && !isNaN(location.lon) &&
      location.lat >= 35 && location.lat <= 44 && // España aprox
      location.lon >= -10 && location.lon <= 5
    );

    // 4. Limitar cantidad si es necesario
    const limitedData = validData.length > 5000 
      ? validData.slice(0, 5000) 
      : validData;

    console.log(`Renderizando ${limitedData.length} de ${validData.length} puntos válidos`);

    if (limitedData.length === 0) {
      console.warn('No hay puntos válidos para mostrar');
      return;
    }

    // 5. Crear grupo de clusters
    const markerCluster = (L as any).markerClusterGroup({
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 12,
      chunkedLoading: true,
      chunkDelay: 100,
      chunkProgress: (processed: number, total: number, elapsed: number) => {
        if (elapsed > 2000 && processed < total) {
          console.warn(`Procesamiento lento: ${processed}/${total} en ${elapsed}ms`);
        }
      },
      iconCreateFunction: (cluster: any) => {
        const markers = cluster.getAllChildMarkers();
        const partidosCount: Record<string, number> = {};
        
        // Contar partidos en el cluster
        markers.forEach((marker: any) => {
          const partido = marker.options.partido_ganador || 'sin_datos';
          partidosCount[partido] = (partidosCount[partido] || 0) + 1;
        });
        
        // Encontrar partido mayoritario
        let mayoritario = 'sin_datos';
        let maxCount = 0;
        Object.entries(partidosCount).forEach(([partido, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mayoritario = partido;
          }
        });
        
        // Color según partido mayoritario
        const color = getPartyColor(mayoritario);
        const childCount = cluster.getChildCount();
        
        // Tamaño basado en cantidad
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

    // Guardar referencia
    markerClusterRef.current = markerCluster;

    // 6. Procesar datos en batch (por lotes)
    const BATCH_SIZE = 500;
    let sinCoordenadas = 0;
    let processed = 0;

    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, limitedData.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const location = limitedData[i];
        
        // Color según partido ganador
        const partyColor = getPartyColor(location.partido_ganador);
        const partyName = getPartyName(location.partido_ganador);
        
        // Radio basado en población
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

        // Crear popup (sin contenido pesado inicialmente)
        circle.bindPopup(() => createPopupContent(location, partyColor, partyName), {
          maxWidth: 300,
          minWidth: 250,
          autoPan: false // Importante para rendimiento
        });

        // Añadir al cluster group
        markerCluster.addLayer(circle);
        processed++;
      }

      // Si hay más datos, procesar siguiente batch
      if (endIndex < limitedData.length) {
        setTimeout(() => processBatch(endIndex), 0); // Non-blocking
      } else {
        // Finalizado
        console.log(`Procesados ${processed} municipios, ${sinCoordenadas} sin coordenadas`);
        
        // Añadir cluster group al mapa
        markers.addLayer(markerCluster);
        
        // SOLO UNA VEZ: Ajustar vista
        if (!hasSetView.current) {
          setTimeout(() => {
            // Opción 1: Vista fija (segura)
            map.setView([40.4168, -3.7038], 6);
            
            // Opción 2: Ajustar bounds SOLO si son pocos clusters
            // if (limitedData.length < 1000) {
            //   const bounds = markerCluster.getBounds();
            //   if (bounds && bounds.isValid()) {
            //     map.fitBounds(bounds.pad(0.1), {
            //       animate: false, // Sin animación
            //       duration: 0
            //     });
            //   }
            // }
            
            hasSetView.current = true;
          }, 300);
        }
      }
    };

    // Iniciar procesamiento por lotes
    processBatch(0);

    // 7. Debug
    if (data.length - validData.length > 0) {
      console.warn(`${data.length - validData.length} municipios sin coordenadas válidas fueron omitidos`);
    }

  }, [data, map, markers, clearClusters]);

  // Efecto principal - optimizado
  useEffect(() => {
    // Evitar ejecuciones innecesarias
    if (!map || !markers) return;

    // Debounce: esperar a que los datos estén estables
    const timer = setTimeout(() => {
      renderClusters();
    }, 100);

    return () => {
      clearTimeout(timer);
      clearClusters();
      hasSetView.current = false;
    };
  }, [map, markers, data, renderClusters, clearClusters]);

  // Efecto para limpieza al desmontar
  useEffect(() => {
    return () => {
      clearClusters();
    };
  }, [clearClusters]);

  return null;
}