// /home/bbvedf/prog/geo-data/frontend/src/components/CovidDatasetView.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import VanillaMap from './VanillaMap'
import CovidChart from './CovidChart'
import CovidTable from './CovidTable'
import { FaFilter, FaTrashAlt, FaSpinner, FaMapMarkedAlt, FaChartBar, FaTable } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
})

interface CovidDataLight {
  id: number;
  fecha: string;
  comunidad: string;
  provincia: string;
  casos: number;
  lat: number;
  lon: number;
}

interface CovidDataFull extends CovidDataLight {
  ingresos_uci: number;
  fallecidos: number;
  altas: number;
}

function CovidDatasetView() {  
  const [allCovidData, setAllCovidData] = useState<CovidDataLight[]>([]);
  const [filteredCovidData, setFilteredCovidData] = useState<CovidDataLight[]>([]);
  const [fullData, setFullData] = useState<CovidDataFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map');
  
  const [filters, setFilters] = useState({
    comunidad: 'todas',
    provincia: 'todas',
    fechaInicio: '2023-01-01',
    fechaFin: '2023-03-31',
    minCasos: 0,
    maxCasos: 10000
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // ============ CARGA INICIAL (LIGHT MODE) ============
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

        // Cargar datos LIGHT (solo coords + casos + fecha)
        const response = await api.get('/api/covid/data', {
          params: { 
            limit: 10000,
            light: true
          },
          signal: abortControllerRef.current.signal
        });

        if (!isMounted) return;

        const validData = response.data.data.filter((item: CovidDataLight) => 
          item.lat && item.lon && 
          !isNaN(item.lat) && !isNaN(item.lon)
        );

        console.log(`✅ Datos COVID light cargados: ${validData.length} registros`);
        
        setAllCovidData(validData);
        setFilteredCovidData(validData);

      } catch (error: any) {
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error cargando datos:', error);
          alert('Error cargando datos COVID');
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
  }, []);

  // ============ CARGAR DATOS COMPLETOS (PARA GRÁFICOS) ============
  const loadFullData = useCallback(async () => {
    if (fullData.length > 0) return;

    try {
      setIsFiltering(true);

      const response = await api.get('/api/covid/data', {
        params: { 
          limit: 10000,
          light: false
        }
      });

      setFullData(response.data.data);
      console.log(`✅ Datos COVID completos cargados: ${response.data.data.length} registros`);

    } catch (error) {
      console.error('Error cargando datos completos:', error);
    } finally {
      setIsFiltering(false);
    }
  }, [fullData.length]);

  useEffect(() => {
    if (activeTab === 'chart' && fullData.length === 0) {
      loadFullData();
    }
  }, [activeTab, fullData.length, loadFullData]);

  // ============ APLICAR FILTROS (MANUAL) ============
  const applyFilters = useCallback(() => {
    setIsFiltering(true);

    const filtered = allCovidData.filter(item => {
      if (filters.comunidad !== 'todas' && item.comunidad !== filters.comunidad) {
        return false;
      }
      if (filters.provincia !== 'todas' && item.provincia !== filters.provincia) {
        return false;
      }
      if (filters.fechaInicio && item.fecha < filters.fechaInicio) {
        return false;
      }
      if (filters.fechaFin && item.fecha > filters.fechaFin) {
        return false;
      }
      if (item.casos < filters.minCasos || item.casos > filters.maxCasos) {
        return false;
      }
      return true;
    });

    console.log(`Filtros aplicados: ${filtered.length} de ${allCovidData.length} registros`);
    setFilteredCovidData(filtered);
    setIsFiltering(false);
  }, [allCovidData, filters]);

  // ============ LIMPIAR FILTROS ============
  const clearFilters = () => {
    setFilters({
      comunidad: 'todas',
      provincia: 'todas',
      fechaInicio: '2023-01-01',
      fechaFin: '2023-03-31',
      minCasos: 0,
      maxCasos: 10000
    });
    setFilteredCovidData(allCovidData);
    console.log('Filtros limpiados, mostrando todos los datos');
  };

  const hasActiveFilters = 
    filters.comunidad !== 'todas' || 
    filters.provincia !== 'todas' || 
    filters.fechaInicio !== '2023-01-01' || 
    filters.fechaFin !== '2023-03-31' ||
    filters.minCasos > 0 || 
    filters.maxCasos < 10000;

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando datos geoespaciales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* TABS */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <FaMapMarkedAlt className="me-1" /> Mapa Interactivo
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
                onClick={() => setActiveTab('chart')}
              >
                <FaChartBar className="me-1" /> Gráficos
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'data' ? 'active' : ''}`}
                onClick={() => setActiveTab('data')}
              >
                <FaTable className="me-1" /> Tabla Datos
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* TAB: MAPA */}
      {activeTab === 'map' && (
        <div className="card shadow">
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-12">
                <h2 className="card-title">🗺️ Mapa de Casos COVID en España</h2>
              </div>
            </div>
            
            {/* FILTROS */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="card border-primary">
                  <div className="card-header" style={{ 
                    backgroundColor: 'var(--color-button-bg)', 
                    color: 'var(--color-button-text)' 
                  }}>
                    <h3 className="h5 mb-0">
                      🔍 Filtros
                      {isFiltering && <FaSpinner className="ms-2 fa-spin" />}
                    </h3>
                  </div>
                  <div className="card-body">
                    {/* Badges de filtros activos */}
                    {hasActiveFilters && (
                      <div className="row mb-3">
                        <div className="col-12">
                          <div className="alert alert-warning">
                            <strong>⚡ Filtros activos:</strong>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {filters.comunidad !== 'todas' && (
                                <span className="badge bg-warning text-dark">Comunidad: {filters.comunidad}</span>
                              )}
                              {filters.provincia !== 'todas' && (
                                <span className="badge bg-warning text-dark">Provincia: {filters.provincia}</span>
                              )}
                              {(filters.fechaInicio !== '2023-01-01' || filters.fechaFin !== '2023-03-31') && (
                                <span className="badge bg-warning text-dark">
                                  Fechas: {filters.fechaInicio} a {filters.fechaFin}
                                </span>
                              )}
                              {filters.minCasos > 0 && (
                                <span className="badge bg-warning text-dark">Mín: {filters.minCasos} casos</span>
                              )}
                              {filters.maxCasos < 10000 && (
                                <span className="badge bg-warning text-dark">Máx: {filters.maxCasos} casos</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Filtros principales */}
                    <div className="row g-3 mb-3">
                      <div className="col-12 col-md-3">
                        <label className="form-label">Comunidad</label>
                        <select
                          className="form-select"
                          value={filters.comunidad}
                          onChange={(e) => setFilters({...filters, comunidad: e.target.value, provincia: 'todas'})}
                        >
                          <option value="todas">Todas las comunidades</option>
                          {Array.from(new Set(allCovidData.map(d => d.comunidad))).sort().map(comunidad => (
                            <option key={comunidad} value={comunidad}>{comunidad}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Provincia</label>
                        <select
                          className="form-select"
                          value={filters.provincia}
                          onChange={(e) => setFilters({...filters, provincia: e.target.value})}
                          disabled={filters.comunidad === 'todas'}
                        >
                          <option value="todas">
                            {filters.comunidad === 'todas' ? 'Selecciona comunidad primero' : 'Todas las provincias'}
                          </option>
                          {filters.comunidad !== 'todas' && 
                            Array.from(new Set(
                              allCovidData
                                .filter(d => d.comunidad === filters.comunidad)
                                .map(d => d.provincia)
                                .filter(p => p)
                            )).sort().map(provincia => (
                              <option key={provincia} value={provincia}>{provincia}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Fecha inicio</label>
                        <input
                          type="date"
                          className="form-control"
                          value={filters.fechaInicio}
                          onChange={(e) => setFilters({...filters, fechaInicio: e.target.value})}
                          min="2023-01-01"
                          max="2023-03-31"
                        />
                      </div>

                      <div className="col-12 col-md-3">
                        <label className="form-label">Fecha fin</label>
                        <input
                          type="date"
                          className="form-control"
                          value={filters.fechaFin}
                          onChange={(e) => setFilters({...filters, fechaFin: e.target.value})}
                          min="2023-01-01"
                          max="2023-03-31"
                        />
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="form-label">
                          Mínimo de casos: <span className="badge bg-info">{filters.minCasos}</span>
                        </label>
                        <input
                          type="range"
                          className="form-range"
                          min="0"
                          max="10000"
                          step="100"
                          value={filters.minCasos}
                          onChange={(e) => setFilters({...filters, minCasos: parseInt(e.target.value)})}
                        />
                      </div>

                      <div className="col-12 col-md-4">
                        <label className="form-label">
                          Máximo de casos: <span className="badge bg-info">{filters.maxCasos}</span>
                        </label>
                        <input
                          type="range"
                          className="form-range"
                          min="0"
                          max="10000"
                          step="100"
                          value={filters.maxCasos}
                          onChange={(e) => setFilters({...filters, maxCasos: parseInt(e.target.value)})}
                        />
                      </div>

                      <div className="col-12 col-md-4 d-flex gap-2 align-items-end">
                        <button
                          className="btn btn-danger"
                          onClick={clearFilters}
                          disabled={isFiltering || !hasActiveFilters}
                        >
                          <FaTrashAlt />                          
                        </button>
                        
                        <button
                          className="btn btn-primary flex-grow-1"
                          onClick={applyFilters}
                          disabled={isFiltering}
                        >
                          {isFiltering ? (
                            <>
                              <FaSpinner className="me-2 fa-spin" />
                              Aplicando...
                            </>
                          ) : (
                            <>
                              <FaFilter className="me-2" />
                              Aplicar Filtros
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Contador */}
                    <div className="row mt-3 pt-3 border-top">
                      <div className="col-12">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">
                            📊 Mostrando <strong>{filteredCovidData.length.toLocaleString()}</strong> de{' '}
                            <strong>{allCovidData.length.toLocaleString()}</strong> registros
                          </span>
                          {filteredCovidData.length !== allCovidData.length && (
                            <span className="text-muted">
                              {((filteredCovidData.length / allCovidData.length) * 100).toFixed(1)}% del total
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-12">
                <p className="text-muted">
                  Mapa interactivo con círculos proporcionales al número de casos.
                  Haz clic en cada punto para más detalles.
                </p>
              </div>
            </div>
            
            {/* MAPA */}
            <div className="row mb-4">
              <div className="col-12">
                <VanillaMap 
                  data={filteredCovidData}
                  height="600px"
                  type="covid"
                  key={`map-${filteredCovidData.length}`}
                />
              </div>
            </div>
            
            {/* LEYENDA */}
            <div className="row">
              <div className="col-12">
                <div className="p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-card-bg)',
                  color: 'var(--color-text)'
                }}>
                  <div className="row align-items-center">
                    <div className="col-12 col-md-8 mb-3 mb-md-0">
                      <div className="d-flex align-items-center">
                        <div className="fw-medium me-3">🎯 Leyenda:</div>
                        <div className="d-flex flex-wrap gap-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-danger me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Alto (1800+ casos)</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-warning me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Medio (1600-1800)</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-success me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Moderado (1400-1600)</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-info me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Bajo (menos de 1400)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-12 col-md-4">
                      <div className="small text-muted text-md-end">
                        <div><span className="fw-medium">Total puntos:</span> {filteredCovidData.length.toLocaleString()}</div>
                        <div><span className="fw-medium">Comunidades:</span> {new Set(filteredCovidData.map(d => d.comunidad)).size}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mt-2 pt-2 border-top">
                    <div className="col-12">
                      <div className="small text-muted">
                        💡 El tamaño del círculo es proporcional al número de casos. Haz clic en cualquier punto para ver detalles.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: GRÁFICOS */}
      {activeTab === 'chart' && (
        <div className="card shadow">
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-12">
                <h2 className="card-title">📈 Análisis Temporal COVID</h2>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                {isFiltering ? (
                  <div className="text-center py-5">
                    <FaSpinner className="fa-spin text-primary" size={48} />
                    <p className="mt-3">Cargando datos completos para gráficos...</p>
                  </div>
                ) : (
                  <CovidChart data={fullData} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TABLA */}
      {activeTab === 'data' && <CovidTable />}
    </div>
  );
}

export default CovidDatasetView;