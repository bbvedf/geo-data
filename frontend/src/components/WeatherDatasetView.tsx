// src/components/WeatherDatasetView.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import VanillaMap from './VanillaMap';
import WeatherChart from './WeatherChart';
import { FaFilter, FaTrashAlt, FaSpinner, FaThermometerHalf, FaWind, FaTint } from 'react-icons/fa';

const api = axios.create({
  baseURL: '/api/geo',
});

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  weather_main: string;
  weather_description: string;
  weather_icon: string;
  clouds: number;
  visibility: number;
  lat: number;
  lon: number;
  timestamp: string;
}

function WeatherDatasetView() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map');
  const [filters, setFilters] = useState({
    city: 'todas',
    minTemp: -10,
    maxTemp: 40,
    weatherCondition: 'todas',
  });

  const [filteredData, setFilteredData] = useState<WeatherData[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  // Condiciones meteorológicas disponibles
  const weatherConditionTranslations: Record<string, string> = {
  'Clear': 'Despejado',
  'Clouds': 'Nublado',
  'Rain': 'Lluvia',
  'Snow': 'Nieve',
  'Thunderstorm': 'Tormenta',
  'Drizzle': 'Llovizna',
  'Mist': 'Neblina',
  'Smoke': 'Humo',
  'Haze': 'Calima',
  'Fog': 'Niebla'
  };

  const applyFilters = async () => {
    setIsFiltering(true);
    try {
      let dataToFilter = [...weatherData];
      
      // Filtrar por ciudad
      if (filters.city !== 'todas') {
        dataToFilter = dataToFilter.filter(d => 
          d.city.toLowerCase().includes(filters.city.toLowerCase())
        );
      }
      
      // Filtrar por temperatura
      dataToFilter = dataToFilter.filter(d => 
        d.temperature >= filters.minTemp && d.temperature <= filters.maxTemp
      );
      
      // Filtrar por condición
      if (filters.weatherCondition !== 'todas') {
        dataToFilter = dataToFilter.filter(d => 
          d.weather_main === filters.weatherCondition
        );
      }
      
      setFilteredData(dataToFilter);
      console.log(`Filtros aplicados: ${dataToFilter.length} ciudades encontradas`);
    } catch (error) {
      console.error('Error al aplicar filtros:', error);
      alert('Error al aplicar filtros');
    } finally {
      setIsFiltering(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      city: 'todas',
      minTemp: -10,
      maxTemp: 40,
      weatherCondition: 'todas',
    });
    setFilteredData([]);
    console.log('Filtros limpiados, mostrando todos los datos');
  };

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const response = await api.get('/api/weather/data');
        setWeatherData(response.data.data);
        console.log(`Datos clima cargados: ${response.data.count} ciudades`);
      } catch (error) {
        console.error('Error loading weather data:', error);
        alert('Error cargando datos del clima');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, []);

  const hasActiveFilters = 
    filters.city !== 'todas' || 
    filters.minTemp > -10 || 
    filters.maxTemp < 40 ||
    filters.weatherCondition !== 'todas';

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando datos meteorológicos...</p>
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
              🌤️ Mapa del Clima
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              📈 Análisis Temporal
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              📋 Datos Meteorológicos
            </button>
          </li>
        </ul>
      </div>

      {activeTab === 'map' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">🌤️ Clima en España</h2>
            
            {/* FILTROS */}
            <div className="card border-primary mb-4">
              <div className="card-header bg-primary text-white">
                <h3 className="h5 mb-0">🔍 Filtros del Clima</h3>
              </div>
              <div className="card-body">
                {hasActiveFilters && (
                  <div className="alert alert-warning mb-3">
                    <strong>⚡ Filtros activos:</strong>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {filters.city !== 'todas' && (
                        <span className="badge bg-warning text-dark">Ciudad: {filters.city}</span>
                      )}
                      {filters.minTemp > -10 && (
                        <span className="badge bg-warning text-dark">Temp mín: {filters.minTemp}°C</span>
                      )}
                      {filters.maxTemp < 40 && (
                        <span className="badge bg-warning text-dark">Temp máx: {filters.maxTemp}°C</span>
                      )}
                      {filters.weatherCondition !== 'todas' && (
                        <span className="badge bg-warning text-dark">Condición: {filters.weatherCondition}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="row g-3">
                  {/* Ciudad */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Ciudad</label>
                    <select
                      className="form-select"
                      value={filters.city}
                      onChange={(e) => setFilters({...filters, city: e.target.value})}
                    >
                      <option value="todas">Todas las ciudades</option>
                      {Array.from(new Set(weatherData.map(d => d.city))).sort().map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condición meteorológica */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">Condición</label>
                    <select
                    className="form-select"
                    value={filters.weatherCondition}
                    onChange={(e) => setFilters({...filters, weatherCondition: e.target.value})}
                    >
                    <option value="todas">Todas las condiciones</option>
                    {Object.entries(weatherConditionTranslations).map(([eng, esp]) => (
                        <option key={eng} value={eng}>{esp}</option>
                    ))}
                    </select>
                  </div>

                  {/* Rango temperatura */}
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Temperatura: <span className="badge bg-info">{filters.minTemp}°C - {filters.maxTemp}°C</span>
                    </label>
                    <div className="d-flex gap-2">
                      <input
                        type="range"
                        className="form-range"
                        min="-10"
                        max="40"
                        step="1"
                        value={filters.minTemp}
                        onChange={(e) => setFilters({...filters, minTemp: parseInt(e.target.value)})}
                      />
                      <input
                        type="range"
                        className="form-range"
                        min="-10"
                        max="40"
                        step="1"
                        value={filters.maxTemp}
                        onChange={(e) => setFilters({...filters, maxTemp: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="col-12 d-flex gap-2 justify-content-end">
                    <button
                      className="btn btn-danger"
                      onClick={clearFilters}
                      disabled={isFiltering || !hasActiveFilters}
                    >
                      <FaTrashAlt />                      
                    </button>
                    
                    <button
                      className="btn btn-primary"
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

                {/* Contador */}
                {filteredData.length > 0 && (
                  <div className="mt-3 pt-3 border-top">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">
                        📊 Mostrando <strong>{filteredData.length}</strong> de{' '}
                        <strong>{weatherData.length}</strong> ciudades
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-muted mb-4">
              Mapa interactivo con condiciones meteorológicas actuales.
              Haz clic en cada punto para ver detalles del clima.
            </p>
            
            {/* MAPA - Usamos VanillaMap pero con datos de clima */}
            <div className="row mb-4">
              <div className="col-12">
                <VanillaMap 
                  data={filteredData.length > 0 ? filteredData : weatherData} 
                  height="600px" 
                  type="weather"
                />
              </div>
            </div>

            {/* LEYENDA CLIMA */}            
            <div className="row">
              <div className="col-12">
                <div className="p-3 rounded border" style={{ 
                  backgroundColor: 'var(--color-card-bg)',
                  color: 'var(--color-text)'
                }}>
                  <div className="row align-items-center">
                    <div className="col-12 col-md-8 mb-3 mb-md-0">
                      <div className="d-flex align-items-center">
                        <div className="fw-medium me-3">🎯 Leyenda Clima:</div>
                        <div className="d-flex flex-wrap gap-3">
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-danger me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Calor (25°C+)</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-warning me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Templado (15-25°C)</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-success me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Fresco (5-15°C)</span>
                          </div>
                          <div className="d-flex align-items-center">
                            <div className="rounded-circle bg-primary me-2" style={{width: '16px', height: '16px'}}></div>
                            <span className="small">Frío (menos de 5°C)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-12 col-md-4">
                      <div className="small text-muted text-md-end">
                        <div><span className="fw-medium">Total ciudades:</span> {weatherData.length}</div>
                        <div><span className="fw-medium">Actualizado:</span> {
                          weatherData.length > 0 ? 
                          new Date(weatherData[0].timestamp).toLocaleTimeString() : 
                          'N/A'
                        }</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="row mt-2 pt-2 border-top">
                    <div className="col-12">
                      <div className="small text-muted">
                        💡 El color del círculo indica la temperatura. Haz clic en cualquier ciudad para ver detalles del clima.
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
            <h2 className="card-title mb-4">📈 Análisis Meteorológico</h2>
            {weatherData.length > 0 ? (
              <WeatherChart data={weatherData} />
            ) : (
              <p className="text-muted">No hay datos disponibles para mostrar gráficos.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card shadow">
          <div className="card-body">
            <h2 className="card-title mb-4">📋 Datos Meteorológicos</h2>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Ciudad</th>
                    <th>Temperatura</th>
                    <th>Sensación</th>
                    <th>Humedad</th>
                    <th>Viento</th>
                    <th>Condición</th>
                    <th>Actualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredData.length > 0 ? filteredData : weatherData).map((item, index) => (
                    <tr key={index}>
                      <td className="fw-medium">{item.city}</td>
                      <td>
                        <FaThermometerHalf className="text-danger me-1" />
                        {item.temperature}°C
                      </td>
                      <td>{item.feels_like}°C</td>
                      <td>
                        <FaTint className="text-primary me-1" />
                        {item.humidity}%
                      </td>
                      <td>
                        <FaWind className="text-info me-1" />
                        {item.wind_speed} m/s
                      </td>
                      <td>
                        <span className={`badge ${
                          item.weather_main === 'Clear' ? 'bg-warning' :
                          item.weather_main === 'Clouds' ? 'bg-secondary' :
                          item.weather_main === 'Rain' ? 'bg-primary' :
                          item.weather_main === 'Snow' ? 'bg-info' : 'bg-light text-dark'
                        }`}>
                          {item.weather_description}
                        </span>
                      </td>
                      <td className="text-muted small">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WeatherDatasetView;