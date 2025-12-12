import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HousingData, CCAAValue } from './types';

interface HousingMapRendererProps {
  map: L.Map;
  data: HousingData[];
  ccaaValues: CCAAValue[];
  selectedMetric: string;
  selectedHousingType: string;
  selectedCCAA: string | null;
}

// URL al GeoJSON en public/
const GEOJSON_URL = '/spain_ccaa.geojson';

// Función para determinar color basado en el valor
const getColorForValue = (value: number | null, metric: string): string => {
  if (value === null || value === undefined) return '#cccccc';
  
  if (metric === 'indice') {
    if (value < 100) return '#a8d5e2';
    if (value < 120) return '#73b3c2';
    if (value < 140) return '#4d9db3';
    if (value < 160) return '#2e8ba3';
    if (value < 180) return '#1a7994';
    if (value < 200) return '#0d6785';
    return '#075675';
  } else if (metric.includes('var')) {
    if (value < -5) return '#d7191c';
    if (value < -2) return '#fdae61';
    if (value < 2) return '#ffffbf';
    if (value < 5) return '#a6d96a';
    return '#1a9641';
  }
  
  return '#999999';
};

// Función para crear estilo de capa
const getGeoJSONStyle = (feature: any, ccaaValues: CCAAValue[], metric: string) => {
  const ccaaCode = feature.properties.codigo;
  const ccaaData = ccaaValues.find(d => d.ccaa_codigo === ccaaCode);
  
  return {
    fillColor: getColorForValue(ccaaData?.valor || null, metric),
    weight: 2,
    opacity: 1,
    color: 'white', // ⭐ Color inicial BLANCO
    dashArray: '3',
    fillOpacity: 0.7,
    className: 'ccaa-polygon'
  };
};

// Función para crear tooltip
const createTooltipContent = (ccaaData: CCAAValue | undefined, metric: string): string => {
  if (!ccaaData) return '<div>Sin datos</div>';
  
  const value = ccaaData.valor;
  const color = getColorForValue(value, metric);
  const periodo = ccaaData.periodo || 'Último disponible';
  
  let metricLabel = 'Índice';
  if (metric === 'var_anual') metricLabel = 'Var. Anual';
  if (metric === 'var_trimestral') metricLabel = 'Var. Trimestral';
  if (metric === 'var_ytd') metricLabel = 'Var. YTD';
  
  return `
    <div style="padding: 10px; min-width: 200px;">
      <h4 style="margin: 0 0 8px 0; font-size: 16px;">${ccaaData.ccaa_nombre}</h4>
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <div style="width: 20px; height: 20px; background: ${color}; border-radius: 4px; margin-right: 8px;"></div>
        <div>
          <strong style="font-size: 18px;">${value?.toFixed(2) || 'N/A'}</strong>
          <div style="color: #666; font-size: 12px;">${metricLabel}</div>
        </div>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 8px; font-size: 12px; color: #888;">
        Periodo: ${periodo}
      </div>
    </div>
  `;
};


export default function HousingMapRenderer({ 
  map, 
  data, 
  selectedMetric, 
  selectedHousingType, 
  selectedCCAA
}: HousingMapRendererProps) {
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const hasSetView = useRef(false);
  
  // Calcular valores por CCAA para el periodo más reciente
  const calculateCCAAData = useCallback((data: HousingData[], metric: string) => {
    const ccaaMap = new Map<string, CCAAValue>();
    
    // Agrupar por CCAA y tomar el periodo más reciente
    data.forEach(item => {
      if (!item.ccaa_codigo || item.ccaa_codigo === '00') return;
      
      const existing = ccaaMap.get(item.ccaa_codigo);
      if (!existing || item.periodo > existing.periodo) {
        ccaaMap.set(item.ccaa_codigo, {
          ccaa_codigo: item.ccaa_codigo,
          ccaa_nombre: item.ccaa_nombre,
          valor: item.valor || 0,
          periodo: item.periodo,
          color: getColorForValue(item.valor, metric)
        });
      }
    });
    
    return Array.from(ccaaMap.values());
  }, []);
  
  // Limpiar capa
  const clearGeoJsonLayer = useCallback(() => {
    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
  }, [map]);
  
  // Cargar GeoJSON desde public/
  const loadCCAAGeoJSON = useCallback(async () => {
    try {
      const response = await fetch(GEOJSON_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error cargando GeoJSON:', error);
      // Fallback dummy
      return {
        type: "FeatureCollection",
        features: []
      };
    }
  }, []);
  
  // Función para añadir leyenda
  const addLegend = useCallback((map: L.Map, metric: string) => {
    // Remover leyenda anterior si existe
    const existingLegend = (map as any)._legendControl;
    if (existingLegend && existingLegend.remove) {
      existingLegend.remove();
    }
    
    const legend = new L.Control({ position: 'bottomright' });
    
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      
      let grades: Array<{label: string, color: string}> = [];
      let title = '';
      
      if (metric === 'indice') {
        title = '<strong>Índice de Precios</strong><br>(base 2015=100)';
        grades = [
          { label: '< 100 (Más barato)', color: '#a8d5e2' },
          { label: '100 - 120', color: '#73b3c2' },
          { label: '120 - 140', color: '#4d9db3' },
          { label: '140 - 160', color: '#2e8ba3' },
          { label: '160 - 180', color: '#1a7994' },
          { label: '180 - 200', color: '#0d6785' },
          { label: '> 200 (Más caro)', color: '#075675' }
        ];
      } else if (metric.includes('var')) {
        title = `<strong>${metric === 'var_anual' ? 'Variación Anual' : metric === 'var_trimestral' ? 'Variación Trimestral' : 'Variación YTD'}</strong><br>(%)`;
        grades = [
          { label: '< -5% (Bajada fuerte)', color: '#d7191c' },
          { label: '-5% a -2%', color: '#fdae61' },
          { label: '-2% a 2%', color: '#ffffbf' },
          { label: '2% a 5%', color: '#a6d96a' },
          { label: '> 5% (Subida fuerte)', color: '#1a9641' }
        ];
      }
      
      let html = `<div style="padding: 10px; background: white; border-radius: 5px; box-shadow: 0 0 10px rgba(0,0,0,0.2);">
        <div style="margin-bottom: 8px;">${title}</div>`;
      
      grades.forEach(grade => {
        html += `
          <div style="display: flex; align-items-center; margin-bottom: 4px;">
            <div style="width: 20px; height: 20px; background: ${grade.color}; margin-right: 8px; border: 1px solid #666;"></div>
            <span style="font-size: 12px;">${grade.label}</span>
          </div>
        `;
      });
      
      html += `<div style="margin-top: 8px; font-size: 10px; color: #666;">Último periodo disponible</div>`;
      html += `</div>`;
      
      div.innerHTML = html;
      return div;
    };
    
    (map as any)._legendControl = legend;
    legend.addTo(map);
  }, []);
  
  useEffect(() => {
    const renderMap = async () => {
      clearGeoJsonLayer();
      
      if (!data || data.length === 0) {
        console.log('HousingMapRenderer: No hay datos');
        return;
      }
      
      console.log(`HousingMapRenderer: Procesando ${data.length} registros`);
      console.log(`Métrica: ${selectedMetric}, Tipo: ${selectedHousingType}, CCAA: ${selectedCCAA || 'Todas'}`);
      
      // Calcular datos por CCAA
      const calculatedCCAAData = calculateCCAAData(data, selectedMetric);
      console.log(`Datos calculados para ${calculatedCCAAData.length} CCAA`);
      
      // Ajustar vista de España si es el primer render
      if (!hasSetView.current) {
        map.setView([40.4168, -3.7038], 6);
        hasSetView.current = true;
      }
      
      // Cargar GeoJSON
      const geoJSONData = await loadCCAAGeoJSON();
      
      // Crear capa GeoJSON
      const geoJsonLayer = L.geoJSON(geoJSONData, {
        style: (feature) => getGeoJSONStyle(feature, calculatedCCAAData, selectedMetric),
        
        onEachFeature: (feature, layer) => {
          const ccaaCode = feature.properties.codigo;
          const ccaaData = calculatedCCAAData.find(d => d.ccaa_codigo === ccaaCode);
          const ccaaName = feature.properties.nombre;
          
          // Tooltip al hover
          layer.bindTooltip(() => createTooltipContent(ccaaData, selectedMetric), {
            direction: 'top',
            sticky: true,
            className: 'ccaa-tooltip'
          });
          
          // Eventos de mouse - ⭐ CORREGIDO: Manejo correcto del hover
          layer.on({
            mouseover: (e) => {
              const layer = e.target;
              if (layer instanceof L.Path) {
                layer.setStyle({
                  weight: 3,
                  color: '#666',
                  fillOpacity: 0.85
                });
                layer.bringToFront();
              }
            },
            mouseout: (e) => {
              const layer = e.target;
              if (layer instanceof L.Path) {
                // ⭐ CORREGIDO: Restaurar estilo original
                layer.setStyle({
                  fillColor: getColorForValue(ccaaData?.valor || null, selectedMetric),
                  weight: 2,
                  opacity: 1,
                  color: 'white',
                  dashArray: '3',
                  fillOpacity: 0.7
                });
                
                // Si está seleccionada, aplicar estilo de selección
                if (selectedCCAA === ccaaCode) {
                  layer.setStyle({
                    weight: 4,
                    color: '#333',
                    fillOpacity: 0.9
                  });
                }
                
                layer.bringToFront();
              }
            },
            click: () => {
              console.log(`CCAA clickeada: ${ccaaName} (${ccaaCode})`);
            }
          });
          
          // Resaltar si está seleccionada
          if (selectedCCAA === ccaaCode) {
            if (layer instanceof L.Path) {
              layer.setStyle({
                weight: 4,
                color: '#333',
                fillOpacity: 0.9
              });
              layer.bringToFront();
            }
          }
        }
      });
      
      geoJsonLayerRef.current = geoJsonLayer;
      map.addLayer(geoJsonLayer);
      
      // Añadir leyenda
      addLegend(map, selectedMetric);
    };
    
    renderMap();
    
    return () => {
      clearGeoJsonLayer();
      // Remover leyenda
      const legendControl = (map as any)._legendControl;
      if (legendControl && legendControl.remove) {
        legendControl.remove();
      }
    };
  }, [map, data, selectedMetric, selectedHousingType, selectedCCAA, calculateCCAAData, clearGeoJsonLayer, loadCCAAGeoJSON, addLegend]);
  
  return null;
}