// frontend/src/components/AirQualityTable.tsx
// Pestaña "data"
import React, { useState } from 'react';
import { FaSearch, FaFilter, FaTimes, FaDownload } from 'react-icons/fa';
import { AirQualityStationLight } from './types';

interface Props {
  stations: AirQualityStationLight[];
  selectedPollutant: string;
  pollutants: Array<{value: string, label: string}>;
  aqiLevels: Array<{value: number, label: string, color: string}>;
  onFilterChange: (filters: { ciudad?: string; calidad?: string }) => void;
  onClearFilters: () => void;
  onExport?: (stations: AirQualityStationLight[]) => void;
}

const AirQualityTable: React.FC<Props> = ({
  stations,
  selectedPollutant,
  pollutants,
  aqiLevels,
  onFilterChange,
  onClearFilters,
  onExport
}) => {
  const [localFilters, setLocalFilters] = useState({
    ciudad: '',
    calidad: 'todas',
  });
  const [visibleCount, setVisibleCount] = useState(50);

  const handleFilterChange = (newFilters: Partial<typeof localFilters>) => {
    const updated = { ...localFilters, ...newFilters };
    setLocalFilters(updated);
    onFilterChange(updated);
  };
  
  // Función para exportar datos (copiada del original)
  const exportData = (stationsToExport: AirQualityStationLight[]) => {
    const dataToExport = stationsToExport.map(station => ({
      Estación: station.name,
      Estado: station.is_active ? 'Activa' : 'Inactiva',
      AQI: station.last_aqi || 'N/A',
      Calidad: aqiLevels.find(l => l.value === station.last_aqi)?.label || 'Sin datos',
      Contaminante: station.pollutant || 'No definido',
      Tipo: station.station_type || `Clase ${station.station_class || 'N/A'}`,
      Latitud: station.lat,
      Longitud: station.lon,
      'Código Estación': station.station_code
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
    link.setAttribute('download', `calidad-aire_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📊 Exportados ${stationsToExport.length} registros`);
  };

  return (
    <div className="card shadow">
      <div className="card-body">
        <h2 className="card-title mb-4">📋 Datos de Estaciones</h2>
        
        {/* FILTROS RÁPIDOS - AUTO-APLICADOS */}
        <div className="row mb-3">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text">
                <FaSearch />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar estación..."
                value={localFilters.ciudad}
                onChange={(e) => handleFilterChange({ ciudad: e.target.value })}
              />
              {localFilters.ciudad && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => handleFilterChange({ ciudad: '' })}
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
                value={localFilters.calidad}
                onChange={(e) => handleFilterChange({ calidad: e.target.value })}
              >
                <option value="todas">Todas las calidades</option>
                {aqiLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              {localFilters.calidad !== 'todas' && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => handleFilterChange({ calidad: 'todas' })}
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* RESUMEN DE FILTROS ACTIVOS */}
        {(localFilters.ciudad || localFilters.calidad !== 'todas' || selectedPollutant !== 'ALL') && (
          <div className="alert alert-info mb-3">
            <strong>🔍 Filtros aplicados:</strong>
            <div className="d-flex flex-wrap gap-2 mt-2 align-items-center">
              {localFilters.ciudad && (
                <span className="badge bg-info">
                  Estación: {localFilters.ciudad}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => handleFilterChange({ ciudad: '' })}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              {localFilters.calidad !== 'todas' && (
                <span className="badge bg-info">
                  Calidad: {aqiLevels.find(l => l.value.toString() === localFilters.calidad)?.label}
                  <button 
                    className="btn btn-sm btn-link text-white p-0 ms-1"
                    onClick={() => handleFilterChange({ calidad: 'todas' })}
                  >
                    <FaTimes />
                  </button>
                </span>
              )}
              {selectedPollutant !== 'ALL' && (
                <span className="badge bg-warning text-dark">
                  Contaminante: {pollutants.find(p => p.value === selectedPollutant)?.label}
                </span>
              )}
              <button 
                className="btn btn-sm btn-outline-info"
                onClick={onClearFilters}
              >
                <FaTimes className="me-1" />
                Limpiar todos los filtros
              </button>
            </div>
          </div>
        )}
        
        <div className="d-flex justify-content-between mb-3 align-items-center">
          <p className="text-muted mb-0">
            Mostrando {Math.min(visibleCount, stations.length)} de {stations.length} estaciones
            {selectedPollutant !== 'ALL' && ` (filtrado por ${selectedPollutant})`}
          </p>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={() => onExport ? onExport(stations) : exportData(stations)}
              disabled={stations.length === 0}
            >
              <FaDownload className="me-1" />
              Exportar ({stations.length})
            </button>
          </div>
        </div>
        
        {/* TABLA DE DATOS */}
        <div className="table-responsive">
          <table className="table table-hover table-sm">
            <thead>
              <tr>
                <th>Estación</th>
                <th>Estado</th>
                <th>AQI</th>
                <th>Calidad</th>
                <th>Contaminante</th>
                <th>Tipo</th>
                <th>Coordenadas</th>
              </tr>
            </thead>
            <tbody>
              {stations.slice(0, visibleCount).map((item, index) => (
                <tr key={index}>
                  <td className="fw-medium">{item.name}</td>
                  <td>
                    {item.is_active ? (
                      <span className="badge bg-success">Activa</span>
                    ) : (
                      <span className="badge bg-secondary">Inactiva</span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      backgroundColor: item.quality_color || '#ccc',
                      color: '#fff'
                    }}>
                      {item.last_aqi || 'N/A'}
                    </span>
                  </td>
                  <td>
                    {aqiLevels.find(l => l.value === item.last_aqi)?.label || 'Sin datos'}
                  </td>
                  <td>
                    {item.pollutant || 'No definido'}
                  </td>
                  <td>
                    <small className="text-muted">
                      {item.station_type || `Clase ${item.station_class || 'N/A'}`}
                    </small>
                  </td>
                  <td className="small">
                    {item.lat?.toFixed(4)}, {item.lon?.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* PAGINACIÓN MEJORADA */}
        {stations.length > 50 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-muted">
              📋 Mostrando {Math.min(visibleCount, stations.length)} de {stations.length} estaciones
            </small>
            
            <div className="d-flex gap-2">
              {stations.length > visibleCount && (
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
      </div>
    </div>
  );
};

export default AirQualityTable;