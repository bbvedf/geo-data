// /home/bbvedf/prog/geo-data/frontend/src/components/ElectionDatasetView.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import VanillaMap from './VanillaMap';
import ElectionChart from './ElectionChart';
import ElectionTable from './ElectionTable';
import ElectionPartyView from './ElectionPartyView';
import { FaTrashAlt, FaSpinner, FaSearch, FaChartBar, FaMapMarkedAlt, FaUsers, FaTable } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface ElectionDataLight {
  codigo_ine: string;
  nombre_municipio: string;
  nombre_provincia: string;
  lat: number;
  lon: number;
  partido_ganador: string;
  participacion: number;
  poblacion: number;
}

interface ElectionDataFull {
  codigo_ine: string;
  nombre_municipio: string;
  nombre_provincia: string;
  nombre_comunidad: string;
  poblacion: number;
  lat: number;
  lon: number;
  participacion: number;
  partido_ganador: string;
  votos_ganador: number;
  pp: number;
  psoe: number;
  vox: number;
  sumar: number;
  erc: number;
  jxcat_junts: number;
  eh_bildu: number;
  eaj_pnv: number;
  bng: number;
  cca: number;
  upn: number;
  created_at: string;
}

interface ElectionStats {
  total_municipios: number;
  total_censo: number;
  total_votantes: number;
  participacion_media: number;
  totales_partidos: {
    PP: number;
    PSOE: number;
    VOX: number;
    SUMAR: number;
    ERC: number;
  };
}

// Traducciones de partidos
const partyTranslations: Record<string, string> = {
  'pp': 'PP',
  'psoe': 'PSOE',
  'vox': 'VOX',
  'sumar': 'SUMAR',
  'erc': 'ERC',
  'jxcat_junts': 'JxCat/Junts',
  'eh_bildu': 'EH Bildu',
  'eaj_pnv': 'EAJ-PNV',
  'bng': 'BNG',
  'cca': 'CCA',
  'upn': 'UPN',
  'pacma': 'PACMA',
  'cup_pr': 'CUP/PR',
  'fo': 'FO',
  'sin_datos': 'Sin Datos'
};

function ElectionDatasetView() {
  // Estados principales
  const [allMapData, setAllMapData] = useState<ElectionDataLight[]>([]); // Todos los datos sin filtrar
  const [filteredMapData, setFilteredMapData] = useState<ElectionDataLight[]>([]); // Datos filtrados
  const [fullData, setFullData] = useState<ElectionDataFull[]>([]);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data' | 'party'>('map');
  
  // Filtros
  const [filters, setFilters] = useState({
    municipio: '',
    provincia: '',
    comunidad: '',
    partido_ganador: 'todos',
    min_participacion: 0,
    max_participacion: 100,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // ============ CARGA INICIAL ============
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

        const [lightResponse, statsResponse] = await Promise.all([
          api.get('/api/elections/data', {
            params: { 
              limit: 8200,
              light: true
            },
            signal: abortControllerRef.current.signal
          }),
          api.get('/api/elections/stats', {
            signal: abortControllerRef.current.signal
          })
        ]);

        if (!isMounted) return;

        const validMapData = lightResponse.data.data.filter((item: ElectionDataLight) => 
          item.lat && item.lon && 
          !isNaN(item.lat) && !isNaN(item.lon) &&
          item.lat >= 35 && item.lat <= 44 &&
          item.lon >= -10 && item.lon <= 5
        );

        console.log(`✅ Datos light cargados: ${validMapData.length} municipios`);
        
        setAllMapData(validMapData);
        setFilteredMapData(validMapData); // Inicialmente mostrar todos
        setStats(statsResponse.data.stats);

      } catch (error: any) {
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error cargando datos:', error);
          alert('Error cargando datos electorales');
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

  // ============ CARGAR DATOS COMPLETOS PARA GRÁFICOS ============
  const loadFullData = useCallback(async () => {
    if (fullData.length > 0) return;

    try {
      setIsFiltering(true);

      const response = await api.get('/api/elections/data', {
        params: { 
          limit: 8200,
          light: false
        }
      });

      setFullData(response.data.data);
      console.log(`✅ Datos completos cargados: ${response.data.data.length} municipios`);

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

    const filtered = allMapData.filter(item => {
      if (filters.municipio && !item.nombre_municipio.toLowerCase().includes(filters.municipio.toLowerCase())) {
        return false;
      }
      if (filters.provincia && item.nombre_provincia !== filters.provincia) {
        return false;
      }
      if (filters.partido_ganador !== 'todos' && item.partido_ganador !== filters.partido_ganador) {
        return false;
      }
      if (item.participacion < filters.min_participacion || item.participacion > filters.max_participacion) {
        return false;
      }
      return true;
    });

    console.log(`Filtros aplicados: ${filtered.length} de ${allMapData.length} municipios`);
    setFilteredMapData(filtered);
    setIsFiltering(false);
  }, [allMapData, filters]);

  // ============ LIMPIAR FILTROS ============
  const clearFilters = () => {
    setFilters({
      municipio: '',
      provincia: '',
      comunidad: '',
      partido_ganador: 'todos',
      min_participacion: 0,
      max_participacion: 100,
    });
    setFilteredMapData(allMapData); // Restaurar todos los datos
  };

  const hasActiveFilters = 
    filters.municipio !== '' || 
    filters.provincia !== '' || 
    filters.comunidad !== '' || 
    filters.partido_ganador !== 'todos' || 
    filters.min_participacion > 0 || 
    filters.max_participacion < 100;

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando datos electorales...</p>
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
              <FaMapMarkedAlt className="me-1" /> Mapa Electoral
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              <FaChartBar className="me-1" /> Análisis Electoral
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'party' ? 'active' : ''}`}
              onClick={() => setActiveTab('party')}
            >
              <FaUsers className="me-1" /> Por Partido
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

      {/* TAB: MAPA */}
      {activeTab === 'map' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">🗳️ Mapa Electoral - Elecciones Generales 2023</h2>
            
            {/* Estadísticas rápidas */}
            {stats && (
              <div className="row mb-4">
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Municipios</div>
                      <div className="h4 mb-0 text-primary">{stats.total_municipios.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Participación</div>
                      <div className="h4 mb-0 text-success">{stats.participacion_media.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Censo Total</div>
                      <div className="h4 mb-0 text-warning">{(stats.total_censo / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-primary">
                    <div className="card-body p-3 text-center rounded-4 bg-body">
                      <div className="text-muted small">Votantes</div>
                      <div className="h4 mb-0 text-info">{(stats.total_votantes / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FILTROS */}
            <div className="card border-primary mb-4 bg-body">
              <div className="card-header bg-light">
                <h3 className="h5 mb-0">
                  🔍 Filtros Electorales 
                  {isFiltering && <FaSpinner className="ms-2 fa-spin" />}
                </h3>
              </div>
              <div className="card-body">
                {/* Badges de filtros activos */}
                {hasActiveFilters && (
                  <div className="alert alert-warning mb-3">
                    <strong>⚡ Filtros activos:</strong>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {filters.municipio && (
                        <span className="badge bg-warning text-dark">Municipio: {filters.municipio}</span>
                      )}
                      {filters.provincia && (
                        <span className="badge bg-warning text-dark">Provincia: {filters.provincia}</span>
                      )}
                      {filters.comunidad && (
                        <span className="badge bg-warning text-dark">Comunidad: {filters.comunidad}</span>
                      )}
                      {filters.partido_ganador !== 'todos' && (
                        <span className="badge bg-warning text-dark">
                          Ganador: {partyTranslations[filters.partido_ganador] || filters.partido_ganador}
                        </span>
                      )}
                      {filters.min_participacion > 0 && (
                        <span className="badge bg-warning text-dark">Part. mín: {filters.min_participacion}%</span>
                      )}
                      {filters.max_participacion < 100 && (
                        <span className="badge bg-warning text-dark">Part. máx: {filters.max_participacion}%</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  {/* Municipio */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Municipio</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar municipio..."
                      value={filters.municipio}
                      onChange={(e) => setFilters({...filters, municipio: e.target.value})}
                    />
                  </div>

                  {/* Provincia */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Provincia</label>
                    <select
                      className="form-select"
                      value={filters.provincia}
                      onChange={(e) => setFilters({...filters, provincia: e.target.value})}
                    >
                      <option value="">Todas las provincias</option>
                      {Array.from(new Set(allMapData.map(d => d.nombre_provincia)))
                        .sort()
                        .map(provincia => (
                          <option key={provincia} value={provincia}>{provincia}</option>
                        ))}
                    </select>
                  </div>

                  {/* Partido ganador */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Partido Ganador</label>
                    <select
                      className="form-select"
                      value={filters.partido_ganador}
                      onChange={(e) => setFilters({...filters, partido_ganador: e.target.value})}
                    >
                      <option value="todos">Todos los partidos</option>
                      {Array.from(new Set(allMapData.map(d => d.partido_ganador)))
                        .sort()
                        .map(partido => (
                          <option key={partido} value={partido}>
                            {partyTranslations[partido] || partido.toUpperCase()}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Participación */}
                  <div className="col-12 col-md-8">
                    <label className="form-label">
                      Participación: <span className="badge bg-info">
                        {filters.min_participacion}% - {filters.max_participacion}%
                      </span>
                    </label>
                    <div className="d-flex gap-2 align-items-center">
                      <input
                        type="range"
                        className="form-range"
                        min="0"
                        max="100"
                        value={filters.min_participacion}
                        onChange={(e) => setFilters({...filters, min_participacion: parseInt(e.target.value)})}
                      />
                      <input
                        type="range"
                        className="form-range"
                        min="0"
                        max="100"
                        value={filters.max_participacion}
                        onChange={(e) => setFilters({...filters, max_participacion: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="col-12 col-md-4 d-flex gap-2 align-items-end">
                    <button
                      className="btn btn-danger"
                      onClick={clearFilters}
                      disabled={!hasActiveFilters}
                    >
                      <FaTrashAlt />
                    </button>
                    <button
                      className="btn btn-primary grow"
                      onClick={applyFilters}
                      disabled={isFiltering}
                    >
                      <FaSearch className="me-2" />
                      {isFiltering ? 'Filtrando...' : 'Aplicar Filtros'}
                    </button>
                  </div>
                </div>

                {/* Contador */}
                <div className="mt-3 pt-3 border-top">
                  <span className="text-muted">
                    📊 Mostrando <strong>{filteredMapData.length.toLocaleString()}</strong> de{' '}
                    <strong>{allMapData.length.toLocaleString()}</strong> municipios
                  </span>
                </div>
              </div>
            </div>

            {/* MAPA */}
            <div className="mb-4">
              <VanillaMap 
                data={filteredMapData} 
                height="600px" 
                type="elections"
                key={`map-${filteredMapData.length}`}
              />
            </div>

            {/* LEYENDA COMPLETA */}
            <div className="row">
              <div className="col-12">
                <div className="p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-card-bg)',
                  color: 'var(--color-text)'
                }}>
                  <div className="row bg-light align-items-center">
                    <div className="col-12 col-md-8 mb-3 mb-md-0">
                      <div className="d-flex align-items-center">
                        <div className="fw-medium me-3">🎨 Leyenda Partidos:</div>
                        <div className="d-flex flex-wrap gap-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle me-2" style={{
                              width: '16px', 
                              height: '16px', 
                              backgroundColor: '#0056A8'
                            }}></div>
                            <span className="small">PP</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle me-2" style={{
                              width: '16px', 
                              height: '16px', 
                              backgroundColor: '#E30613'
                            }}></div>
                            <span className="small">PSOE</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle me-2" style={{
                              width: '16px', 
                              height: '16px', 
                              backgroundColor: '#63BE21'
                            }}></div>
                            <span className="small">VOX</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle me-2" style={{
                              width: '16px', 
                              height: '16px', 
                              backgroundColor: '#EA5F94'
                            }}></div>
                            <span className="small">SUMAR</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle me-2" style={{
                              width: '16px', 
                              height: '16px', 
                              backgroundColor: '#FFB232'
                            }}></div>
                            <span className="small">ERC</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-12 col-md-4">
                      <div className="small text-muted text-md-end">
                        <div><span className="fw-medium">Municipios mostrados:</span> {filteredMapData.length.toLocaleString()}</div>
                        <div><span className="fw-medium">Partidos diferentes:</span> {
                          Array.from(new Set(filteredMapData.map(d => d.partido_ganador))).length
                        }</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mt-2 pt-2">
                    <div className="col-12">
                      <div className="small text-muted">
                        💡 <strong>Consejos:</strong> Haz clic en cualquier municipio para ver detalles completos. 
                        Los clusters (números) agrupan municipios cercanos - haz clic para expandirlos.
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
        <>
          {isFiltering ? (
            <div className="text-center py-5">
              <FaSpinner className="fa-spin text-primary" size={48} />
              <p className="mt-3">Cargando datos completos para gráficos...</p>
            </div>
          ) : (
            <ElectionChart data={fullData} />
          )}
        </>
      )}

      {/* TAB: POR PARTIDO */}
      {activeTab === 'party' && <ElectionPartyView />}

      {/* TAB: TABLA */}
      {activeTab === 'data' && <ElectionTable />}
    </>
  );
}

export default ElectionDatasetView;