// frontend/src/components/HousingDatasetView.tsx
// Componente principal de orquestación.
import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  HousingData,
  //HousingFilters
} from './types';
import HousingChart from './HousingChart';
import HousingTable from './HousingTable';
import HousingMapView from './HousingMapView';
import { 
  FaSpinner,
  FaChartBar, 
  FaMapMarkedAlt,
  FaDatabase,
} from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});


function HousingDatasetView() {
  console.log('🏠 HousingDatasetView INICIANDO');
  const [allData, setAllData] = useState<HousingData[]>([]);
  const [filteredData, setFilteredData] = useState<HousingData[]>([]);
  const [fullData, setFullData] = useState<HousingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map');
  
  // Filtros específicos de vivienda
  const [selectedMetric, setSelectedMetric] = useState<string>('indice');
  const [selectedHousingType, setSelectedHousingType] = useState<string>('general');
  const [selectedCCAA, setSelectedCCAA] = useState<string>('00'); // 00 = Nacional
  
  const [filters, setFilters] = useState({
    anio_desde: 2020,
    anio_hasta: 2025,
    trimestre: 0, // 0 = todos los trimestres
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Métricas disponibles
  const metrics = [
    { value: 'indice', label: 'Índice', description: 'Precio base 2015=100', color: '#3498db' },
    { value: 'var_anual', label: 'Var. Anual', description: 'Variación anual %', color: '#e74c3c' },
    { value: 'var_trimestral', label: 'Var. Trimestral', description: 'Variación trimestral %', color: '#2ecc71' },
    { value: 'var_ytd', label: 'Var. YTD', description: 'Variación año actual %', color: '#e67e22' }
  ];

  // Tipos de vivienda
  const housingTypes = [
    { value: 'general', label: 'General', description: 'Precio general vivienda', color: '#3498db' },
    { value: 'nueva', label: 'Vivienda Nueva', description: 'Vivienda de nueva construcción', color: '#9b59b6' },
    { value: 'segunda_mano', label: 'Segunda Mano', description: 'Vivienda de segunda mano', color: '#1abc9c' }
  ];

  // CCAA disponibles (añadir "Nacional" como opción)
  const ccaaOptions = [
    { value: '00', label: 'Nacional', description: 'Total España' },
    { value: '01', label: 'Andalucía' },
    { value: '02', label: 'Aragón' },
    { value: '03', label: 'Asturias' },
    { value: '04', label: 'Baleares' },
    { value: '05', label: 'Canarias' },
    { value: '06', label: 'Cantabria' },
    { value: '07', label: 'Castilla y León' },
    { value: '08', label: 'Castilla-La Mancha' },
    { value: '09', label: 'Cataluña' },
    { value: '10', label: 'Comunidad Valenciana' },
    { value: '11', label: 'Extremadura' },
    { value: '12', label: 'Galicia' },
    { value: '13', label: 'Madrid' },
    { value: '14', label: 'Murcia' },
    { value: '15', label: 'Navarra' },
    { value: '16', label: 'País Vasco' },
    { value: '17', label: 'La Rioja' },
    { value: '18', label: 'Ceuta' },
    { value: '19', label: 'Melilla' }
  ];

  // Función para filtrar datos por métrica, tipo y CCAA
  const filterData = useCallback((data: HousingData[], metric: string, housingType: string, ccaa: string) => {
  console.log('🔍 Filtrando vivienda:', data.length, 'registros');
  console.log('   Filtros:', { metric, housingType, ccaa });
  
  let filtered = data;
  
  // Filtrar por CCAA
  if (ccaa !== '00') {
    // CCAA específica: mostrar solo esa CCAA
    filtered = filtered.filter(item => item.ccaa_codigo === ccaa);
  } else {
    // Nacional: NO filtrar por CCAA - mostrar todo (incluye 00, 01, 02...)
    // No aplicar filtro de CCAA
  }
  
  console.log(`   → Después CCAA: ${filtered.length} registros`);
  
  return filtered;
}, []);

  // Cambiar métrica
  const handleMetricChange = async (metric: string) => {
    console.log('🔄 Cambiando métrica a:', metric);
    setSelectedMetric(metric);
    await reloadData(metric, selectedHousingType, selectedCCAA);
  };

  // Cambiar tipo vivienda
  const handleHousingTypeChange = async (housingType: string) => {
    console.log('🔄 Cambiando tipo vivienda a:', housingType);
    setSelectedHousingType(housingType);
    await reloadData(selectedMetric, housingType, selectedCCAA);
  };

  // Cambiar CCAA
  const handleCCAAChange = async (ccaa: string) => {
    console.log('🔄 Cambiando CCAA a:', ccaa);
    setSelectedCCAA(ccaa);
    await reloadData(selectedMetric, selectedHousingType, ccaa);
  };

  // Recargar datos con nuevos filtros
  const reloadData = async (metric: string, housingType: string, ccaa: string) => {
    setIsFiltering(true);
    
    try {
      const params = new URLSearchParams();
      params.append('metric', metric);
      params.append('housing_type', housingType);
      if (ccaa !== '00') params.append('ccaa', ccaa);
      params.append('anio_desde', '2020');
      params.append('anio_hasta', '2025');
      if (filters.trimestre > 0) params.append('trimestre', filters.trimestre.toString());
      params.append('limit', '1000');
      
      const response = await api.get(`/api/housing/data?${params}`);
      
      if (response.data.success) {
        setAllData(response.data.data);
        setFilteredData(response.data.data); // Ya vienen filtrados del backend
      }
      
    } catch (error) {
      console.error('Error recargando datos:', error);
    } finally {
      setIsFiltering(false);
    }
  };

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

        // Cargar datos iniciales (nacional, índice, general)
        const params = new URLSearchParams();
        params.append('metric', 'indice');
        params.append('housing_type', 'general');
        params.append('anio_desde', '2020');
        params.append('limit', '1000');
        
        const response = await api.get(`/api/housing/data?${params}`, {
          signal: abortControllerRef.current.signal
        });

        if (!isMounted) return;

        if (response.data.success) {
          console.log(`✅ Datos vivienda cargados: ${response.data.data.length} registros`);
          console.log('📊 Ejemplo:', response.data.data[0]);
          
          setAllData(response.data.data);
          setFilteredData(response.data.data);
        }

      } catch (error: any) {
        if (error.name !== 'AbortError' && isMounted) {
          console.error('Error cargando datos vivienda:', error);
          alert('Error cargando datos de precios de vivienda');
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

  // ============ EFECTO PARA FILTRAR CUANDO CAMBIAN LOS FILTROS ============
  useEffect(() => {
    if (allData.length === 0) return;
    
    console.log('🔄 Re-filtrando por cambios en filtros...');
    
    const filtered = filterData(allData, selectedMetric, selectedHousingType, selectedCCAA);
    console.log(`✅ Filtrado completado: ${filtered.length} registros`);
    
    setFilteredData(filtered);
    
  }, [selectedMetric, selectedHousingType, selectedCCAA, allData, filterData]);

  // ============ AUTO-FILTRO PARA PESTAÑA "DATA" ============
  useEffect(() => {
    if (activeTab !== 'data' || allData.length === 0) return;
    
    console.log('🔄 Auto-filtrando en pestaña datos...', filters);
    
    const applyAutoFilters = () => {
      let result = [...allData];
      
      // Filtrar por año
      result = result.filter(item => 
        item.anio >= filters.anio_desde && 
        item.anio <= filters.anio_hasta
      );
      
      // Filtrar por trimestre (si no es 0 = todos)
      if (filters.trimestre > 0) {
        result = result.filter(item => item.trimestre === filters.trimestre);
      }
      
      console.log(`✅ Auto-filtrado: ${result.length} registros`);
      setFilteredData(result);
    };
    
    const timeoutId = setTimeout(applyAutoFilters, 300);
    return () => clearTimeout(timeoutId);
    
  }, [activeTab, filters, allData]);

  // ============ APLICAR FILTROS (MANUAL - para pestaña mapa) ============
  const applyFilters = useCallback(() => {
    setIsFiltering(true);
    
    setTimeout(() => {
      try {
        let filtered = [...filteredData];
        
        // Aplicar filtros temporales
        filtered = filtered.filter(item => 
          item.anio >= filters.anio_desde && 
          item.anio <= filters.anio_hasta
        );
        
        if (filters.trimestre > 0) {
          filtered = filtered.filter(item => item.trimestre === filters.trimestre);
        }
        
        setFilteredData(filtered);
        console.log(`Filtros manuales aplicados: ${filtered.length} registros`);
        
      } catch (error) {
        console.error('Error aplicando filtros:', error);
      } finally {
        setIsFiltering(false);
      }
    }, 100);
  }, [filteredData, filters]);

  // ============ CARGAR DATOS COMPLETOS (PARA GRÁFICOS) ============
  const loadFullData = useCallback(async () => {
    if (fullData.length > 0) return;

    try {
      setIsFiltering(true);

      const params = new URLSearchParams();
      params.append('metric', selectedMetric);
      params.append('housing_type', selectedHousingType);
      params.append('anio_desde', '2010'); // Más histórico para gráficos
      params.append('limit', '5000');
      
      const response = await api.get(`/api/housing/data?${params}`);

      if (response.data.success) {
        setFullData(response.data.data);
        console.log(`✅ Datos completos para gráficos: ${response.data.data.length}`);
      }

    } catch (error) {
      console.error('Error cargando datos completos:', error);
    } finally {
      setIsFiltering(false);
    }
  }, [fullData.length, selectedMetric, selectedHousingType]);

  useEffect(() => {
    if (activeTab === 'chart' && fullData.length === 0) {
      loadFullData();
    }
  }, [activeTab, fullData.length, loadFullData]);

  // ============ FUNCIÓN PARA EXPORTAR DATOS ============
  const handleExportData = () => {
    if (filteredData.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    
    const dataToExport = filteredData.map(item => ({
      Periodo: item.periodo,
      Año: item.anio,
      Trimestre: item.trimestre,
      CCAA: item.ccaa_nombre,
      'Código CCAA': item.ccaa_codigo,
      'Tipo Vivienda': item.tipo_vivienda,
      Métrica: item.metrica,
      Valor: item.valor
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
    link.setAttribute('download', `precios-vivienda_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📊 Exportados ${filteredData.length} registros`);
  };

  // ============ LIMPIAR FILTROS ============
  const clearFilters = () => {
    setFilters({
      anio_desde: 2020,
      anio_hasta: 2025,
      trimestre: 0,
    });
    
    setSelectedMetric('indice');
    setSelectedHousingType('general');
    setSelectedCCAA('00');
    
    if (activeTab === 'map') {
      applyFilters();
    } else if (activeTab === 'data') {
      setFilteredData(allData);
    }
    
    console.log('✅ Todos los filtros limpiados');
  };

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

      {activeTab === 'map' && (
        <HousingMapView
          allData={allData}
          filteredData={filteredData}
          filters={filters}
          selectedMetric={selectedMetric}
          selectedHousingType={selectedHousingType}
          selectedCCAA={selectedCCAA}
          metrics={metrics}
          housingTypes={housingTypes}
          ccaaOptions={ccaaOptions}
          isFiltering={isFiltering}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
          onApplyFilters={applyFilters}
          onMetricChange={handleMetricChange}
          onHousingTypeChange={handleHousingTypeChange}
          onCCAAChange={handleCCAAChange}
        />
      )}

      {activeTab === 'chart' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">📈 Análisis de Precios de Vivienda</h2>
            {isFiltering ? (
              <div className="text-center py-5">
                <FaSpinner className="fa-spin text-primary" size={48} />
                <p className="mt-3">Cargando datos completos...</p>
              </div>
            ) : (
              <HousingChart 
                data={fullData}
                metric={selectedMetric}
                housingType={selectedHousingType}
                ccaa={selectedCCAA}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <HousingTable
          data={filteredData}
          selectedMetric={selectedMetric}
          selectedHousingType={selectedHousingType}
          selectedCCAA={selectedCCAA}
          metrics={metrics}
          housingTypes={housingTypes}
          ccaaOptions={ccaaOptions}
          onFilterChange={(newFilters) => {
            setFilters(prev => ({ 
              ...prev, 
              anio_desde: newFilters.anio_desde || 2020,
              anio_hasta: newFilters.anio_hasta || 2025,
              trimestre: newFilters.trimestre || 0
            }));
          }}
          onClearFilters={clearFilters}
          onExport={handleExportData}
        />
      )}
      </div>



      
    </>

      

  );



  
}

export default HousingDatasetView;