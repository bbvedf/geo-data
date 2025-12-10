// frontend/src/components/AirQualityMapView.tsx
// Pestaña "map"
import React from 'react';
import { 
  FaFilter, 
  FaTrashAlt, 
  FaSpinner,
  FaSmog,
  FaCity,
  FaLeaf,
  FaExclamationTriangle,
} from 'react-icons/fa';
import VanillaMap from './VanillaMap';
import { AirQualityStationLight, AirQualityStats } from './types';


interface Props {
  allStations: AirQualityStationLight[];
  filteredStations: AirQualityStationLight[];
  stats: AirQualityStats | null;
  filters: {
    ciudad: string;
    min_aqi: number;
    max_aqi: number;
    calidad: string;
  };
  selectedPollutant: string;
  pollutants: Array<{value: string, label: string, description: string, color: string}>;
  aqiLevels: Array<{value: number, label: string, color: string}>;
  isFiltering: boolean;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  onPollutantChange: (pollutant: string) => void;
}

const AirQualityMapView: React.FC<Props> = ({
  allStations,
  filteredStations,
  stats,
  filters,
  selectedPollutant,
  pollutants,
  aqiLevels,
  isFiltering,
  onFilterChange,
  onClearFilters,
  onApplyFilters,
  onPollutantChange
}) => {
  const hasActiveFilters = 
    filters.ciudad !== '' || 
    filters.min_aqi > 1 || 
    filters.max_aqi < 5 ||
    filters.calidad !== 'todas' ||
    selectedPollutant !== 'ALL';

  return (
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
                  onClick={() => onPollutantChange(pollutant.value)}
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
                  onChange={(e) => onFilterChange({...filters, ciudad: e.target.value})}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">
                  <FaLeaf className="me-1" /> Nivel de Calidad
                </label>
                <select
                  className="form-select"
                  value={filters.calidad}
                  onChange={(e) => onFilterChange({...filters, calidad: e.target.value})}
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
                    onChange={(e) => onFilterChange({...filters, min_aqi: parseInt(e.target.value)})}
                  />
                  <input
                    type="range"
                    className="form-range"
                    min="1"
                    max="5"
                    value={filters.max_aqi}
                    onChange={(e) => onFilterChange({...filters, max_aqi: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="col-12 d-flex gap-2 justify-content-end">
                <button
                  className="btn btn-danger"
                  onClick={onClearFilters}
                  disabled={!hasActiveFilters}
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
  );
};

export default AirQualityMapView;
