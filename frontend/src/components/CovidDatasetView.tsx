// src/components/CovidDatasetView.tsx
import { useEffect, useState } from 'react'
import axios from 'axios'
import VanillaMap from './VanillaMap'
import CovidChart from './CovidChart'
import Footer from './Footer'
import { FaFilter, FaTrashAlt, FaSpinner } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
})

interface Dataset {
  id: string
  name: string
  type: string
}

interface CovidData {
  fecha: string
  comunidad: string
  provincia: string
  casos: number
  lat: number
  lon: number
}

function CovidDatasetView() {  
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [covidData, setCovidData] = useState<CovidData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map');
  const [filters, setFilters] = useState({
    comunidad: 'todas',
    provincia: 'todas',
    fechaInicio: '2023-01-01',
    fechaFin: '2023-03-31',
    minCasos: 0,
    maxCasos: 10000
  });

  const [filteredData, setFilteredData] = useState<CovidData[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  const applyFilters = async () => {
    setIsFiltering(true);
    try {
      const params = new URLSearchParams();
      if (filters.comunidad !== 'todas') params.append('comunidad', filters.comunidad);
      if (filters.provincia !== 'todas') params.append('provincia', filters.provincia);
      if (filters.fechaInicio) params.append('fecha_inicio', filters.fechaInicio);
      if (filters.fechaFin) params.append('fecha_fin', filters.fechaFin);
      if (filters.minCasos > 0) params.append('min_casos', filters.minCasos.toString());
      if (filters.maxCasos < 10000) params.append('max_casos', filters.maxCasos.toString());
      
      const response = await api.get(`/api/covid/filter?${params.toString()}`);
      setFilteredData(response.data.data);
      console.log(`Filtros aplicados: ${response.data.count} registros encontrados`);
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
      alert('Error al aplicar filtros');
    } finally {
      setIsFiltering(false);
    }
  };

  const hasActiveFilters = 
    filters.comunidad !== 'todas' || 
    filters.provincia !== 'todas' || 
    filters.fechaInicio !== '2023-01-01' || 
    filters.fechaFin !== '2023-03-31' ||
    filters.minCasos > 0 || 
    filters.maxCasos < 10000;

  const clearFilters = () => {
    setFilters({
      comunidad: 'todas',
      provincia: 'todas',
      fechaInicio: '2023-01-01',
      fechaFin: '2023-03-31',
      minCasos: 0,
      maxCasos: 10000
    });
    setFilteredData([]);
    console.log('Filtros limpiados, mostrando todos los datos');
  };

  useEffect(() => {
    Promise.all([
      api.get('/api/datasets'),
      api.get('/api/data/covid')
    ])
    .then(([datasetsRes, covidRes]) => {
      setDatasets(datasetsRes.data.datasets)
      setCovidData(covidRes.data.data)
    })
    .catch(error => {
      console.error('Error loading data:', error)
    })
    .finally(() => {
      setLoading(false)
    })
  }, [])

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

      
      <main className="container py-4">
        {/* TABS */}
        <div className="row mb-4">
          <div className="col-12">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
                  onClick={() => setActiveTab('map')}
                >
                  🗺️ Mapa Interactivo
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chart')}
                >
                  📈 Gráficos
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'data' ? 'active' : ''}`}
                  onClick={() => setActiveTab('data')}
                >
                  📋 Datos
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* CONTENIDO DE TABS */}
        <div className="row">
          <div className="col-12">
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
                          <h3 className="h5 mb-0">🔍 Filtros</h3>
                        </div>
                        <div className="card-body">
                          {/* Indicador de filtros activos */}
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

                          {/* Filtros principales - 4 en fila */}
                          <div className="row g-3 mb-3">
                            {/* Comunidad */}
                            <div className="col-12 col-md-3">
                              <label className="form-label">Comunidad</label>
                              <select
                                className="form-select"
                                value={filters.comunidad}
                                onChange={(e) => setFilters({...filters, comunidad: e.target.value})}
                              >
                                <option value="todas">Todas las comunidades</option>
                                {Array.from(new Set(covidData.map(d => d.comunidad))).sort().map(comunidad => (
                                  <option key={comunidad} value={comunidad}>{comunidad}</option>
                                ))}
                              </select>
                            </div>

                            {/* Provincia */}
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
                                    covidData
                                      .filter(d => d.comunidad === filters.comunidad)
                                      .map(d => d.provincia)
                                      .filter(p => p)
                                  )).sort().map(provincia => (
                                    <option key={provincia} value={provincia}>{provincia}</option>
                                  ))
                                }
                              </select>
                            </div>

                            {/* Fecha inicio */}
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

                            {/* Fecha fin */}
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

                          {/* Rangos y botones - 3 elementos en fila */}
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

                            <div className="col-12 col-md-4 d-flex align-items-end gap-2">
                              <button
                                className="btn btn-danger flex-grow-1"
                                onClick={clearFilters}
                                disabled={isFiltering || !hasActiveFilters}
                              >
                                <FaTrashAlt className="me-2" />
                                Limpiar
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

                          {/* Contador de resultados */}
                          {filteredData.length > 0 && (
                            <div className="row mt-3 pt-3 border-top">
                              <div className="col-12">
                                <div className="d-flex justify-content-between">
                                  <span className="text-muted">
                                    📊 Mostrando <strong>{filteredData.length}</strong> de{' '}
                                    <strong>{covidData.length}</strong> registros
                                  </span>
                                  <span className="text-muted">
                                    {((filteredData.length / covidData.length) * 100).toFixed(1)}% del total
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
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
                      <VanillaMap data={filteredData.length > 0 ? filteredData : covidData} height="600px" />
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
                              <div><span className="fw-medium">Total puntos:</span> {covidData.length}</div>
                              <div><span className="fw-medium">Comunidades:</span> {new Set(covidData.map(d => d.comunidad)).size}</div>
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
                      <CovidChart data={covidData} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <>
                {/* Tabla responsive */}
                <div className="row">
                  <div className="col-12">
                    <div className="card shadow">
                      <div className="card-body">
                        <div className="row mb-4">
                          <div className="col-12">
                            <h2 className="card-title">📋 Datos COVID</h2>
                          </div>
                        </div>
                        <div className="row">
                          <div className="col-12">
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead>
                                  <tr>
                                    <th>Fecha</th>
                                    <th>Comunidad</th>
                                    <th>Casos</th>
                                    <th>Coordenadas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {covidData.map((item, index) => (
                                    <tr key={index}>
                                      <td>{item.fecha}</td>
                                      <td className="fw-medium">{item.comunidad}</td>
                                      <td>{item.casos.toLocaleString()}</td>
                                      <td className="text-muted">
                                        {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="row mt-4">
          <div className="col-12">
            <Footer dataCount={covidData.length} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default CovidDatasetView;