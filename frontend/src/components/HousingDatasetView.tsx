// frontend/src/components/HousingDatasetView.tsx
// COMPONENTE PRINCIPAL - Pestañas independientes
import { useEffect, useState, useCallback, useRef } from 'react';
import { HousingData } from './types';
import HousingChart from './HousingChart';
import HousingMapView from './HousingMapView';
import HousingTable from './HousingTable';
import {
  FaSpinner,
  FaChartBar,
  FaMapMarkedAlt,
  FaDatabase,
  FaTrashAlt,
} from 'react-icons/fa';

// ============================================================================
// TIPOS
// ============================================================================

type TabType = 'map' | 'chart' | 'data';

interface TabFilterState {
  metric: string;
  housingType: string;
  ccaa: string;
  anioDesde: number;
  anioHasta: number;
  trimestre: number;
}

interface ApiResponse {
  success: boolean;
  count: number;
  total: number;
  data: HousingData[];
}

const DEFAULT_FILTERS: TabFilterState = {
  metric: 'indice',
  housingType: 'general',
  ccaa: '00',
  anioDesde: 2020,
  anioHasta: 2025,
  trimestre: 0,
};

// CCAA opciones completas
const CCAA_OPTIONS = [
  { value: '00', label: 'Nacional', description: 'Total España' },
  { value: '01', label: 'Andalucía' },
  { value: '02', label: 'Aragón' },
  { value: '03', label: 'Asturias, Principado de' },
  { value: '04', label: 'Balears, Illes' },
  { value: '05', label: 'Canarias' },
  { value: '06', label: 'Cantabria' },
  { value: '07', label: 'Castilla y León' },
  { value: '08', label: 'Castilla - La Mancha' },
  { value: '09', label: 'Cataluña' },
  { value: '10', label: 'Comunitat Valenciana' },
  { value: '11', label: 'Extremadura' },
  { value: '12', label: 'Galicia' },
  { value: '13', label: 'Madrid, Comunidad de' },
  { value: '14', label: 'Murcia, Región de' },
  { value: '15', label: 'Navarra, Comunidad Foral de' },
  { value: '16', label: 'País Vasco' },
  { value: '17', label: 'Rioja, La' },
  { value: '18', label: 'Ceuta' },
  { value: '19', label: 'Melilla' }
];

const METRICS = [
  { value: 'indice', label: 'Índice', description: 'Precio base 2015=100', color: '#3498db' },
  { value: 'var_anual', label: 'Var. Anual', description: 'Variación anual %', color: '#e74c3c' },
  { value: 'var_trimestral', label: 'Var. Trimestral', description: 'Variación trimestral %', color: '#2ecc71' },
  { value: 'var_ytd', label: 'Var. YTD', description: 'Variación año actual %', color: '#e67e22' }
];

const HOUSING_TYPES = [
  { value: 'general', label: 'General', description: 'Precio general vivienda', color: '#3498db' },
  { value: 'nueva', label: 'Vivienda Nueva', description: 'Vivienda de nueva construcción', color: '#9b59b6' },
  { value: 'segunda_mano', label: 'Segunda Mano', description: 'Vivienda de segunda mano', color: '#1abc9c' }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function HousingDatasetView() {
  console.log('🏠 HousingDatasetView INICIANDO');
  
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [loading, setLoading] = useState(true);

  // ========== ESTADO INDEPENDIENTE POR PESTAÑA ==========
  const [mapFilters, setMapFilters] = useState<TabFilterState>(DEFAULT_FILTERS);
  const [chartFilters, setChartFilters] = useState<TabFilterState>(DEFAULT_FILTERS);
  const [dataFilters, setDataFilters] = useState<TabFilterState>(DEFAULT_FILTERS);

  // ========== DATOS CARGADOS POR PESTAÑA ==========
  const [mapData, setMapData] = useState<HousingData[]>([]);
  const [chartData, setChartData] = useState<HousingData[]>([]);
  const [dataTableData, setDataTableData] = useState<HousingData[]>([]);

  // ========== ESTADO DE CARGA POR PESTAÑA ==========
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  // const [isLoadingData, setIsLoadingData] = useState(false);

  const abortControllersRef = useRef<Map<TabType, AbortController>>(new Map());

  // ========== FUNCIÓN GENÉRICA DE CARGA DE DATOS ==========
  const loadTabData = useCallback(
    async (tab: TabType, filters: TabFilterState, signal: AbortSignal): Promise<HousingData[] | null> => {
      try {
        const params = new URLSearchParams();
        params.append('metric', filters.metric);
        params.append('housing_type', filters.housingType);
        
        if (filters.ccaa !== '00') {
          params.append('ccaa', filters.ccaa);
        }
        
        params.append('anio_desde', filters.anioDesde.toString());
        params.append('anio_hasta', filters.anioHasta.toString());
        
        if (filters.trimestre > 0) {
          params.append('trimestre', filters.trimestre.toString());
        }

        // Para chart cargamos más registros
        const limit = tab === 'chart' ? '5000' : '1000';
        params.append('limit', limit);

        console.log(`📡 Cargando datos para ${tab}:`, {
          metric: filters.metric,
          housingType: filters.housingType,
          ccaa: filters.ccaa,
          anioDesde: filters.anioDesde,
          anioHasta: filters.anioHasta,
          trimestre: filters.trimestre
        });

        const response = await fetch(
          `http://localhost:8180/api/housing/data?${params}`,
          { signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json: ApiResponse = await response.json();

        if (!json.success) {
          throw new Error('API error');
        }

        console.log(`✅ ${tab}: ${json.data.length} registros cargados`);
        return json.data || [];
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log(`⏸️ Carga de ${tab} cancelada`);
          return null;
        }
        console.error(`❌ Error cargando datos para ${tab}:`, error);
        return [];
      }
    },
    []
  );

  // ========== CARGA INICIAL ==========
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        console.log('🚀 Iniciando carga de datos...');

        const controller = new AbortController();

        const [map, chart, data] = await Promise.all([
          loadTabData('map', DEFAULT_FILTERS, controller.signal),
          loadTabData('chart', DEFAULT_FILTERS, controller.signal),
          loadTabData('data', DEFAULT_FILTERS, controller.signal),
        ]);

        if (map !== null) setMapData(map);
        if (chart !== null) setChartData(chart);
        if (data !== null) setDataTableData(data);

        console.log('✅ Carga inicial completada');
      } catch (error) {
        console.error('❌ Error en carga inicial:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadTabData]);

  // ========== CAMBIOS EN FILTROS DEL MAPA ==========
  useEffect(() => {
    if (!activeTab.includes('map') || loading) return;

    setIsLoadingMap(true);

    const controller = new AbortController();
    abortControllersRef.current.set('map', controller);

    (async () => {
      const data = await loadTabData('map', mapFilters, controller.signal);
      if (data !== null) {
        setMapData(data);
      }
      setIsLoadingMap(false);
    })();

    return () => {
      const ctrl = abortControllersRef.current.get('map');
      if (ctrl) ctrl.abort();
    };
  }, [mapFilters, loading, loadTabData]);

  // ========== CAMBIOS EN FILTROS DEL ANÁLISIS ==========
  useEffect(() => {
    if (!activeTab.includes('chart') || loading) return;

    setIsLoadingChart(true);

    const controller = new AbortController();
    abortControllersRef.current.set('chart', controller);

    (async () => {
      const data = await loadTabData('chart', chartFilters, controller.signal);
      if (data !== null) {
        setChartData(data);
      }
      setIsLoadingChart(false);
    })();

    return () => {
      const ctrl = abortControllersRef.current.get('chart');
      if (ctrl) ctrl.abort();
    };
  }, [chartFilters, loading, loadTabData]);

  // ========== CAMBIOS EN FILTROS DE DATOS ==========
  useEffect(() => {
    if (!activeTab.includes('data') || loading) return;

    // const setIsLoadingData = true;

    const controller = new AbortController();
    abortControllersRef.current.set('data', controller);

    (async () => {
      const data = await loadTabData('data', dataFilters, controller.signal);
      if (data !== null) {
        setDataTableData(data);
      }
      // setIsLoadingData(false);
    })();

    return () => {
      const ctrl = abortControllersRef.current.get('data');
      if (ctrl) ctrl.abort();
    };
  }, [dataFilters, loading, loadTabData]);

  // ========== HANDLERS DE CAMBIO DE FILTROS ==========

  const updateMapFilters = useCallback((partial: Partial<TabFilterState>) => {
    setMapFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateChartFilters = useCallback((partial: Partial<TabFilterState>) => {
    setChartFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  // ========== FUNCIÓN APLICAR FILTROS PARA MAPA ==========
  const applyMapFilters = useCallback(() => {
    setIsLoadingMap(true);
    console.log('Aplicando filtros del mapa...');
    setIsLoadingMap(false);
  }, []);

  const clearMapFilters = useCallback(() => {
    setMapFilters(DEFAULT_FILTERS);
  }, []);

  const clearChartFilters = useCallback(() => {
    setChartFilters(DEFAULT_FILTERS);
  }, []);

  const clearDataFilters = useCallback(() => {
    setDataFilters(DEFAULT_FILTERS);
  }, []);

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando datos de precios de vivienda...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', overflow: 'hidden' }}>
      {/* TABS */}
      <div className="mb-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <FaMapMarkedAlt className="me-1" /> Mapa de Precios
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

      {/* TAB MAPA */}
      {activeTab === 'map' && (
        <HousingMapView
          allData={mapData}
          filteredData={mapData}
          filters={{
            anio_desde: mapFilters.anioDesde,
            anio_hasta: mapFilters.anioHasta,
            trimestre: mapFilters.trimestre,
          }}
          selectedMetric={mapFilters.metric}
          selectedHousingType={mapFilters.housingType}
          selectedCCAA={mapFilters.ccaa}
          metrics={METRICS}
          housingTypes={HOUSING_TYPES}
          ccaaOptions={CCAA_OPTIONS}
          isFiltering={isLoadingMap}
          onFilterChange={(newFilters) => {
            updateMapFilters({
              anioDesde: newFilters.anio_desde ?? mapFilters.anioDesde,
              anioHasta: newFilters.anio_hasta ?? mapFilters.anioHasta,
              trimestre: newFilters.trimestre ?? mapFilters.trimestre,
            });
          }}
          onClearFilters={clearMapFilters}
          onApplyFilters={applyMapFilters} // ✅ CORREGIDO: Se añade esta prop
          onMetricChange={(metric) => updateMapFilters({ metric })}
          onHousingTypeChange={(housingType) => updateMapFilters({ housingType })}
          onCCAAChange={(ccaa) => updateMapFilters({ ccaa })}
        />
      )}

      {/* TAB ANÁLISIS */}
      {activeTab === 'chart' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">📊 Análisis de Precios de Vivienda</h2>

            {/* CONTROLES DE FILTRO */}
            <div className="card border-primary mb-4 bg-body">
              <div className="card-header bg-light">
                <h5 className="h5 mb-0">⚙️ Filtros del Análisis</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Métrica</label>
                    <select
                      className="form-select"
                      value={chartFilters.metric}
                      onChange={(e) => updateChartFilters({ metric: e.target.value })}
                      disabled={isLoadingChart}
                    >
                      {METRICS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Tipo de Vivienda</label>
                    <select
                      className="form-select"
                      value={chartFilters.housingType}
                      onChange={(e) => updateChartFilters({ housingType: e.target.value })}
                      disabled={isLoadingChart}
                    >
                      {HOUSING_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Área Geográfica</label>
                    <select
                      className="form-select"
                      value={chartFilters.ccaa}
                      onChange={(e) => updateChartFilters({ ccaa: e.target.value })}
                      disabled={isLoadingChart}
                    >
                      {CCAA_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 d-flex gap-2 justify-content-end">
                    <button
                      className="btn btn-danger"
                      onClick={clearChartFilters}
                      disabled={isLoadingChart}
                      title="Limpiar todos los filtros"
                    >
                      <FaTrashAlt className="me-2" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-top">
                  <small className="text-muted">
                    📊 Datos cargados: <strong>{chartData.length}</strong> registros
                    {isLoadingChart && <FaSpinner className="ms-2 fa-spin" />}
                  </small>
                </div>
              </div>
            </div>

            {isLoadingChart ? (
              <div className="text-center py-5">
                <FaSpinner className="fa-spin text-primary" size={48} />
                <p className="mt-3">Cargando datos completos...</p>
              </div>
            ) : (
              <HousingChart
                data={chartData}
                metric={chartFilters.metric}
                housingType={chartFilters.housingType}
                ccaa={chartFilters.ccaa}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB DATOS */}
      {activeTab === 'data' && (
        <HousingTable
          data={dataTableData}
          selectedMetric={dataFilters.metric}
          selectedHousingType={dataFilters.housingType}
          selectedCCAA={dataFilters.ccaa}
          filters={{
            anio_desde: dataFilters.anioDesde,
            anio_hasta: dataFilters.anioHasta,
            trimestre: dataFilters.trimestre,
          }}
          metrics={METRICS}
          housingTypes={HOUSING_TYPES}
          ccaaOptions={CCAA_OPTIONS}
          isFiltering={false}
          onFilterChange={(newFilters) => {
            setDataFilters((prev) => ({
              ...prev,
              anioDesde: newFilters.anio_desde ?? prev.anioDesde,
              anioHasta: newFilters.anio_hasta ?? prev.anioHasta,
              trimestre: newFilters.trimestre ?? prev.trimestre,
            }));
          }}
          onMetricChange={(metric) => setDataFilters((prev) => ({ ...prev, metric }))}
          onHousingTypeChange={(housingType) => setDataFilters((prev) => ({ ...prev, housingType }))}
          onCCAAChange={(ccaa) => setDataFilters((prev) => ({ ...prev, ccaa }))}
          onClearFilters={clearDataFilters}
          onExport={() => {
            // Exportar respetando los filtros de esta pestaña
            const exportData = dataTableData.map((item) => ({
              Periodo: item.periodo,
              Año: item.anio,
              Trimestre: item.trimestre,
              CCAA: item.ccaa_nombre,
              'Código CCAA': item.ccaa_codigo,
              'Tipo Vivienda': item.tipo_vivienda,
              Métrica: item.metrica,
              Valor: item.valor?.toFixed(2) || 'N/A',
            }));

            // Convertir a CSV
            const headers = Object.keys(exportData[0]).join(',');
            const rows = exportData.map((row) =>
              Object.values(row)
                .map((value) =>
                  typeof value === 'string' && value.includes(',') ? `"${value}"` : value
                )
                .join(',')
            );

            const csvContent = [headers, ...rows].join('\n');

            // Crear y descargar archivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute(
              'download',
              `precios-vivienda_${new Date().toISOString().split('T')[0]}.csv`
            );
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log(`📥 Exportados ${dataTableData.length} registros con filtros: `, {
              metric: dataFilters.metric,
              housingType: dataFilters.housingType,
              ccaa: dataFilters.ccaa,
              anioDesde: dataFilters.anioDesde,
              anioHasta: dataFilters.anioHasta,
              trimestre: dataFilters.trimestre,
            });
          }}
        />
      )}
    </div>
  );
}

export default HousingDatasetView;