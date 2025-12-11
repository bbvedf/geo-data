// frontend/src/components/HousingTable.tsx
// Pestaña "data"
import React, { useState } from 'react';
import { 
  FaSearch, 
  FaFilter, 
  FaTimes, 
  FaDownload, 
  FaCalendarAlt,
  FaBuilding,
  FaChartLine,
  FaCity 
} from 'react-icons/fa';
import { HousingData } from './types';

interface Props {
  data: HousingData[];
  selectedMetric: string;
  selectedHousingType: string;
  selectedCCAA: string;
  metrics: Array<{value: string, label: string, description?: string}>;
  housingTypes: Array<{value: string, label: string, description?: string}>;
  ccaaOptions: Array<{value: string, label: string}>;
  onFilterChange: (filters: { 
    anio_desde?: number; 
    anio_hasta?: number; 
    trimestre?: number 
  }) => void;
  onClearFilters: () => void;
  onExport?: (data: HousingData[]) => void;
}

const HousingTable: React.FC<Props> = ({
  data,
  selectedMetric,
  selectedHousingType,
  selectedCCAA,
  metrics,
  housingTypes,
  ccaaOptions,
  onFilterChange,
  onClearFilters,
  onExport
}) => {
  const [localFilters, setLocalFilters] = useState({
    ccaa: '',
    tipo_vivienda: '',
    periodo: '',
    anio: '',
    trimestre: ''
  });
  
  const [visibleCount, setVisibleCount] = useState(50);

  // Filtros aplicados localmente
  const filteredData = data.filter(item => {
    if (localFilters.ccaa && item.ccaa_codigo !== localFilters.ccaa) return false;
    if (localFilters.tipo_vivienda && item.tipo_vivienda !== localFilters.tipo_vivienda) return false;
    if (localFilters.periodo && !item.periodo.includes(localFilters.periodo)) return false;
    if (localFilters.anio && item.anio.toString() !== localFilters.anio) return false;
    if (localFilters.trimestre && item.trimestre.toString() !== localFilters.trimestre) return false;
    return true;
  });

  const handleFilterChange = (filterName: keyof typeof localFilters, value: string) => {
    const updated = { ...localFilters, [filterName]: value };
    setLocalFilters(updated);
    
    // Auto-aplicar filtros para algunos campos
    if (filterName === 'anio' && value) {
      onFilterChange({ anio_desde: parseInt(value), anio_hasta: parseInt(value) });
    }
  };

  const clearAllFilters = () => {
    setLocalFilters({
      ccaa: '',
      tipo_vivienda: '',
      periodo: '',
      anio: '',
      trimestre: ''
    });
    onClearFilters();
  };

  const clearSingleFilter = (filterName: keyof typeof localFilters) => {
    setLocalFilters(prev => ({ ...prev, [filterName]: '' }));
    
    // Si era filtro de año, resetear filtros temporales
    if (filterName === 'anio') {
      onFilterChange({ anio_desde: 2020, anio_hasta: 2025 });
    }
  };
  
  // Función para exportar datos
  const exportData = (dataToExport: HousingData[]) => {
    const exportData = dataToExport.map(item => ({
      Periodo: item.periodo,
      Año: item.anio,
      Trimestre: item.trimestre,
      CCAA: item.ccaa_nombre,
      'Código CCAA': item.ccaa_codigo,
      'Tipo Vivienda': item.tipo_vivienda,
      Métrica: item.metrica,
      Valor: item.valor?.toFixed(2) || 'N/A',
      'Tipo Métrica': selectedMetric === 'indice' ? 'Índice' : 
                      selectedMetric === 'var_anual' ? 'Var. Anual' :
                      selectedMetric === 'var_trimestral' ? 'Var. Trimestral' : 'Var. YTD'
    }));
    
    // Convertir a CSV
    const headers = Object.keys(exportData[0]).join(',');
    const rows = exportData.map(row => 
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
    
    console.log(`📊 Exportados ${dataToExport.length} registros`);
  };

  // Obtener etiquetas para mostrar
  const getMetricLabel = () => metrics.find(m => m.value === selectedMetric)?.label || selectedMetric;
  const getHousingTypeLabel = () => housingTypes.find(t => t.value === selectedHousingType)?.label || selectedHousingType;
  const getCCAALabel = () => ccaaOptions.find(c => c.value === selectedCCAA)?.label || selectedCCAA;

  // Obtener años únicos para el selector
  const uniqueYears = Array.from(new Set(data.map(item => item.anio))).sort((a, b) => b - a);
  const uniqueTrimestres = Array.from(new Set(data.map(item => item.trimestre))).sort();
  const uniqueCCAAs = Array.from(new Set(data
    .map(item => ({ codigo: item.ccaa_codigo, nombre: item.ccaa_nombre }))
    .filter(item => item.codigo && item.codigo !== '00')
  ));
  const uniqueTipos = Array.from(new Set(data.map(item => item.tipo_vivienda)));

  return (
    <div className="card shadow">
      <div className="card-body">
        <h2 className="card-title mb-4">📋 Datos de Precios de Vivienda</h2>
        
        {/* RESUMEN DE CONFIGURACIÓN ACTUAL */}
        <div className="alert alert-info mb-3">
          <strong>⚙️ Configuración actual:</strong>
          <div className="d-flex flex-wrap gap-2 mt-2">
            <span className="badge bg-primary">
              <FaChartLine className="me-1" />
              {getMetricLabel()}
            </span>
            <span className="badge bg-success">
              <FaBuilding className="me-1" />
              {getHousingTypeLabel()}
            </span>
            <span className="badge bg-warning text-dark">
              <FaCity className="me-1" />
              {getCCAALabel()}
            </span>
            <span className="badge bg-secondary">
              <FaCalendarAlt className="me-1" />
              {data.length > 0 
                ? `${data[0].periodo} - ${data[data.length-1].periodo}`
                : 'Sin datos'
              }
            </span>
          </div>
        </div>
        
        {/* FILTROS RÁPIDOS - AUTO-APLICADOS */}
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <FaCity />
              </span>
              <select
                className="form-select"
                value={localFilters.ccaa}
                onChange={(e) => handleFilterChange('ccaa', e.target.value)}
              >
                <option value="">Todas las CCAA</option>
                {uniqueCCAAs.map(ccaa => (
                  <option key={ccaa.codigo} value={ccaa.codigo}>
                    {ccaa.nombre}
                  </option>
                ))}
              </select>
              {localFilters.ccaa && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => clearSingleFilter('ccaa')}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <FaBuilding />
              </span>
              <select
                className="form-select"
                value={localFilters.tipo_vivienda}
                onChange={(e) => handleFilterChange('tipo_vivienda', e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {uniqueTipos.map(tipo => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {localFilters.tipo_vivienda && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => clearSingleFilter('tipo_vivienda')}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text">
                <FaCalendarAlt />
              </span>
              <select
                className="form-select"
                value={localFilters.anio}
                onChange={(e) => handleFilterChange('anio', e.target.value)}
              >
                <option value="">Todos los años</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {localFilters.anio && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => clearSingleFilter('anio')}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* FILTROS SECUNDARIOS */}
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text">
                <FaSearch />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar periodo (ej: 2025T3)..."
                value={localFilters.periodo}
                onChange={(e) => handleFilterChange('periodo', e.target.value)}
              />
              {localFilters.periodo && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => clearSingleFilter('periodo')}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text">
                <FaFilter />
              </span>
              <select
                className="form-select"
                value={localFilters.trimestre}
                onChange={(e) => handleFilterChange('trimestre', e.target.value)}
              >
                <option value="">Todos los trimestres</option>
                {uniqueTrimestres.map(trim => (
                  <option key={trim} value={trim}>
                    {trim}º Trimestre
                  </option>
                ))}
              </select>
              {localFilters.trimestre && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => clearSingleFilter('trimestre')}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* RESUMEN DE FILTROS ACTIVOS */}
        {(localFilters.ccaa || localFilters.tipo_vivienda || localFilters.periodo || 
          localFilters.anio || localFilters.trimestre) && (
          <div className="alert alert-warning mb-3">
            <strong>🔍 Filtros aplicados:</strong>
            <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
              {localFilters.ccaa && (
                <span className="badge bg-info">
                  CCAA: {uniqueCCAAs.find(c => c.codigo === localFilters.ccaa)?.nombre || localFilters.ccaa}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => clearSingleFilter('ccaa')}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              {localFilters.tipo_vivienda && (
                <span className="badge bg-info">
                  Tipo: {localFilters.tipo_vivienda}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => clearSingleFilter('tipo_vivienda')}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              {localFilters.anio && (
                <span className="badge bg-info">
                  Año: {localFilters.anio}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => clearSingleFilter('anio')}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              {localFilters.trimestre && (
                <span className="badge bg-info">
                  Trimestre: {localFilters.trimestre}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => clearSingleFilter('trimestre')}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              {localFilters.periodo && (
                <span className="badge bg-info">
                  Periodo: {localFilters.periodo}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => clearSingleFilter('periodo')}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              <button 
                className="btn btn-sm btn-outline-warning"
                onClick={clearAllFilters}
              >
                <FaTimes className="me-1" />
                Limpiar todos los filtros
              </button>
            </div>
          </div>
        )}
        
        <div className="d-flex justify-content-between mb-3 align-items-center">
          <p className="text-muted mb-0">
            Mostrando {Math.min(visibleCount, filteredData.length)} de {filteredData.length} registros
            {selectedCCAA !== '00' && ` (${getCCAALabel()})`}
          </p>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => onExport ? onExport(filteredData) : exportData(filteredData)}
              disabled={filteredData.length === 0}
            >
              <FaDownload className="me-1" />
              Exportar CSV ({filteredData.length})
            </button>
          </div>
        </div>
        
        {/* TABLA DE DATOS */}
        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th>Periodo</th>
                <th>Año</th>
                <th>Trim.</th>
                <th>CCAA</th>
                <th>Tipo Vivienda</th>
                <th>Métrica</th>
                <th className="text-end">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, visibleCount).map((item, index) => {
                const ccaaLabel = item.ccaa_codigo === '00' ? 'Nacional' : item.ccaa_nombre;
                const valor = item.valor;
                const isIndex = item.metrica === 'Índice';
                const isPositive = valor && valor > (isIndex ? 100 : 0);
                const isNegative = valor && valor < (isIndex ? 100 : 0);
                
                return (
                  <tr key={index}>
                    <td className="fw-medium">
                      <span className="badge bg-secondary">{item.periodo}</span>
                    </td>
                    <td>
                      <small>{item.anio}</small>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark">T{item.trimestre}</span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        {item.ccaa_codigo !== '00' && (
                          <span className="badge bg-primary me-1">CCAA</span>
                        )}
                        <span className={item.ccaa_codigo === '00' ? 'fw-bold' : ''}>
                          {ccaaLabel}
                        </span>
                      </div>
                    </td>
                    <td>
                      <small className={
                        item.tipo_vivienda === 'General' ? 'text-primary' :
                        item.tipo_vivienda === 'Vivienda nueva' ? 'text-success' :
                        'text-warning'
                      }>
                        {item.tipo_vivienda === 'Vivienda segunda mano' ? '2ª Mano' : item.tipo_vivienda}
                      </small>
                    </td>
                    <td>
                      <small className={
                        item.metrica === 'Índice' ? 'text-info' :
                        item.metrica.includes('Variación') ? 'text-danger' : 'text-muted'
                      }>
                        {item.metrica.includes('Variación') 
                          ? item.metrica.replace('Variación ', 'Var. ')
                          : item.metrica
                        }
                      </small>
                    </td>
                    <td className="text-end">
                      {valor !== null && valor !== undefined ? (
                        <span className={
                          isPositive ? 'text-success fw-bold' :
                          isNegative ? 'text-danger fw-bold' : 'text-muted'
                        }>
                          {isIndex ? valor.toFixed(1) : `${valor.toFixed(1)}%`}
                          {isPositive && !isIndex && ' ↗'}
                          {isNegative && !isIndex && ' ↘'}
                        </span>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* PAGINACIÓN MEJORADA */}
        {filteredData.length > 50 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">
              📋 Mostrando {Math.min(visibleCount, filteredData.length)} de {filteredData.length} registros
            </small>
            
            <div className="d-flex gap-2">
              {filteredData.length > visibleCount && (
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setVisibleCount(prev => prev + 50)}
                >
                  Mostrar 50 más
                </button>
              )}
              {visibleCount > 50 && (
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setVisibleCount(50)}
                >
                  <FaTimes className="me-1" /> Reducir
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* INFORMACIÓN ADICIONAL */}
        {filteredData.length === 0 && (
          <div className="text-center py-4">
            <p className="text-muted">No hay datos que coincidan con los filtros aplicados.</p>
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={clearAllFilters}
            >
              <FaTimes className="me-1" />
              Limpiar todos los filtros
            </button>
          </div>
        )}
        
        {/* FOOTER INFORMATIVO */}
        <div className="mt-3 pt-3 border-top small text-muted">
          <div className="row">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-1">
                <div className="color-indicator me-2" style={{backgroundColor: '#0d6efd'}}></div>
                <span>Nacional</span>
              </div>
              <div className="d-flex align-items-center mb-1">
                <div className="color-indicator me-2" style={{backgroundColor: '#198754'}}></div>
                <span>Vivienda nueva</span>
              </div>
              <div className="d-flex align-items-center">
                <div className="color-indicator me-2" style={{backgroundColor: '#ffc107'}}></div>
                <span>Segunda mano</span>
              </div>
            </div>
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-1">
                <span className="text-success me-2">↗</span>
                <span>Valores positivos/altos</span>
              </div>
              <div className="d-flex align-items-center">
                <span className="text-danger me-2">↘</span>
                <span>Valores negativos/bajos</span>
              </div>
            </div>
          </div>
          <style>{`
            .color-indicator {
              width: 12px;
              height: 12px;
              border-radius: 2px;
              border: 1px solid rgba(0,0,0,0.1);
            }
          `}</style>
        </div>
      </div>
    </div>
  );
};

export default HousingTable;