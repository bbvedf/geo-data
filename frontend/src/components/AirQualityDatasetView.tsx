// /home/bbvedf/prog/geo-data/frontend/src/components/AirQualityDatasetView.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import VanillaMap from './VanillaMap';
import { AirQualityStation } from './types';
import AirQualityChart from './AirQualityChart';
import { 
  FaFilter, 
  FaTrashAlt, 
  FaSpinner,
  FaSmog,
  FaChartBar, 
  FaMapMarkedAlt,
  FaDatabase,
  FaExclamationTriangle,
  FaLeaf,
  FaCity
} from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface AirQualityStationLight extends Pick<AirQualityStation, 
  'id' | 'name' | 'lat' | 'lon' | 'last_aqi' | 'quality_color' | 'pollutant' | 'station_code' | 'is_active'
> {};

interface AirQualityStationFull extends AirQualityStation {};

interface AirQualityStats {
  pollutant: string;
  description: string;
  total_stations: number;
  stations_with_data: number;
  avg_concentration: number;
  min_concentration: number;
  max_concentration: number;
  quality_distribution: Record<string, number>;
  timestamp: string;
  is_mock_data: boolean;
}

function AirQualityDatasetView() {
  const [allStations, setAllStations] = useState<AirQualityStationLight[]>([]);
  const [filteredStations, setFilteredStations] = useState<AirQualityStationLight[]>([]);
  const [fullData, setFullData] = useState<AirQualityStationFull[]>([]);
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

  // ============ CARGAR DATOS COMPLETOS (PARA GRÁFICOS) ============
  const loadFullData = useCallback(async () => {
    if (fullData.length > 0) return;

    try {
      setIsFiltering(true);

      const response = await api.get('/api/air-quality/stations', {
        params: { 
          limite: 500,
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

  // ============ APLICAR FILTROS (MANUAL) ============
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

  // ============ LIMPIAR FILTROS ============
  const clearFilters = () => {
    setFilters({
      ciudad: '',
      min_aqi: 1,
      max_aqi: 5,
      calidad: 'todas',
    });
    
    // Volver al filtrado por contaminante (sin filtros manuales)
    const filteredByPollutant = filterStationsByPollutant(allStations, selectedPollutant);
    setFilteredStations(filteredByPollutant);
    
    console.log('Filtros manuales limpiados');
  };

  const hasActiveFilters = 
    filters.ciudad !== '' || 
    filters.min_aqi > 1 || 
    filters.max_aqi < 5 ||
    filters.calidad !== 'todas';

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
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">🌫️ Calidad del Aire en España</h2>
            
            {/* Estadísticas rápidas */}
            {stats && (
              <div className="row mb-4">
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Estaciones Totales</div>
                      <div className="h4 mb-0 text-success">{allStations.length.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Mostrando</div>
                      <div className="h4 mb-0 text-warning">{filteredStations.length.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Concentración Media</div>
                      <div className="h4 mb-0 text-info">{stats.avg_concentration.toFixed(1)} ICA</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Calidad Predominante</div>
                      <div className="h4 mb-0 text-primary">
                        {Object.entries(stats.quality_distribution)
                          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selector de contaminante */}
            <div className="card border-primary mb-4 bg-body">
              <div className="card-header bg-light">
                <h3 className="h5 mb-0">
                  <FaSmog className="me-2" /> Contaminante Principal
                </h3>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {pollutants.map(pollutant => (
                    <button
                      key={pollutant.value}
                      className={`btn ${selectedPollutant === pollutant.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handlePollutantChange(pollutant.value)}
                      disabled={isFiltering}
                    >
                      {pollutant.label}
                      <span className="ms-1 small d-none d-md-inline">{pollutant.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FILTROS */}
            <div className="card border-primary mb-4 bg-body">
              <div className="card-header bg-light">
                <h3 className="h5 mb-0">
                  <FaFilter className="me-2" /> Filtros
                  {isFiltering && <FaSpinner className="ms-2 fa-spin" />}
                </h3>
              </div>
              <div className="card-body">
                {hasActiveFilters && (
                  <div className="alert alert-info mb-3">
                    <strong>⚡ Filtros activos:</strong>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {filters.ciudad && (
                        <span className="badge bg-info">Estación: {filters.ciudad}</span>
                      )}
                      {filters.min_aqi > 1 && (
                        <span className="badge bg-info">AQI mín: {filters.min_aqi}</span>
                      )}
                      {filters.max_aqi < 5 && (
                        <span className="badge bg-info">AQI máx: {filters.max_aqi}</span>
                      )}
                      {filters.calidad !== 'todas' && (
                        <span className="badge bg-info">
                          Calidad: {aqiLevels.find(l => l.value.toString() === filters.calidad)?.label}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Indicador de filtro por contaminante */}
                {selectedPollutant !== 'ALL' && (
                  <div className="alert alert-warning mb-3">
                    <strong>🌫️ Contaminante filtrado:</strong> {
                      pollutants.find(p => p.value === selectedPollutant)?.label || selectedPollutant
                    }
                    <br/>
                    <small>
                      {selectedPollutant === 'SIN_CONTAMINANTE' 
                        ? 'Mostrando estaciones sin contaminante específico' 
                        : `Mostrando estaciones que miden ${selectedPollutant}`}
                    </small>
                  </div>
                )}

                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      <FaCity className="me-1" /> Estación/Ciudad
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar estación..."
                      value={filters.ciudad}
                      onChange={(e) => setFilters({...filters, ciudad: e.target.value})}
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      <FaLeaf className="me-1" /> Nivel de Calidad
                    </label>
                    <select
                      className="form-select"
                      value={filters.calidad}
                      onChange={(e) => setFilters({...filters, calidad: e.target.value})}
                    >
                      <option value="todas">Todos los niveles</option>
                      {aqiLevels.map(level => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      <FaExclamationTriangle className="me-1" /> Rango AQI: 
                      <span className="badge bg-info ms-2">
                        {filters.min_aqi} - {filters.max_aqi}
                      </span>
                    </label>
                    <div className="d-flex gap-2">
                      <input
                        type="range"
                        className="form-range"
                        min="1"
                        max="5"
                        value={filters.min_aqi}
                        onChange={(e) => setFilters({...filters, min_aqi: parseInt(e.target.value)})}
                      />
                      <input
                        type="range"
                        className="form-range"
                        min="1"
                        max="5"
                        value={filters.max_aqi}
                        onChange={(e) => setFilters({...filters, max_aqi: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="col-12 d-flex gap-2 justify-content-end">
                    <button
                      className="btn btn-danger"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      <FaTrashAlt className="me-2" />                      
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={applyFilters}
                      disabled={isFiltering}
                    >
                      <FaFilter className="me-2" />
                      Aplicar Filtros
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-top">
                  <span className="text-muted">
                    📊 Mostrando <strong>{filteredStations.length}</strong> de{' '}
                    <strong>{allStations.length}</strong> estaciones
                    {selectedPollutant !== 'ALL' && (
                      <span> (filtrado por {selectedPollutant})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-muted mb-4">
              Mapa interactivo de calidad del aire. Haz clic en cada estación para ver detalles completos.
              {selectedPollutant === 'ALL' ? ' 🔗 Con clustering activado.' : ' 🔍 Vista detallada sin clustering.'}
            </p>
            
            {/* MAPA */}
            <div className="mb-4">
              <VanillaMap 
                data={filteredStations as any} 
                height="600px" 
                type="air-quality"
                useClustering={selectedPollutant === 'ALL'}
                selectedPollutant={selectedPollutant}
                key={`airquality-${selectedPollutant}-${filteredStations.length}`}
              />
            </div>

            {/* LEYENDA */}
            <div className="p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-card-bg)',
                  color: 'var(--color-text)'
                }}>
              <div className="row">
                <div className="col-md-8">
                  <div className="fw-medium mb-2">🎨 Leyenda:</div>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle me-2" style={{width: '16px', height: '16px', backgroundColor: '#3498db'}}></div>
                      <span className="small">O₃ (Ozono)</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle me-2" style={{width: '16px', height: '16px', backgroundColor: '#e74c3c'}}></div>
                      <span className="small">NO₂</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle me-2" style={{width: '16px', height: '16px', backgroundColor: '#2ecc71'}}></div>
                      <span className="small">PM10</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle me-2" style={{width: '16px', height: '16px', backgroundColor: '#e67e22'}}></div>
                      <span className="small">PM2.5</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle me-2" style={{width: '16px', height: '16px', backgroundColor: '#9b59b6'}}></div>
                      <span className="small">SO₂</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className="rounded-circle me-2" style={{width: '16px', height: '16px', backgroundColor: '#95a5a6'}}></div>
                      <span className="small">Sin definir</span>
                    </div>
                    <div className="d-flex align-items-center">
                        <div className="me-2">
                          <div style={{
                            width: '14px',
                            height: '14px',
                            transform: 'rotate(45deg)',
                            opacity: 0.85,
                            border: '2px solid rgba(0, 0, 0, 0.85)'
                          }}></div>
                        </div>
                        <span className="small">Estación inactiva</span>
                      </div>
                  </div>
                </div>
                <div className="col-md-4 text-md-end small text-muted">
                  <div>Fuente: MITECO - Ministerio para la Transición Ecológica</div>
                  {stats?.is_mock_data && (
                    <div className="text-warning">
                      <FaExclamationTriangle className="me-1" /> Datos simulados
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
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
                stats={stats}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">📋 Datos de Estaciones</h2>
            
            {/* Filtro de búsqueda rápida */}
            <div className="row mb-3">
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text">
                    <FaCity />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar estación..."
                    value={filters.ciudad}
                    onChange={(e) => setFilters({...filters, ciudad: e.target.value})}
                  />
                </div>
              </div>
              <div className="col-md-6">
                <select
                  className="form-select"
                  value={filters.calidad}
                  onChange={(e) => setFilters({...filters, calidad: e.target.value})}
                >
                  <option value="todas">Todas las calidades</option>
                  {aqiLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="d-flex justify-content-between mb-3">
              <p className="text-muted mb-0">
                Mostrando {filteredStations.length} estaciones
                {selectedPollutant !== 'ALL' && ` (filtrado por ${selectedPollutant})`}
              </p>
              <button
                className="btn btn-sm btn-primary"
                onClick={applyFilters}
              >
                <FaFilter className="me-1" />
                Aplicar Filtros
              </button>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Estación</th>
                    <th>AQI</th>
                    <th>Calidad</th>
                    <th>Contaminante</th>
                    <th>Estado</th>
                    <th>Coordenadas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStations.map((item, index) => (
                    <tr key={index}>
                      <td className="fw-medium">{item.name}</td>
                      <td>
                        <span className="badge" style={{ 
                          backgroundColor: item.quality_color || '#ccc',
                          color: '#fff'
                        }}>
                          {item.last_aqi || 'N/A'}
                        </span>
                      </td>
                      <td>
                        {aqiLevels.find(l => l.value === item.last_aqi)?.label || 'Sin datos'}
                      </td>
                      <td>
                        {item.pollutant || 'No definido'}
                      </td>
                      <td>
                        {item.is_active ? (
                          <span className="badge bg-success">Activa</span>
                        ) : (
                          <span className="badge bg-secondary">Inactiva</span>
                        )}
                      </td>
                      <td className="small">
                        {item.lat?.toFixed(4)}, {item.lon?.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AirQualityDatasetView;