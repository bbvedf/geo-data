// frontend/src/components/HousingMapView.tsx
// Pestaña "map"
import React from 'react';
import {
  FaTrashAlt,
  FaSpinner,
  FaChartLine,
  FaHome,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaBuilding,
  FaArrowsAltH,
  FaArrowRight,
  FaMapMarkedAlt,
  FaFilter, // ✅ AÑADIDO: Import del icono que faltaba
} from 'react-icons/fa';
import VanillaMap from './VanillaMap';
import { HousingData, CCAAValue } from './types';

interface Props {
  allData: HousingData[];
  filteredData: HousingData[];
  filters: {
    anio_desde: number;
    anio_hasta: number;
    trimestre: number;
  };
  selectedMetric: string;
  selectedHousingType: string;
  selectedCCAA: string;
  metrics: Array<{ value: string; label: string; description: string; color: string }>;
  housingTypes: Array<{ value: string; label: string; description: string; color: string }>;
  ccaaOptions: Array<{ value: string; label: string; description?: string }>;
  isFiltering: boolean;
  onFilterChange: (filters: { anio_desde?: number; anio_hasta?: number; trimestre?: number }) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void; // ✅ AÑADIDO: Esta prop faltaba
  onMetricChange: (metric: string) => void;
  onHousingTypeChange: (housingType: string) => void;
  onCCAAChange: (ccaa: string) => void;
}

const HousingMapView: React.FC<Props> = ({
  allData,
  filteredData,
  filters,
  selectedMetric,
  selectedHousingType,
  selectedCCAA,
  metrics,
  housingTypes,
  ccaaOptions,
  isFiltering,
  onFilterChange,
  onClearFilters,
  onApplyFilters, // ✅ AÑADIDO: Recibir la prop
  onMetricChange,
  onHousingTypeChange,
  onCCAAChange,
}) => {
  const calculateCCAAData = (): CCAAValue[] => {
    const ccaaMap = new Map<string, CCAAValue>();

    filteredData.forEach((item) => {
      if (!item.ccaa_codigo || item.ccaa_codigo === '00') return;

      const existing = ccaaMap.get(item.ccaa_codigo);
      if (!existing || item.periodo > existing.periodo) {
        ccaaMap.set(item.ccaa_codigo, {
          ccaa_codigo: item.ccaa_codigo,
          ccaa_nombre: item.ccaa_nombre,
          valor: item.valor || 0,
          periodo: item.periodo,
        });
      }
    });

    return Array.from(ccaaMap.values());
  };

  const ccaaValues = calculateCCAAData();
  const valoresCCAA = ccaaValues.map((v) => v.valor).filter((v) => v !== null);
  const valorMin = valoresCCAA.length > 0 ? Math.min(...valoresCCAA) : 0;
  const valorMax = valoresCCAA.length > 0 ? Math.max(...valoresCCAA) : 100;

  const hasActiveFilters =
    filters.anio_desde > 2010 ||
    filters.anio_hasta < 2025 ||
    filters.trimestre > 0 ||
    selectedMetric !== 'indice' ||
    selectedHousingType !== 'general' ||
    selectedCCAA !== '00';

  return (
    <div className="card shadow">
      <div className="card-body">
        <h2 className="card-title mb-4">🗺️ Precios de Vivienda en España</h2>

        {/* Rango de valores mejorado */}
        {allData.length > 0 && (
          <div className="row mb-4">
            {/* Tarjeta 1: Rango visual con barra */}
            <div className="col-md-5">
              <div className="card border-primary h-100" style={{
                border: '2px solid var(--bs-primary)',
                //borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div className="card-body">
                  <h6 className="card-title text-primary">
                    <FaArrowsAltH className="me-2" /> Distribución por CCAA
                  </h6>                  
                  <div className="d-flex justify-content-between mb-3">
                    <div className="text-center">
                      <div className="display-6 text-primary">{valorMin.toFixed(1)}</div>
                      <small className="text-muted">Mínimo</small>
                      <div className="small">
                        {ccaaValues.find(v => v.valor === valorMin)?.ccaa_nombre || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="d-flex align-items-center">
                      <FaArrowRight className="text-muted mx-3" size={24} />
                    </div>
                    
                    <div className="text-center">
                      <div className="display-6 text-primary">{valorMax.toFixed(1)}</div>
                      <small className="text-muted">Máximo</small>
                      <div className="small">
                        {ccaaValues.find(v => v.valor === valorMax)?.ccaa_nombre || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Barra de rango */}
                  <div className="mt-3">
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Más bajo</span>
                      <span>Diferencia: {(valorMax - valorMin).toFixed(1)}</span>
                      <span>Más alto</span>
                    </div>
                    <div className="progress" style={{height: '10px'}}>
                      <div 
                        className="progress-bar bg-primary" 
                        style={{width: '100%'}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>                
            {/* Tarjeta 2: Contexto del mapa */}
            <div className="col-md-7">                
              <div className="card border-primary h-100" style={{
                border: '2px solid var(--bs-primary)',
                //borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div className="card-body">
                  <h6 className="card-title text-primary">
                    <FaMapMarkedAlt className="me-2" /> Vista del Mapa
                  </h6>
                  
                  <div className="row">
                    <div className="col-6">
                      <div className="mb-3">
                        <div className="small text-muted">Métrica mostrada</div>
                        <div className="h5">
                          {metrics.find(m => m.value === selectedMetric)?.label}
                        </div>
                        <div className="small text-muted">
                          {selectedMetric === 'indice' ? 'Base 2015=100' : 
                          selectedMetric.includes('var') ? 'Variación porcentual' : 'Valor absoluto'}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="small text-muted">Tipo de vivienda</div>
                        <div className="h5">
                          {housingTypes.find(t => t.value === selectedHousingType)?.label}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-6">
                      <div className="mb-3">
                        <div className="small text-muted">Área geográfica</div>
                        <div className="h5">
                          {selectedCCAA === '00' 
                            ? 'Toda España' 
                            : ccaaOptions.find(c => c.value === selectedCCAA)?.label}
                        </div>
                        <div className="small text-muted">
                          {selectedCCAA === '00' 
                            ? `${ccaaValues.length} CCAA representadas` 
                            : 'CCAA específica'}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="small text-muted">Periodo más reciente</div>
                        <div className="h5">
                          {allData[0]?.periodo || 'N/A'}
                        </div>
                        <div className="small text-muted">
                          {filteredData.length} registros visibles
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pequeña leyenda de colores */}
                  <div className="mt-3 pt-3 border-top">
                    <div className="small text-muted mb-1">Leyenda de colores:</div>
                    <div className="d-flex gap-2">
                      {selectedMetric === 'indice' ? (
                        <>
                          <span className="badge" style={{backgroundColor: '#a8d5e2'}}>Bajo</span>
                          <span className="badge" style={{backgroundColor: '#4d9db3'}}>Medio</span>
                          <span className="badge" style={{backgroundColor: '#075675'}}>Alto</span>
                        </>
                      ) : (
                        <>
                          <span className="badge" style={{backgroundColor: '#d7191c'}}>Bajada</span>
                          <span className="badge" style={{backgroundColor: '#ffffbf'}}>Estable</span>
                          <span className="badge" style={{backgroundColor: '#1a9641'}}>Subida</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="card border-primary mb-4" style={{
          border: '2px solid var(--bs-primary)',
          //borderRadius: '12px',
          overflow: 'hidden'
          }}>
          <div className="card-header bg-light">
            <h3 className="h5 mb-0">
              <FaHome className="me-2" /> Configuración del Mapa
            </h3>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">
                  <FaChartLine className="me-1" /> Métrica
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {metrics.map((metric) => (
                    <button
                      key={metric.value}
                      className={`btn ${
                        selectedMetric === metric.value ? 'btn-primary' : 'btn-outline-secondary'
                      }`}
                      onClick={() => onMetricChange(metric.value)}
                      disabled={isFiltering}
                      title={metric.description}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label">
                  <FaBuilding className="me-1" /> Tipo de Vivienda
                </label>
                <div className="d-flex flex-wrap gap-2">
                  {housingTypes.map((type) => (
                    <button
                      key={type.value}
                      className={`btn ${
                        selectedHousingType === type.value ? 'btn-primary' : 'btn-outline-secondary'
                      }`}
                      onClick={() => onHousingTypeChange(type.value)}
                      disabled={isFiltering}
                      title={type.description}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-md-4">
                <label className="form-label">
                  <FaMapMarkerAlt className="me-1" /> Área Geográfica
                </label>
                <select
                  className="form-select"
                  value={selectedCCAA}
                  onChange={(e) => onCCAAChange(e.target.value)}
                  disabled={isFiltering}
                >
                  {ccaaOptions.map((ccaa) => (
                    <option key={ccaa.value} value={ccaa.value}>
                      {ccaa.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-primary mb-4" style={{
          border: '2px solid var(--bs-primary)',
          //borderRadius: '12px',
          overflow: 'hidden'
          }}>
          <div className="card-header bg-light">
            <h3 className="h5 mb-0">
              <FaCalendarAlt className="me-2" /> Filtros Temporales
              {isFiltering && <FaSpinner className="ms-2 fa-spin" />}
            </h3>
          </div>
          <div className="card-body">
            {/* ✅ CORREGIDO: Filtros activos completos */}
            {hasActiveFilters && (
              <div className="alert alert-info mb-3">
                <strong>⚡ Filtros activos:</strong>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {selectedMetric !== 'indice' && (
                    <span className="badge bg-info">
                      Métrica: {metrics.find(m => m.value === selectedMetric)?.label}
                    </span>
                  )}
                  {selectedHousingType !== 'general' && (
                    <span className="badge bg-info">
                      Tipo: {housingTypes.find(t => t.value === selectedHousingType)?.label}
                    </span>
                  )}
                  {selectedCCAA !== '00' && (
                    <span className="badge bg-info">
                      CCAA: {ccaaOptions.find(c => c.value === selectedCCAA)?.label}
                    </span>
                  )}
                  {filters.anio_desde > 2010 && (
                    <span className="badge bg-info">Desde: {filters.anio_desde}</span>
                  )}
                  {filters.anio_hasta < 2025 && (
                    <span className="badge bg-info">Hasta: {filters.anio_hasta}</span>
                  )}
                  {filters.trimestre > 0 && (
                    <span className="badge bg-info">Trimestre: {filters.trimestre}</span>
                  )}
                </div>
              </div>
            )}

            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">
                  Año desde: <span className="badge bg-info">{filters.anio_desde}</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="2007"
                  max="2025"
                  step="1"
                  value={filters.anio_desde}
                  onChange={(e) =>
                    onFilterChange({ ...filters, anio_desde: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">
                  Año hasta: <span className="badge bg-info">{filters.anio_hasta}</span>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="2007"
                  max="2025"
                  step="1"
                  value={filters.anio_hasta}
                  onChange={(e) =>
                    onFilterChange({ ...filters, anio_hasta: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Trimestre</label>
                <select
                  className="form-select"
                  value={filters.trimestre}
                  onChange={(e) => onFilterChange({ ...filters, trimestre: parseInt(e.target.value) })}
                >
                  <option value="0">Todos los trimestres</option>
                  <option value="1">1º Trimestre (Q1)</option>
                  <option value="2">2º Trimestre (Q2)</option>
                  <option value="3">3º Trimestre (Q3)</option>
                  <option value="4">4º Trimestre (Q4)</option>
                </select>
              </div>

              {/* ✅ CORREGIDO: Añadir botón "Aplicar Filtros" */}
              <div className="col-12 d-flex gap-2 justify-content-end">
                <button
                  className="btn btn-danger"
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
                  title="Limpiar todos los filtros"
                >
                  <FaTrashAlt className="me-2" />
                </button>
                
                <button
                  className="btn btn-primary"
                  onClick={onApplyFilters}
                  disabled={isFiltering}
                >
                  <FaFilter className="me-2" />
                  Aplicar Filtros
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-top">
              <span className="text-muted">
                📊 Mostrando datos de <strong>{filteredData.length}</strong> registros
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <VanillaMap
            data={filteredData}
            height="600px"
            type="housing"
            selectedMetric={selectedMetric}
            selectedHousingType={selectedHousingType}
            selectedCCAA={selectedCCAA === '00' ? null : selectedCCAA}
            key={`housing-${selectedMetric}-${selectedHousingType}-${selectedCCAA}`}
          />
        </div>

        <div
          className="p-3 rounded border"
          style={{
            backgroundColor: 'var(--color-card-bg)',
            color: 'var(--color-text)',
          }}
        >
          <div className="row">
            <div className="col-md-8">
              <div className="fw-medium mb-2">🎨 Leyenda del Mapa:</div>

              {selectedMetric === 'indice' ? (
                <div className="row g-2">
                  <div className="col-12">
                    <small className="text-muted">Índice de Precios (base 2015=100)</small>
                  </div>
                  <div className="col-12">
                    <div className="d-flex align-items-center">
                      <div className="grow">
                        <div className="d-flex justify-content-between small mb-1">
                          <span>Más barato</span>
                          <span>Más caro</span>
                        </div>
                        <div
                          className="gradient-bar"
                          style={{
                            height: '20px',
                            background:
                              'linear-gradient(90deg, #a8d5e2, #73b3c2, #4d9db3, #2e8ba3, #1a7994, #0d6785, #075675)',
                            borderRadius: '4px',
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="row g-2">
                  <div className="col-12">
                    <small className="text-muted">
                      {selectedMetric === 'var_anual'
                        ? 'Variación Anual (%)'
                        : selectedMetric === 'var_trimestral'
                        ? 'Variación Trimestral (%)'
                        : 'Variación YTD (%)'}
                    </small>
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between small gap-1">
                      <div className="d-flex align-items-center">
                        <div
                          className="color-square me-1"
                          style={{ backgroundColor: '#d7191c' }}
                        ></div>
                        <span>Bajada</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div
                          className="color-square me-1"
                          style={{ backgroundColor: '#fdae61' }}
                        ></div>
                        <span>Moderada</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div
                          className="color-square me-1"
                          style={{ backgroundColor: '#ffffbf' }}
                        ></div>
                        <span>Estable</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div
                          className="color-square me-1"
                          style={{ backgroundColor: '#a6d96a' }}
                        ></div>
                        <span>Moderada</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div
                          className="color-square me-1"
                          style={{ backgroundColor: '#1a9641' }}
                        ></div>
                        <span>Subida</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <style>{`
                .color-square {
                  width: 16px;
                  height: 16px;
                  border: 1px solid #666;
                  border-radius: 3px;
                }
                .gradient-bar {
                  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
                }
              `}</style>
            </div>
            <div className="col-md-4 text-md-end small text-muted">
              <div>Fuente: INE - Instituto Nacional de Estadística</div>
              <div>Última actualización: {allData.length > 0 ? allData[0].periodo : 'N/A'}</div>
              <div className="mt-1">
                <FaMapMarkerAlt className="me-1" /> {ccaaValues.length} CCAA con datos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HousingMapView;