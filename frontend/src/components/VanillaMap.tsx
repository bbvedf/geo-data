// /home/bbvedf/prog/geo-data/frontend/src/components/VanillaMap.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import MapBase from './MapBase';
import CovidMapRenderer from './CovidMapRenderer';
import WeatherMapRenderer from './WeatherMapRenderer';
import ElectionMapRenderer from './ElectionMapRenderer';
import AirQualityMapRenderer from './AirQualityMapRenderer';
import { 
  isCovidData, 
  isWeatherData, 
  isElectionData, 
  isAirQualityData,
  MapDataType, 
  MapType,
  AirQualityStation 
} from './types';
import L from 'leaflet';

interface VanillaMapProps {
  data: MapDataType[];
  height?: string;
  type?: MapType | 'auto';
  // Nuevas props específicas para calidad del aire
  useClustering?: boolean;
  selectedPollutant?: string;
}

// Componente memoizado para evitar re-renders innecesarios
export default function VanillaMap({ 
  data, 
  height = '500px', 
  type = 'auto',
  useClustering = true,
  selectedPollutant = 'ALL'
}: VanillaMapProps) {
  const [mapReady, setMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [markersInstance, setMarkersInstance] = useState<L.LayerGroup | null>(null);

  // 1. Memoizar el tipo de datos para evitar cálculos repetidos
  const dataType = useMemo(() => {
    if (type !== 'auto') return type;
    if (data.length === 0) return 'covid' as MapType;
    
    const firstItem = data[0];
    if ('temperature' in firstItem) return 'weather';
    if ('partido_ganador' in firstItem) return 'elections';
    if ('station_code' in firstItem) return 'air-quality';
    return 'covid';
  }, [type, data]);

  // 2. Memoizar datos filtrados (evita pasar arrays nuevos constantemente)
  const processedData = useMemo(() => {
    // Si no hay cambios reales, devolver referencia igual
    return [...data];
  }, [data]);

  // 3. Callback memoizado para cuando el mapa esté listo
  const handleMapReady = useCallback((map: L.Map, markers: L.LayerGroup) => {
    // Solo actualizar si realmente ha cambiado
    setMapInstance(prev => {
      if (prev === map) return prev;
      return map;
    });
    setMarkersInstance(prev => {
      if (prev === markers) return prev;
      return markers;
    });
    setMapReady(true);
  }, []);

  // 4. Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (mapInstance) {
        try {
          mapInstance.remove();
        } catch (error) {
          console.warn('Error limpiando mapa:', error);
        }
      }
      setMapReady(false);
      setMapInstance(null);
      setMarkersInstance(null);
    };
  }, []);

  // 5. Evitar renderizar si no hay datos válidos
  const shouldRender = mapReady && mapInstance && markersInstance && processedData.length > 0;
  
  // 6. Renderizar el renderer adecuado solo cuando sea necesario
  const renderDataRenderer = useMemo(() => {
    if (!shouldRender) return null;

    console.log(`VanillaMap: Renderizando ${processedData.length} elementos (tipo: ${dataType})`);

    try {
      switch (dataType) {
        case 'covid':
          if (isCovidData(processedData)) {
            return (
              <CovidMapRenderer 
                key="covid-renderer"
                map={mapInstance} 
                markers={markersInstance} 
                data={processedData} 
              />
            );
          }
          break;
          
        case 'weather':
          if (isWeatherData(processedData)) {
            return (
              <WeatherMapRenderer 
                key="weather-renderer"
                map={mapInstance} 
                markers={markersInstance} 
                data={processedData} 
              />
            );
          }
          break;
          
        case 'elections':
          if (isElectionData(processedData)) {
            return (
              <ElectionMapRenderer 
                key="elections-renderer"
                map={mapInstance} 
                markers={markersInstance} 
                data={processedData} 
              />
            );
          }
          break;

        case 'air-quality':
          if (isAirQualityData(processedData)) {
            // Determinar automáticamente si usar clustering
            const shouldCluster = useClustering && selectedPollutant === 'ALL';
            
            console.log(`AirQuality config: clustering=${shouldCluster}, pollutant=${selectedPollutant}`);
            
            return (
              <AirQualityMapRenderer 
                key={`air-quality-renderer-${selectedPollutant}-${shouldCluster}`}
                map={mapInstance} 
                markers={markersInstance} 
                data={processedData as AirQualityStation[]}
                useClustering={shouldCluster}
                selectedPollutant={selectedPollutant}
              />
            );
          }
          break;
      }
    } catch (error) {
      console.error('Error renderizando mapa:', error);
      return null;
    }

    return null;
  }, [shouldRender, dataType, processedData, mapInstance, markersInstance, useClustering, selectedPollutant]);

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <MapBase 
        key={`map-base-${height}`} // Key única para forzar recreación si cambia altura
        onMapReady={handleMapReady} 
        height={height} 
      />
      
      {renderDataRenderer}
    </div>
  );
}