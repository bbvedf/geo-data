// frontend/src/components/AirQualityDatasetView.tsx
// Componente principal de orquestación.
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  AirQualityStationLight,
  AirQualityStats,
  AirQualityStation
} from './types';
import AirQualityChart from './AirQualityChart';
import AirQualityTable from './AirQualityTable';
import AirQualityMapView from './AirQualityMapView';
import { 
  FaSpinner,
  FaChartBar, 
  FaMapMarkedAlt,
  FaDatabase,
} from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});


function AirQualityDatasetView() {
  const [allStations, setAllStations] = useState<AirQualityStationLight[]>([]);
  const [filteredStations, setFilteredStations] = useState<AirQualityStationLight[]>([]);
  const [fullData, setFullData] = useState<AirQualityStation[]>([]);
  const [stats, setStats] = useState<AirQualityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map');
  const [selectedPollutant, setSelectedPollutant] = useState<string>('ALL');
  
  const [filters, setFilters] = useState({
    ciudad: '',
    min_aqi: 1,
    max_aqi: 5,
    calidad: 'todas',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Función para filtrar estaciones por contaminante seleccionado
  const filterStationsByPollutant = useCallback((stations: AirQualityStationLight[], pollutant: string) => {
    console.log('🔍 Filtrando:', stations.length, 'estaciones por:', pollutant);
    
    if (pollutant === 'ALL') {
      console.log('   → Devolviendo TODAS');
      return stations;
    }
    
    const filtered = stations.filter(station => {
      // Para "No definido"
      if (pollutant === 'SIN_CONTAMINANTE') {
        const hasNoPollutant = !station.pollutant || station.pollutant === '' || station.pollutant === null;
        console.log(`   Estación ${station.name}: pollutant="${station.pollutant}" → ${hasNoPollutant ? 'INCLUIR' : 'EXCLUIR'}`);
        return hasNoPollutant;
      }
      
      // Para contaminantes específicos
      const matches = station.pollutant === pollutant;
      console.log(`   Estación ${station.name}: pollutant="${station.pollutant}" === "${pollutant}" → ${matches ? 'INCLUIR' : 'EXCLUIR'}`);
      return matches;
    });
    
    console.log('   → Resultado:', filtered.length, 'estaciones');
    if (filtered.length > 0) {
      console.log('   → Primera estación filtrada:', filtered[0]);
    }
    
    return filtered;
  }, []);

  const handlePollutantChange = async (pollutant: string) => {
    console.log('🔄 Cambiando contaminante a:', pollutant);
    setSelectedPollutant(pollutant);
    setIsFiltering(true);
    
    try {
      // NOTA: El filtrado de estaciones lo hace el useEffect de abajo
      // Solo necesitamos recargar stats
      
      const statsResponse = await api.get('/api/air-quality/stats', {
        params: { 
          contaminante: pollutant === 'ALL' ? 'PM2.5' : pollutant,
          forzar_mock: false 
        }
      });
      
      setStats(statsResponse.data);
      
    } catch (error) {
      console.error('Error cambiando contaminante:', error);
    } finally {
      setIsFiltering(false);
    }
  };

  // Contaminantes disponibles
  const pollutants = [
    { value: 'ALL', label: 'Todos', description: '', color: '#666666' },
    { value: 'O3', label: 'O₃', description: 'Ozono', color: '#3498db' },
    { value: 'NO2', label: 'NO₂', description: 'Dióxido de nitrógeno', color: '#e74c3c' },
    { value: 'PM10', label: 'PM10', description: 'Partículas < 10µm', color: '#2ecc71' },
    { value: 'PM2.5', label: 'PM2.5', description: 'Partículas finas < 2.5µm', color: '#e67e22' },
    { value: 'SO2', label: 'SO₂', description: 'Dióxido de azufre', color: '#9b59b6' },
    { value: 'SIN_CONTAMINANTE', label: 'No definido', description: '', color: '#95a5a6' }
  ];

  // Niveles de calidad del aire
  const aqiLevels = [
    { value: 1, label: 'Buena', color: '#00e400'},
    { value: 2, label: 'Moderada', color: '#feca57'},
    { value: 3, label: 'Mala', color: '#ff7e00'},
    { value: 4, label: 'Muy Mala', color: '#ff0000'},
    { value: 5, label: 'Extremadamente Mala', color: '#8f3f97'},
  ];

  // ============ CARGA INICIAL (UNA SOLA VEZ) ============
  useEffect(() => {
    let isMounted = true;
    
    const fetchInitialData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        // Cargar TODAS las estaciones (sin filtro por contaminante)
        const [stationsResponse, statsResponse] = await Promise.all([
          api.get('/api/air-quality/stations', {
            params: { 
              limite: 1000,
              solo_con_datos: false,
              light: true
            },
            signal: abortControllerRef.current.signal
          }),
          api.get('/api/air-quality/stats', {
            params: { 
              contaminante: 'PM2.5', // Stats iniciales con PM2.5
              forzar_mock: false 
            },
            signal: abortControllerRef.current.signal
          })
        ]);

        if (!isMounted) return;

        const validStations = stationsResponse.data.stations.filter((station: AirQualityStationLight) => 
          station.lat && station.lon && 
          !isNaN(station.lat) && !isNaN(station.lon)
        );

        console.log(`✅ Estaciones AirQuality light: ${validStations.length}`);
        console.log('📊 Ejemplo de estación:', validStations[0]);
        
        setAllStations(validStations);
        
        // Filtrar según el contaminante seleccionado inicialmente (ALL)
        const initiallyFiltered = filterStationsByPollutant(validStations, 'ALL');
        console.log(`✅ Estaciones inicialmente filtradas: ${initiallyFiltered.length}`);
        
        setFilteredStations(initiallyFiltered);
        setStats(statsResponse.data);

      } catch (error: any) {
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error cargando datos calidad aire:', error);
          alert('Error cargando datos de calidad del aire');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []); // <-- SOLO UNA VEZ

  // ============ EFECTO PARA FILTRAR CUANDO CAMBIA EL CONTAMINANTE ============
  useEffect(() => {
    if (allStations.length === 0) {
      console.log('⏳ Esperando carga inicial de estaciones...');
      return;
    }
    
    console.log('🔄 Re-filtrando por cambio de contaminante:', selectedPollutant);
    console.log('📊 Estaciones disponibles para filtrar:', allStations.length);
    
    const filtered = filterStationsByPollutant(allStations, selectedPollutant);
    console.log(`✅ Filtrado completado: ${filtered.length} estaciones para ${selectedPollutant}`);
    
    setFilteredStations(filtered);
    
  }, [selectedPollutant, allStations, filterStationsByPollutant]);

  // ============ AUTO-FILTRO PARA PESTAÑA "DATA" ============
  useEffect(() => {
    // Solo aplicar auto-filtro en la pestaña "data"
    if (activeTab !== 'data') return;
    
    console.log('🔄 Auto-filtrando en pestaña datos...', filters);
    
    const applyAutoFilters = () => {
      let result = [...allStations];
      
      // Debug
      const stationsWithoutAqi = result.filter(s => !s.last_aqi || s.last_aqi === 0).length;
      console.log('🔍 Debug:', {
        total: allStations.length,
        sinAqi: stationsWithoutAqi,
        filtros: filters,
        contaminante: selectedPollutant
      });
      
      // 1. Filtrar por contaminante primero
      if (selectedPollutant !== 'ALL') {
        result = filterStationsByPollutant(result, selectedPollutant);
      }
      
      // 2. Filtrar por ciudad (búsqueda)
      if (filters.ciudad) {
        result = result.filter(item => 
          item.name.toLowerCase().includes(filters.ciudad.toLowerCase())
        );
      }
      
      // 3. Filtrar por calidad
      if (filters.calidad !== 'todas') {
        const calidadNum = parseInt(filters.calidad);
        result = result.filter(item => item.last_aqi === calidadNum);
      }
      
      // 4. Filtrar por rango AQI (solo si no es el rango completo 1-5)
      if (filters.min_aqi > 1 || filters.max_aqi < 5) {
        result = result.filter(item => {
          const aqi = item.last_aqi || 0;
          return aqi >= filters.min_aqi && aqi <= filters.max_aqi;
        });
      }
      
      console.log(`✅ Auto-filtrado en pestaña datos: ${result.length} estaciones`);
      setFilteredStations(result);
    };
    
    // Aplicar con debounce para mejor performance
    const timeoutId = setTimeout(applyAutoFilters, 300);
    return () => clearTimeout(timeoutId);
    
  }, [activeTab, filters, allStations, selectedPollutant, filterStationsByPollutant]);

  // ============ CARGAR DATOS COMPLETOS (PARA GRÁFICOS) ============
  const loadFullData = useCallback(async () => {
    if (fullData.length > 0) return;

    try {
      setIsFiltering(true);

      const response = await api.get('/api/air-quality/stations', {
        params: { 
          limite: 1000,
          contaminante: selectedPollutant === 'ALL' ? 'PM2.5' : selectedPollutant,
          solo_con_datos: false,
          light: false
        }
      });

      setFullData(response.data.stations);
      console.log(`✅ Estaciones completas: ${response.data.stations.length}`);

    } catch (error) {
      console.error('Error cargando datos completos:', error);
    } finally {
      setIsFiltering(false);
    }
  }, [fullData.length, selectedPollutant]);

  useEffect(() => {
    if (activeTab === 'chart' && fullData.length === 0) {
      loadFullData();
    }
  }, [activeTab, fullData.length, loadFullData]);

  // ============ APLICAR FILTROS (MANUAL - para pestaña mapa) ============
  const applyFilters = useCallback(() => {
    setIsFiltering(true);
    
    setTimeout(() => {
      try {
        let filtered = [...filteredStations]; // Usar filteredStations (ya filtrado por contaminante)
        
        if (filters.ciudad) {
          filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(filters.ciudad.toLowerCase())
          );
        }
        
        filtered = filtered.filter(item => {
          const aqi = item.last_aqi || 0;
          return aqi >= filters.min_aqi && aqi <= filters.max_aqi;
        });
        
        if (filters.calidad !== 'todas') {
          const calidadNum = parseInt(filters.calidad);
          filtered = filtered.filter(item => item.last_aqi === calidadNum);
        }
        
        setFilteredStations(filtered);
        console.log(`Filtros manuales aplicados: ${filtered.length} estaciones`);
        
      } catch (error) {
        console.error('Error aplicando filtros:', error);
      } finally {
        setIsFiltering(false);
      }
    }, 100);
  }, [filteredStations, filters]);

  // ============ FUNCIÓN PARA EXPORTAR DATOS ============
  const handleExportData = () => {
    if (filteredStations.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const dataToExport = filteredStations.map(station => ({
      Estación: station.name,
      Estado: station.is_active ? 'Activa' : 'Inactiva',
      AQI: station.last_aqi || 'N/A',
      Calidad: aqiLevels.find(l => l.value === station.last_aqi)?.label || 'Sin datos',
      Contaminante: station.pollutant || 'No definido',
      Tipo: station.station_type || `Clase ${station.station_class || 'N/A'}`,
      Latitud: station.lat,
      Longitud: station.lon,
      'Código Estación': station.station_code
    }));
    
    // Convertir a CSV
    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );
    
    const csvContent = [headers, ...rows].join('\n');
    
    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `calidad-aire_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📊 Exportados ${filteredStations.length} registros`);
  };

  // ============ LIMPIAR FILTROS ============
  const clearFilters = () => {
    // 1. Resetear filtros manuales
    setFilters({
      ciudad: '',
      min_aqi: 1,
      max_aqi: 5,
      calidad: 'todas',
    });
    
    // 2. Resetear contaminante a "Todos"
    setSelectedPollutant('ALL');
    
    // 3. Diferente comportamiento según la pestaña activa
    if (activeTab === 'map') {
      // Para el mapa: usar applyFilters para re-aplicar (sin filtros)
      applyFilters();
    } else if (activeTab === 'data') {
      // Para datos: simplemente mostrar todas las estaciones
      setFilteredStations(allStations);
    }
    // Para chart: no necesita hacer nada especial
    
    // 4. Recargar stats para "Todos"
    const loadStatsForAll = async () => {
      try {
        const statsResponse = await api.get('/api/air-quality/stats', {
          params: { 
            contaminante: 'PM2.5', // O cualquier default
            forzar_mock: false 
          }
        });
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Error cargando stats:', error);
      }
    };
    loadStatsForAll();
    
    console.log('✅ Todos los filtros limpiados');
  };


  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-success" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando datos de calidad del aire...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* TABS */}
      <div className="mb-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <FaMapMarkedAlt className="me-1" /> Mapa de Calidad
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              <FaChartBar className="me-1" /> Análisis
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <FaDatabase className="me-1" /> Datos
            </button>
          </li>
        </ul>
      </div>

      {activeTab === 'map' && (
        <AirQualityMapView
          allStations={allStations}
          filteredStations={filteredStations}
          stats={stats}
          filters={filters}
          selectedPollutant={selectedPollutant}
          pollutants={pollutants}
          aqiLevels={aqiLevels}
          isFiltering={isFiltering}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          onApplyFilters={applyFilters}
          onPollutantChange={handlePollutantChange}
        />
      )}

      {activeTab === 'chart' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">📈 Análisis de Calidad del Aire</h2>
            {isFiltering ? (
              <div className="text-center py-5">
                <FaSpinner className="fa-spin text-primary" size={48} />
                <p className="mt-3">Cargando datos completos...</p>
              </div>
            ) : (
              <AirQualityChart 
                data={fullData}
                pollutant={selectedPollutant}                
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <AirQualityTable
          stations={filteredStations}
          selectedPollutant={selectedPollutant}
          pollutants={pollutants}
          aqiLevels={aqiLevels}
          onFilterChange={(newFilters) => {
            // Solo actualizar ciudad y calidad, mantener min_aqi y max_aqi
            setFilters(prev => ({ 
              ...prev, 
              ciudad: newFilters.ciudad || '', 
              calidad: newFilters.calidad || 'todas' 
            }));
          }}
          onClearFilters={() => {
            setFilters({
              ciudad: '',
              min_aqi: 1,
              max_aqi: 5,
              calidad: 'todas',
            });
          }}
          onExport={handleExportData}
        />
      )}
      </div>
    </>
  );
}

export default AirQualityDatasetView;