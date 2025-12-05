// src/components/WeatherChart.tsx
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  weather_main: string;
  timestamp: string;
}

interface WeatherChartProps {
  data: WeatherData[];
}

const WeatherChart = ({ data }: WeatherChartProps) => {
  // Mapa de traducciones local
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
    'Fog': 'Niebla',
    'Dust': 'Polvo',
    'Sand': 'Arena',
    'Ash': 'Ceniza',
    'Squall': 'Chubasco',
    'Tornado': 'Tornado'
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No hay datos disponibles para mostrar gráficos.</p>
      </div>
    );
  }

  // Preparar datos para gráficos
  const chartData = data.map(item => ({
    name: item.city,
    Temperatura: item.temperature,
    Humedad: item.humidity,
    Viento: item.wind_speed,
    Condición: item.weather_main,
  }));

  // Estadísticas
  const avgTemp = data.reduce((sum, item) => sum + item.temperature, 0) / data.length;
  const maxTemp = Math.max(...data.map(item => item.temperature));
  const minTemp = Math.min(...data.map(item => item.temperature));
  const cities = [...new Set(data.map(item => item.city))];

  return (
    <div>
      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">🌡️ Temp. Promedio</h5>
              <h2 className="text-primary">{avgTemp.toFixed(1)}°C</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-danger">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">🔥 Máxima</h5>
              <h2 className="text-danger">{maxTemp.toFixed(1)}°C</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-info">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">❄️ Mínima</h5>
              <h2 className="text-info">{minTemp.toFixed(1)}°C</h2>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-success">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">🏙️ Ciudades</h5>
              <h2 className="text-success">{cities.length}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Temperatura por Ciudad */}
      <div className="card shadow mb-4">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0">🌡️ Temperatura por Ciudad</h5>
        </div>
        <div className="card-body">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: '°C', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value}°C`, 'Temperatura']} />
                <Legend />
                <Bar dataKey="Temperatura" fill="#8884d8" name="Temperatura (°C)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráfico de Humedad y Viento */}
      <div className="row">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">💧 Humedad por Ciudad</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Humedad']} />
                    <Bar dataKey="Humedad" fill="#82ca9d" name="Humedad (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-warning text-white">
              <h5 className="mb-0">💨 Velocidad del Viento</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'm/s', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => [`${value} m/s`, 'Viento']} />
                    <Legend />
                    <Line type="monotone" dataKey="Viento" stroke="#ffc658" name="Viento (m/s)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de Condiciones */}
      <div className="card shadow mt-4">
        <div className="card-header bg-secondary text-white">
          <h5 className="mb-0">🌤️ Distribución de Condiciones</h5>
        </div>
        <div className="card-body">
          <div className="row">
            {Object.entries(
              data.reduce((acc: Record<string, number>, item) => {
                acc[item.weather_main] = (acc[item.weather_main] || 0) + 1;
                return acc;
              }, {})
            ).map(([condition, count]) => {
              const translatedCondition = weatherConditionTranslations[condition] || condition;
              
              return (
                <div key={condition} className="col-md-3 col-6 mb-3">
                  <div className="d-flex align-items-center">
                    <div className={`rounded-circle me-2 ${
                      condition === 'Clear' ? 'bg-warning' :
                      condition === 'Clouds' ? 'bg-secondary' :
                      condition === 'Rain' ? 'bg-primary' :
                      condition === 'Snow' ? 'bg-info' : 'bg-light'
                    }`} style={{ width: '20px', height: '20px' }}></div>
                    <div>
                      <div className="fw-medium">{translatedCondition}</div>
                      <div className="text-muted small">{count} ciudad{count !== 1 ? 'es' : ''}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherChart;