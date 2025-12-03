// src/App.tsx (con VanillaMap)
import { useEffect, useState } from 'react'
import './index.css'
import axios from 'axios'
import VanillaMap from './components/VanillaMap'
import CovidChart from './components/CovidChart'


const api = axios.create({
  baseURL: 'http://localhost:8100',
})

interface Dataset {
  id: string
  name: string
  type: string
}

interface CovidData {
  fecha: string
  comunidad: string
  casos: number
  lat: number
  lon: number
}

function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [covidData, setCovidData] = useState<CovidData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'map' | 'chart' | 'data'>('map')

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
                href="http://localhost:8100/docs"
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
              <p className="text-gray-600 mb-6">
                Mapa interactivo con círculos proporcionales al número de casos.
                Haz clic en cada punto para más detalles.
              </p>
              <VanillaMap data={covidData} height="600px" />
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

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-800">🚀 Geo-Data Analytics</h3>
              <p className="text-gray-600 mt-1">
                Frontend: React + Leaflet Vanilla + Recharts<br />
                Backend: FastAPI (Python) + Pandas<br />
                Datos: {covidData.length} registros cargados
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex space-x-4">
                <a
                  href="http://localhost:8100"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50"
                >
                  🌐 Backend API
                </a>
                <a
                  href="http://localhost:8100/docs"
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