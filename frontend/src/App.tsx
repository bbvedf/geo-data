// src/App.tsx (con VanillaMap)
import { useEffect, useState } from 'react'
import './index.css'
import axios from 'axios'
import VanillaMap from './components/VanillaMap'
import CovidChart from './components/CovidChart'
import { FaFilter, FaTrashAlt, FaSpinner } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
})

interface Dataset {
  id: string
  name: string
  type: string
}

interface CovidData {
  fecha: string
  comunidad: string
  provincia: string
  casos: number
  lat: number
  lon: number
}

function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [covidData, setCovidData] = useState<CovidData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map')
  const [filters, setFilters] = useState({
  comunidad: 'todas',
  provincia: 'todas',
  fechaInicio: '2023-01-01',
  fechaFin: '2023-03-31',
  minCasos: 0,
  maxCasos: 10000
});

  const [filteredData, setFilteredData] = useState<CovidData[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  const applyFilters = async () => {
  setIsFiltering(true);
  try {
    const params = new URLSearchParams();
    if (filters.comunidad !== 'todas') params.append('comunidad', filters.comunidad);
    if (filters.provincia !== 'todas') params.append('provincia', filters.provincia);
    if (filters.fechaInicio) params.append('fecha_inicio', filters.fechaInicio);
    if (filters.fechaFin) params.append('fecha_fin', filters.fechaFin);
    if (filters.minCasos > 0) params.append('min_casos', filters.minCasos.toString());
    if (filters.maxCasos < 10000) params.append('max_casos', filters.maxCasos.toString());
    
    const response = await api.get(`/api/covid/filter?${params.toString()}`);
    setFilteredData(response.data.data);
    
    // Mostrar mensaje de resultados
    console.log(`Filtros aplicados: ${response.data.count} registros encontrados`);
  } catch (error) {
    console.error('Error al aplicar filtros:', error);
    alert('Error al aplicar filtros');
  } finally {
    setIsFiltering(false);
  }
};

    const hasActiveFilters = 
        filters.comunidad !== 'todas' || 
        filters.provincia !== 'todas' || 
        filters.fechaInicio !== '2023-01-01' || 
        filters.fechaFin !== '2023-03-31' ||
        filters.minCasos > 0 || 
        filters.maxCasos < 10000;

    const clearFilters = () => {
    // Restablecer filtros a valores por defecto
    setFilters({
        comunidad: 'todas',
        provincia: 'todas',
        fechaInicio: '2023-01-01',
        fechaFin: '2023-03-31',
        minCasos: 0,
        maxCasos: 10000
    });
    
    // Limpiar datos filtrados (mostrar todos)
    setFilteredData([]);
    
    // Opcional: Mostrar mensaje
    console.log('Filtros limpiados, mostrando todos los datos');
    };

  useEffect(() => {
    Promise.all([
      api.get('/api/datasets'),
      api.get('/api/data/covid')
    ])
    .then(([datasetsRes, covidRes]) => {
      setDatasets(datasetsRes.data.datasets)
      setCovidData(covidRes.data.data)
    })
    .catch(error => {
      console.error('Error loading data:', error)
    })
    .finally(() => {
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos geoespaciales...</p>
        </div>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-gray-100">
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🌍 Geo-Data Analytics
            </h1>
            <p className="mt-2 text-gray-600">
              Visualización geoespacial y análisis temporal
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <a
              href="http://localhost:8180/api/docs"  // <-- CORREGIDO: 8180 no 8100
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              📚 API Documentation
            </a>
          </div>
        </div>
      </div>
    </header>

    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'map'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🗺️ Mapa Interactivo
            </button>
            <button
              onClick={() => setActiveTab('chart')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'chart'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Gráficos
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Datos
            </button>
          </nav>
        </div>
      </div>

      <div className="space-y-8">
        {activeTab === 'map' && (
  <div className="bg-white rounded-lg shadow-lg p-6">
    <h2 className="text-2xl font-semibold mb-4">🗺️ Mapa de Casos COVID en España</h2>
    
    {/* SECCIÓN DE FILTROS - MEJORADA */}
<div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
  <h3 className="font-medium text-lg text-gray-800 mb-3">🔍 Filtros</h3>
  
  {/* Indicador de filtros activos - NUEVO */}
  {(filters.comunidad !== 'todas' || filters.provincia !== 'todas' || 
    filters.fechaInicio !== '2023-01-01' || filters.fechaFin !== '2023-03-31' ||
    filters.minCasos > 0 || filters.maxCasos < 10000) && (
    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
      <span className="font-medium">⚡ Filtros activos:</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {filters.comunidad !== 'todas' && (
          <span className="px-2 py-1 bg-amber-100 rounded">Comunidad: {filters.comunidad}</span>
        )}
        {filters.provincia !== 'todas' && (
          <span className="px-2 py-1 bg-amber-100 rounded">Provincia: {filters.provincia}</span>
        )}
        {(filters.fechaInicio !== '2023-01-01' || filters.fechaFin !== '2023-03-31') && (
          <span className="px-2 py-1 bg-amber-100 rounded">
            Fechas: {filters.fechaInicio} a {filters.fechaFin}
          </span>
        )}
        {filters.minCasos > 0 && (
          <span className="px-2 py-1 bg-amber-100 rounded">Mín: {filters.minCasos} casos</span>
        )}
        {filters.maxCasos < 10000 && (
          <span className="px-2 py-1 bg-amber-100 rounded">Máx: {filters.maxCasos} casos</span>
        )}
      </div>
    </div>
  )}
  
  {/* FILTROS PRINCIPALES - 6 columnas en desktop */}
  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
    
    {/* Comunidad */}
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Comunidad
      </label>
      <select
        value={filters.comunidad}
        onChange={(e) => setFilters({...filters, comunidad: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="todas">Todas las comunidades</option>
        {Array.from(new Set(covidData.map(d => d.comunidad))).sort().map(comunidad => (
          <option key={comunidad} value={comunidad}>{comunidad}</option>
        ))}
      </select>
    </div>
    
    {/* Provincia */}
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Provincia
      </label>
      <select
        value={filters.provincia}
        onChange={(e) => setFilters({...filters, provincia: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        disabled={filters.comunidad === 'todas'}
      >
        <option value="todas">
          {filters.comunidad === 'todas' ? 'Selecciona comunidad primero' : 'Todas las provincias'}
        </option>
        {filters.comunidad !== 'todas' && 
          Array.from(new Set(
            covidData
              .filter(d => d.comunidad === filters.comunidad)
              .map(d => d.provincia)
              .filter(p => p)
          )).sort().map(provincia => (
            <option key={provincia} value={provincia}>{provincia}</option>
          ))
        }
      </select>
    </div>
    
    {/* Fecha inicio */}
    <div className="md:col-span-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Fecha inicio
      </label>
      <input
        type="date"
        value={filters.fechaInicio}
        onChange={(e) => setFilters({...filters, fechaInicio: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        min="2023-01-01"
        max="2023-03-31"
      />
    </div>
    
    {/* Fecha fin */}
    <div className="md:col-span-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Fecha fin
      </label>
      <input
        type="date"
        value={filters.fechaFin}
        onChange={(e) => setFilters({...filters, fechaFin: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        min="2023-01-01"
        max="2023-03-31"
      />
    </div>
    
    {/* BOTONES - Ahora en su propia fila para más espacio */}
  </div>
  
  {/* SEGUNDA FILA: Rangos de casos + Botones */}
  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
    
    {/* Mínimo de casos */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Mínimo de casos
      </label>
      <div className="flex items-center space-x-3">
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={filters.minCasos}
          onChange={(e) => setFilters({...filters, minCasos: parseInt(e.target.value)})}
          className="flex-1"
        />
        <span className="text-sm font-medium text-gray-700 min-w-[80px]">
          {filters.minCasos.toLocaleString()}
        </span>
      </div>
    </div>
    
    {/* Máximo de casos */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Máximo de casos
      </label>
      <div className="flex items-center space-x-3">
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={filters.maxCasos}
          onChange={(e) => setFilters({...filters, maxCasos: parseInt(e.target.value)})}
          className="flex-1"
        />
        <span className="text-sm font-medium text-gray-700 min-w-[80px]">
          {filters.maxCasos.toLocaleString()}
        </span>
      </div>
    </div>
    
    {/* BOTONES - Con mejor layout */}
    <div className="flex items-end space-x-3">
      <button
        onClick={clearFilters}
        disabled={isFiltering || !hasActiveFilters}  // Deshabilitado si no hay filtros
        className={`flex-1 px-4 py-3 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center justify-center
            ${hasActiveFilters 
            ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 focus:ring-rose-400' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
            }`}
            title={hasActiveFilters ? "Restablecer todos los filtros" : "No hay filtros activos"}
            >
            <FaTrashAlt className="mr-2" />
            Limpiar
    </button>      
      
      <button
        onClick={applyFilters}
        disabled={isFiltering}
        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow flex items-center justify-center"
      >
        {isFiltering ? (
          <>
            <FaSpinner className="animate-spin mr-2" />
            Aplicando...
          </>
        ) : (
          <>
            <FaFilter className="mr-2" />
            Aplicar Filtros
          </>
        )}
      </button>
      
      
    </div>
  </div>
  
  {/* Contador de resultados */}
  {filteredData.length > 0 && (
    <div className="mt-3 pt-3 border-t border-gray-300">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          📊 Mostrando <span className="font-semibold text-gray-800">{filteredData.length}</span> de{' '}
          <span className="font-semibold text-gray-800">{covidData.length}</span> registros
        </span>
        <span className="text-xs text-gray-500">
          {((filteredData.length / covidData.length) * 100).toFixed(1)}% del total
        </span>
      </div>
    </div>
  )}
</div>

        


      
    
    <p className="text-gray-600 mb-6">
      Mapa interactivo con círculos proporcionales al número de casos.
      Haz clic en cada punto para más detalles.
    </p>
    
    {/* MAPA con datos filtrados */}
    <VanillaMap data={filteredData.length > 0 ? filteredData : covidData} height="600px" />
    
            
            {/* LEYENDA CORREGIDA - FUERA del componente VanillaMap */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-700 mr-4">🎯 Leyenda:</div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Alto (1800+ casos)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Medio (1600-1800)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Moderado (1400-1600)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                      <span className="text-sm text-gray-600">Bajo (menos de 1400)</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  <span className="font-medium">Total puntos:</span> {covidData.length} | 
                  <span className="font-medium ml-2">Comunidades:</span> {new Set(covidData.map(d => d.comunidad)).size}
                </div>
              </div>
              
              {/* Información adicional */}
              <div className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-500">
                <p>💡 El tamaño del círculo es proporcional al número de casos. Haz clic en cualquier punto para ver detalles.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chart' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">📈 Análisis Temporal COVID</h2>
            <CovidChart data={covidData} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">📊 Datasets Disponibles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datasets.map(dataset => (
                  <div key={dataset.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="font-medium text-lg">{dataset.name}</div>
                    <div className="text-sm text-gray-600 mt-1">ID: {dataset.id}</div>
                    <div className="text-sm text-gray-600">Tipo: {dataset.type}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">📋 Datos COVID</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comunidad</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Casos</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordenadas</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {covidData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{item.fecha}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.comunidad}</td>
                        <td className="px-4 py-3 text-sm">{item.casos.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER - Separado claramente de la leyenda */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <h3 className="font-bold text-lg text-gray-800">🚀 Geo-Data Analytics</h3>
            <p className="text-gray-600 mt-1">
              Frontend: React + Leaflet Vanilla + Recharts<br />
              Backend: FastAPI (Python) + SQLAlchemy + PostgreSQL/PostGIS<br />
              Datos: {covidData.length} registros cargados de COVID-19
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex space-x-4">
              <a
                href="http://localhost:8180/api"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
              >
                🌐 Backend API
              </a>
              <a
                href="http://localhost:8180/api/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📚 Swagger UI
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
)
}

export default App