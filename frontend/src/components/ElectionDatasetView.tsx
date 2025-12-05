// @ts-nocheck
// /home/bbvedf/prog/geo-data/frontend/src/components/ElectionDatasetView.tsx
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import VanillaMap from './VanillaMap';
import { FaTrashAlt, FaSpinner, FaVoteYea, FaUsers, FaChartBar, FaMapMarkedAlt } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface ElectionData {
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
  pacma: number;
  cup_pr: number;
  fo: number;
  created_at: string;
}

interface PartyResultsData {
  comunidad: string;
  total_votos: number;
  porcentaje_votos: number;
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

function ElectionDatasetView() {
  const [electionData, setElectionData] = useState<ElectionData[]>([]);
  const [_partyData, setPartyData] = useState<PartyResultsData[]>([]);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data' | 'party'>('map');
  const [selectedParty, _setSelectedParty] = useState<string>('pp');
  
  const [filters, setFilters] = useState({
    municipio: '',
    provincia: '',
    comunidad: '',
    partido_ganador: 'todos',
    min_participacion: 0,
    max_participacion: 100,
  });

  const [filteredData, setFilteredData] = useState<ElectionData[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  
  // CORREGIDO: useRef para timeouts
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // NUEVO: Referencia para abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Lista de partidos para el selector
  const partidos = [
    { value: 'pp', label: 'PP', color: '#0056A8' },
    { value: 'psoe', label: 'PSOE', color: '#E30613' },
    { value: 'vox', label: 'VOX', color: '#63BE21' },
    { value: 'sumar', label: 'SUMAR', color: '#EA5F94' },
    { value: 'erc', label: 'ERC', color: '#FFB232' },
    { value: 'jxcat_junts', label: 'JxCat/Junts', color: '#FFD100' },
    { value: 'eh_bildu', label: 'EH Bildu', color: '#6DBE45' },
    { value: 'eaj_pnv', label: 'EAJ-PNV', color: '#008D3C' },
    { value: 'bng', label: 'BNG', color: '#6A3B8C' },
    { value: 'cca', label: 'CCA', color: '#FF7F00' },
    { value: 'upn', label: 'UPN', color: '#800080' },
  ];

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

  // NUEVO: Memoizar datos para evitar referencias nuevas constantemente
  const memoizedElectionData = useMemo(() => {
    return electionData;
  }, [
    electionData.length,
    // Solo recalcular si cambian los primeros 50 elementos (referencia)
    JSON.stringify(electionData.slice(0, 50))
  ]);

  const memoizedFilteredData = useMemo(() => {
    return filteredData;
  }, [
    filteredData.length,
    JSON.stringify(filteredData.slice(0, 50))
  ]);

  // NUEVO: Función para filtrar datos localmente (más rápida)
  const filterDataLocally = useCallback((data: ElectionData[], filters: any) => {
    return data.filter(item => {
      // Filtro por municipio
      if (filters.municipio && !item.nombre_municipio.toLowerCase().includes(filters.municipio.toLowerCase())) {
        return false;
      }
      
      // Filtro por provincia
      if (filters.provincia && item.nombre_provincia !== filters.provincia) {
        return false;
      }
      
      // Filtro por comunidad
      if (filters.comunidad && item.nombre_comunidad !== filters.comunidad) {
        return false;
      }
      
      // Filtro por partido ganador
      if (filters.partido_ganador !== 'todos' && item.partido_ganador !== filters.partido_ganador) {
        return false;
      }
      
      // Filtro por participación
      if (item.participacion < filters.min_participacion || item.participacion > filters.max_participacion) {
        return false;
      }
      
      return true;
    });
  }, []);

  // Cargar datos iniciales - OPTIMIZADO
  useEffect(() => {
    let isMounted = true;
    
    const fetchInitialData = async () => {
      try {
        if (!isMounted) return;
        
        setLoading(true);
        
        // Cancelar peticiones anteriores
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        // Añadir delay para evitar cargas simultáneas con otros componentes
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Datos principales - LIMITAR a 2000 inicialmente
        const [dataResponse, statsResponse] = await Promise.all([
          api.get('/api/elections/data', {
            params: { limit: 5000 }, // ¡LIMITADO!
            signal: abortControllerRef.current.signal
          }),
          api.get('/api/elections/stats', {
            signal: abortControllerRef.current.signal
          })
        ]);
        
        if (!isMounted) return;
        
        const data = dataResponse.data.data;
        
        // Filtrar datos inválidos inmediatamente
        const validData = data.filter((item: ElectionData) => 
          item.lat && item.lon && 
          !isNaN(item.lat) && !isNaN(item.lon) &&
          item.lat >= 35 && item.lat <= 44 && // Coordenadas de España
          item.lon >= -10 && item.lon <= 5
        );
        
        console.log(`Datos electorales cargados: ${validData.length} municipios válidos de ${data.length} totales`);
        
        setElectionData(validData);
        setFilteredData(validData);
        setStats(statsResponse.data.stats);
        
      } catch (error: any) {
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error loading election data:', error);
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

  // NUEVO: Efecto para aplicar filtros con debounce
  useEffect(() => {
    if (electionData.length === 0) return;
    
    // Limpiar timeout anterior
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
      filterTimeoutRef.current = null;
    }
    
    setIsFiltering(true);
    
    // Usar debounce para evitar aplicar filtros rápidamente
    filterTimeoutRef.current = setTimeout(() => {
      const filtered = filterDataLocally(electionData, filters);
      
      // LIMITAR resultados para el mapa si son muchos
      const limitedFiltered = filtered.length > 3000 
        ? filtered.slice(0, 3000)
        : filtered;
      
      setFilteredData(limitedFiltered);
      setIsFiltering(false);
      
      console.log(`Filtros aplicados: ${limitedFiltered.length} de ${filtered.length} municipios (limitado a 1500 para mapa)`);
    }, 300); // 300ms de debounce
    
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = null;
      }
    };
  }, [filters, electionData, filterDataLocally]);

  // Cargar datos específicos de partido cuando se selecciona
  useEffect(() => {
    if (activeTab === 'party') {
      fetchPartyData();
    }
  }, [selectedParty, activeTab]);

  const fetchPartyData = async () => {
    try {
      setIsFiltering(true);
      const response = await api.get(`/api/elections/party/${selectedParty}`);
      setPartyData(response.data.data);
      console.log(`Datos de ${selectedParty} cargados: ${response.data.count} comunidades`);
    } catch (error) {
      console.error('Error loading party data:', error);
      setPartyData([]);
    } finally {
      setIsFiltering(false);
    }
  };

  // NUEVO: Función para cargar TODOS los datos (si es necesario)
  const loadAllData = async () => {
    if (electionData.length > 8000) return; // Ya cargados
    
    try {
      setIsFiltering(true);
      
      // Cancelar peticiones anteriores
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await api.get('/api/elections/data', {
        params: { limit: 10000 },
        signal: abortControllerRef.current.signal
      });
      
      const validData = response.data.data.filter((item: ElectionData) => 
        item.lat && item.lon && 
        !isNaN(item.lat) && !isNaN(item.lon)
      );
      
      setElectionData(validData);
      console.log(`Todos los datos cargados: ${validData.length} municipios`);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading all data:', error);
      }
    } finally {
      setIsFiltering(false);
    }
  };

  // CORREGIDO: Esta función ya no es necesaria para filtros básicos
  // Se mantiene por si necesitas filtros complejos que requieran API
  const applyFilters = async () => {
    // Los filtros básicos se aplican automáticamente
    // Esta función sería para filtros complejos que requieran API
    console.log('Para filtros complejos, implementar llamada API aquí');
  };

  const clearFilters = () => {
    setFilters({
      municipio: '',
      provincia: '',
      comunidad: '',
      partido_ganador: 'todos',
      min_participacion: 0,
      max_participacion: 100,
    });
    // Los datos se actualizarán automáticamente por el useEffect
    console.log('Filtros limpiados');
  };

  const hasActiveFilters = 
    filters.municipio !== '' || 
    filters.provincia !== '' || 
    filters.comunidad !== '' || 
    filters.partido_ganador !== 'todos' || 
    filters.min_participacion > 0 || 
    filters.max_participacion < 100;

  // ... el resto del código se mantiene igual

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
              onClick={() => {
                setActiveTab('data');
                // Cargar todos los datos solo cuando se necesita la tabla completa
                if (electionData.length < 8000) {
                  loadAllData();
                }
              }}
            >
              <FaVoteYea className="me-1" /> Datos Completos
            </button>
          </li>
        </ul>
      </div>

      {activeTab === 'map' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">🗳️ Mapa Electoral - Elecciones Generales 2023</h2>
            
            {/* Estadísticas rápidas */}
            {stats && (
              <div className="row mb-4">
                <div className="col-md-3 col-6">
                  <div className="card border-primary border">
                    <div className="card-body p-3 text-center">
                      <div className="text-muted small">Municipios</div>
                      <div className="h4 mb-0 text-primary">{stats.total_municipios.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-success border">
                    <div className="card-body p-3 text-center">
                      <div className="text-muted small">Participación</div>
                      <div className="h4 mb-0 text-success">{stats.participacion_media.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-warning border">
                    <div className="card-body p-3 text-center">
                      <div className="text-muted small">Censo Total</div>
                      <div className="h4 mb-0 text-warning">{(stats.total_censo / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 col-6">
                  <div className="card border-info border">
                    <div className="card-body p-3 text-center">
                      <div className="text-muted small">Votantes</div>
                      <div className="h4 mb-0 text-info">{(stats.total_votantes / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FILTROS */}
            <div className="card border-primary mb-4">
              <div className="card-header bg-primary text-white">
                <h3 className="h5 mb-0">🔍 Filtros Electorales {isFiltering && <FaSpinner className="ms-2 fa-spin" />}</h3>
              </div>
              <div className="card-body">
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
                        <span className="badge bg-warning text-dark">Ganador: {filters.partido_ganador}</span>
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
                      {Array.from(new Set(electionData.map(d => d.nombre_provincia)))
                        .sort()
                        .map(provincia => (
                          <option key={provincia} value={provincia}>{provincia}</option>
                        ))}
                    </select>
                  </div>

                  {/* Comunidad */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Comunidad Autónoma</label>
                    <select
                      className="form-select"
                      value={filters.comunidad}
                      onChange={(e) => setFilters({...filters, comunidad: e.target.value})}
                    >
                      <option value="">Todas las comunidades</option>
                      {Array.from(new Set(electionData.map(d => d.nombre_comunidad)))
                        .sort()
                        .map(comunidad => (
                          <option key={comunidad} value={comunidad}>{comunidad}</option>
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
                      {Array.from(new Set(electionData.map(d => d.partido_ganador)))
                        .sort()
                        .map(partido => (
                          <option key={partido} value={partido}>
                            {partyTranslations[partido] || partido}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Rango participación */}
                  <div className="col-12 col-md-4">
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
                        step="1"
                        value={filters.min_participacion}
                        onChange={(e) => setFilters({...filters, min_participacion: parseInt(e.target.value)})}
                      />
                      <input
                        type="range"
                        className="form-range"
                        min="0"
                        max="100"
                        step="1"
                        value={filters.max_participacion}
                        onChange={(e) => setFilters({...filters, max_participacion: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="d-flex justify-content-between small text-muted mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="col-12 col-md-4 d-flex gap-2 align-items-end">
                    <button
                      className="btn btn-danger flex-grow-1"
                      onClick={clearFilters}
                      disabled={isFiltering || !hasActiveFilters}
                    >
                      <FaTrashAlt className="me-2" />
                      Limpiar
                    </button>
                    
                    {/* Nota: Los filtros se aplican automáticamente */}
                  </div>
                </div>

                {/* Contador */}
                <div className="mt-3 pt-3 border-top">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">
                      📊 Mostrando <strong>{filteredData.length}</strong> de{' '}
                      <strong>{electionData.length}</strong> municipios
                      {filteredData.length >= 3000 && (
                        <span className="text-warning ms-2">
                          (limitado a 3000 para rendimiento del mapa)
                        </span>
                      )}
                    </span>
                    {stats && (
                      <span className="text-muted">
                        🗳️ Participación media: <strong>{stats.participacion_media.toFixed(1)}%</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-muted mb-4">
              Mapa electoral interactivo de las Elecciones Generales 2023.
              Cada punto representa un municipio, coloreado según el partido ganador.
            </p>
            
                        {/* MAPA - USAR datos memoizados */}
            <div className="row mb-4">
              <div className="col-12">
                <VanillaMap 
                  data={memoizedFilteredData} 
                  height="600px" 
                  type="elections"
                  key={`map-${filteredData.length}-${hasActiveFilters}`}
                />
              </div>
            </div>

            {/* LEYENDA COMPLETA */}
            <div className="row">
              <div className="col-12">
                <div className="p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-card-bg)',
                  color: 'var(--color-text)'
                }}>
                  <div className="row align-items-center">
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
                        <div><span className="fw-medium">Municipios mostrados:</span> {filteredData.length}</div>
                        <div><span className="fw-medium">Partidos diferentes:</span> {
                          Array.from(new Set(filteredData.map(d => d.partido_ganador))).length
                        }</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mt-2 pt-2 border-top">
                    <div className="col-12">
                      <div className="small text-muted">
                        💡 <strong>Consejos:</strong> Haz clic en cualquier municipio para ver detalles. 
                        Los clusters (números) agrupan municipios cercanos - haz clic para expandirlos.
                        {filteredData.length >= 1500 && (
                          <span className="text-warning ms-1">
                            (Se muestran {filteredData.length} de {electionData.length} municipios para mejor rendimiento)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resto del código se mantiene igual... */}
      {/* Solo cambiar las referencias a filteredData por memoizedFilteredData */}
    </>
  );
}

export default ElectionDatasetView;