// frontend/src/components/HousingTable.tsx
// Pestaña "data"
import React, { useState } from 'react';
import {
  FaTimes,
  FaDownload,
  FaCalendarAlt,
  FaBuilding,
  FaChartLine,
  FaCity,
} from 'react-icons/fa';
import { HousingData } from './types';

interface Props {
  data: HousingData[];
  selectedMetric: string;
  selectedHousingType: string;
  selectedCCAA: string;
  filters: {
    anio_desde: number;
    anio_hasta: number;
    trimestre: number;
  };
  metrics: Array<{ value: string; label: string; description?: string }>;
  housingTypes: Array<{ value: string; label: string; description?: string }>;
  ccaaOptions: Array<{ value: string; label: string }>;
  isFiltering: boolean;
  onFilterChange: (filters: { anio_desde?: number; anio_hasta?: number; trimestre?: number }) => void;
  onMetricChange: (metric: string) => void;
  onHousingTypeChange: (housingType: string) => void;
  onCCAAChange: (ccaa: string) => void;
  onClearFilters: () => void;
  onExport?: (data: HousingData[]) => void;
}

const HousingTable: React.FC<Props> = ({
  data,
  selectedMetric,
  selectedHousingType,
  selectedCCAA,
  filters,
  metrics,
  housingTypes,
  ccaaOptions,
  isFiltering,
  onFilterChange,
  onMetricChange,
  onHousingTypeChange,
  onCCAAChange,
  onClearFilters,
  onExport,
}) => {
  const [visibleCount, setVisibleCount] = useState(50);

  const getMetricLabel = () => metrics.find((m) => m.value === selectedMetric)?.label || selectedMetric;
  const getHousingTypeLabel = () =>
    housingTypes.find((t) => t.value === selectedHousingType)?.label || selectedHousingType;
  const getCCAALabel = () => ccaaOptions.find((c) => c.value === selectedCCAA)?.label || selectedCCAA;

  const handleExport = () => {
    if (onExport) {
      onExport(data);
    }
  };

  return (
    <div className="card shadow">
      <div className="card-body">
        <h2 className="card-title mb-4">📋 Datos de Precios de Vivienda</h2>

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
              {data.length > 0 ? `${data[0].periodo} - ${data[data.length - 1].periodo}` : 'Sin datos'}
            </span>
          </div>
        </div>

        <div className="card border-primary mb-4 bg-body">
          <div className="card-header bg-light">
            <h5 className="h5 mb-0">⚙️ Filtros de Datos (Independientes)</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Métrica</label>
                <select
                  className="form-select"
                  value={selectedMetric}
                  onChange={(e) => onMetricChange(e.target.value)}
                  disabled={isFiltering}
                >
                  {metrics.map((m) => (
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
                  value={selectedHousingType}
                  onChange={(e) => onHousingTypeChange(e.target.value)}
                  disabled={isFiltering}
                >
                  {housingTypes.map((t) => (
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
                  value={selectedCCAA}
                  onChange={(e) => onCCAAChange(e.target.value)}
                  disabled={isFiltering}
                >
                  {ccaaOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">
                  Año desde: <strong>{filters.anio_desde}</strong>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="2007"
                  max="2025"
                  value={filters.anio_desde}
                  onChange={(e) =>
                    onFilterChange({ ...filters, anio_desde: parseInt(e.target.value) })
                  }
                  disabled={isFiltering}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">
                  Año hasta: <strong>{filters.anio_hasta}</strong>
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="2007"
                  max="2025"
                  value={filters.anio_hasta}
                  onChange={(e) =>
                    onFilterChange({ ...filters, anio_hasta: parseInt(e.target.value) })
                  }
                  disabled={isFiltering}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Trimestre</label>
                <select
                  className="form-select"
                  value={filters.trimestre}
                  onChange={(e) =>
                    onFilterChange({ ...filters, trimestre: parseInt(e.target.value) })
                  }
                  disabled={isFiltering}
                >
                  <option value="0">Todos</option>
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </div>

              <div className="col-md-3 d-flex align-items-end gap-2">
                <button
                  className="btn btn-danger flex-grow-1"
                  onClick={onClearFilters}
                  disabled={isFiltering}
                >
                  🗑️ Limpiar
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-top">
              <small className="text-muted">
                📊 Datos cargados: <strong>{data.length}</strong> registros
              </small>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-between mb-3 align-items-center">
          <p className="text-muted mb-0">
            Mostrando {Math.min(visibleCount, data.length)} de {data.length} registros
          </p>
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-success"
              onClick={handleExport}
              disabled={data.length === 0}
            >
              <FaDownload className="me-1" />
              Exportar CSV ({data.length})
            </button>
          </div>
        </div>

        <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table className="table table-hover table-sm">
            <thead className="table-light">
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
              {data.slice(0, visibleCount).map((item, index) => {
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
                        <span className={item.ccaa_codigo === '00' ? 'fw-bold' : ''}>{ccaaLabel}</span>
                      </div>
                    </td>
                    <td>
                      <small
                        className={
                          item.tipo_vivienda === 'General'
                            ? 'text-primary'
                            : item.tipo_vivienda === 'Vivienda nueva'
                            ? 'text-success'
                            : 'text-warning'
                        }
                      >
                        {item.tipo_vivienda === 'Vivienda segunda mano' ? '2ª Mano' : item.tipo_vivienda}
                      </small>
                    </td>
                    <td>
                      <small
                        className={
                          item.metrica === 'Índice'
                            ? 'text-info'
                            : item.metrica.includes('Variación')
                            ? 'text-danger'
                            : 'text-muted'
                        }
                      >
                        {item.metrica.includes('Variación')
                          ? item.metrica.replace('Variación ', 'Var. ')
                          : item.metrica}
                      </small>
                    </td>
                    <td className="text-end">
                      {valor !== null && valor !== undefined ? (
                        <span
                          className={
                            isPositive
                              ? 'text-success fw-bold'
                              : isNegative
                              ? 'text-danger fw-bold'
                              : 'text-muted'
                          }
                        >
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

        {data.length > 50 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">Mostrando {Math.min(visibleCount, data.length)} de {data.length}</small>
            <div className="d-flex gap-2">
              {data.length > visibleCount && (
                <button className="btn btn-sm btn-outline-primary" onClick={() => setVisibleCount((prev) => prev + 50)}>
                  Mostrar 50 más
                </button>
              )}
              {visibleCount > 50 && (
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setVisibleCount(50)}>
                  <FaTimes className="me-1" /> Reducir
                </button>
              )}
            </div>
          </div>
        )}

        {data.length === 0 && (
          <div className="text-center py-5">
            <p className="text-muted">No hay datos con estos filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HousingTable;