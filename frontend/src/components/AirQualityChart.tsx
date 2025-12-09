// src/components/AirQualityChart.tsx
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { FaSmog, FaCity, FaChartPie, FaChartBar, FaMapMarkerAlt, FaExclamationTriangle, FaAngleRight, FaInfo } from 'react-icons/fa';

interface AirQualityStation {
  id: number;
  station_code: string;
  eoi_code: string;
  name: string;
  country_code: string;
  country: string;
  station_class: number;
  lat: number;
  lon: number;
  available_pollutants: string[];
  last_measurement?: number;
  last_aqi?: number;
  pollutant?: string;
  unit?: string;
  quality_text?: string;
  quality_color?: string;
  recommendation?: string;
  last_updated: string;
  is_mock?: boolean;
}

interface AirQualityStats {
  pollutant: string;
  description: string;
  total_stations: number;
  stations_with_data: number;
  avg_concentration: number;
  min_concentration: number;
  max_concentration: number;
  quality_distribution: Record<string, number>;
  timestamp: string;
  is_mock_data: boolean;
}

interface AirQualityChartProps {
  data: AirQualityStation[];
  pollutant: string;
  stats: AirQualityStats | null;
}

const AirQualityChart = ({ data, pollutant, stats }: AirQualityChartProps) => {
  // Colores para niveles AQI
  const AQI_COLORS = ['#00e400', '#feca57', '#ff7e00', '#ff0000', '#8f3f97'];
  
  // Color para "Sin datos"
  const NO_DATA_COLOR = '#CCCCCC';
  
  // Colores para contaminantes
  const POLLUTANT_COLORS: Record<string, string> = {
    'PM2.5': '#ff6b6b',
    'PM10': '#4ecdc4',
    'NO2': '#45b7d1',
    'O3': '#96ceb4',
    'SO2': '#feca57',
    'CO': '#ff9ff3',
    'BaP': '#54a0ff'
  };

  // Traducciones de niveles AQI
  const aqiTranslations: Record<string, string> = {
    'Buena': 'Buena',
    'Moderada': 'Moderada',
    'Mala': 'Mala',
    'Muy Mala': 'Muy Mala',
    'Extremadamente Mala': 'Extremadamente Mala',
    'Sin datos': 'Sin datos'
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No hay datos disponibles para mostrar gráficos.</p>
      </div>
    );
  }

  // Preparar datos para gráficos
  const stationsWithData = data.filter(item => item.last_measurement !== undefined);
  
  // Datos para gráfico de barras por estación (top 15)
  const topStationsData = [...stationsWithData]
    .sort((a, b) => (b.last_measurement || 0) - (a.last_measurement || 0))
    .slice(0, 15)
    .map(item => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      concentration: item.last_measurement || 0,
      aqi: item.last_aqi || 0,
      quality: item.quality_text || 'Sin datos',
      color: AQI_COLORS[(item.last_aqi || 1) - 1],
      fullName: item.name
    }));

  // Datos para gráfico de distribución AQI
  const aqiDistributionData = Object.entries(
    data.reduce((acc: Record<string, number>, item) => {
      const quality = item.quality_text || 'Sin datos';
      acc[quality] = (acc[quality] || 0) + 1;
      return acc;
    }, {})
  ).map(([quality, count]) => ({
    name: aqiTranslations[quality] || quality,
    value: count,
    color: quality === 'Sin datos' ? NO_DATA_COLOR : (
      AQI_COLORS[
        quality === 'Buena' ? 0 :
        quality === 'Moderada' ? 1 :
        quality === 'Mala' ? 2 :
        quality === 'Muy Mala' ? 3 :
        quality === 'Extremadamente Mala' ? 4 : 0
      ]
    )
  }));

  // Datos para scatter plot (concentración vs calidad)
  const scatterData = stationsWithData.map(item => ({
    x: item.last_measurement || 0,
    y: item.last_aqi || 0,
    z: 20, // Tamaño fijo para los puntos
    name: item.name,
    quality: item.quality_text,
    color: AQI_COLORS[(item.last_aqi || 1) - 1]
  }));

  // Calcular estadísticas adicionales
  const concentrations = stationsWithData.map(item => item.last_measurement || 0);
  //const aqis = stationsWithData.map(item => item.last_aqi || 0);
  
  const avgConcentration = concentrations.length > 0 
    ? concentrations.reduce((a, b) => a + b) / concentrations.length 
    : 0;
  
  const maxConcentration = concentrations.length > 0 ? Math.max(...concentrations) : 0;
  //const minConcentration = concentrations.length > 0 ? Math.min(...concentrations) : 0;
  
  // Distribución por clase de estación
  const stationClassDistribution = Object.entries(
    data.reduce((acc: Record<string, number>, item) => {
      const stationClass = `Clase ${item.station_class}`;
      acc[stationClass] = (acc[stationClass] || 0) + 1;
      return acc;
    }, {})
  ).map(([className, count]) => ({ name: className, value: count }));

  // Estilos para textos pequeños
  const smallTextStyle = {
    fontSize: '9px',
  };

  const smallTickStyle = {
    fontSize: '9px',
    fill: '#666',
  };

  const smallLegendStyle = {
    fontSize: '9px',
  };

  const smallLabelStyle = {
    fontSize: '9px',
  };

  return (
    <div>
      {/* Estadísticas */}
      <div className="row mb-4">
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaSmog className="me-2" /> {pollutant}
              </h5>
              <h2 className="text-primary">{avgConcentration.toFixed(1)} µg/m³</h2>
              <small className="text-muted">Concentración promedio</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaChartBar className="me-2" /> Máxima
              </h5>
              <h2 className="text-danger">{maxConcentration.toFixed(1)} µg/m³</h2>
              <small className="text-muted">Concentración más alta</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaChartPie className="me-2" /> Estaciones
              </h5>
              <h2 className="text-success">{data.length}</h2>
              <small className="text-muted">Total monitoreadas</small>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaCity className="me-2" /> Con Datos
              </h5>
              <h2 className="text-warning">{stationsWithData.length}</h2>
              <small className="text-muted">Estaciones activas</small>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de Calidad (Pie Chart) */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0"><FaAngleRight /> Distribución de Calidad del Aire</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aqiDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {aqiDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} estaciones`, 'Cantidad']}
                      contentStyle={smallTextStyle}
                    />
                    <Legend 
                      wrapperStyle={smallLegendStyle}
                      formatter={(value) => <span style={smallTextStyle}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-md-4">
              <div className="h-100 d-flex flex-column justify-content-center">
                <h6 className="mb-3">Leyenda de Calidad:</h6>
                {aqiDistributionData.map((item, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    <div 
                      className="rounded-circle me-2" 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: item.color 
                      }}
                    />
                    <span className="small" style={smallTextStyle}>
                      <strong>{item.name}:</strong> {item.value} estaciones
                    </span>
                  </div>
                ))}
                {stats && stats.quality_distribution && (
                  <div className="mt-3 pt-3 border-top">
                    <h6 className="mb-2">Estadísticas del conjunto:</h6>
                    <div className="small" style={smallTextStyle}>
                      <div>Total estaciones: <strong>{stats.total_stations}</strong></div>
                      <div>Con datos: <strong>{stats.stations_with_data}</strong></div>
                      <div>Promedio: <strong>{stats.avg_concentration.toFixed(1)} µg/m³</strong></div>
                      {stats.is_mock_data && (
                        <div className="text-warning mt-2" style={smallTextStyle}>
                          <FaExclamationTriangle className="me-1" /> Datos simulados
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 15 Estaciones mas Contaminadas */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0"><FaAngleRight /> Top 15 Estaciones - Concentración de {pollutant}</h5>
        </div>
        <div className="card-body">
          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topStationsData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  tick={smallTickStyle}
                />
                <YAxis 
                  label={{ 
                    value: `Concentración (µg/m³)`, 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10,
                    style: smallLabelStyle
                  }}
                  tick={smallTickStyle}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'concentration') return [`${value} µg/m³`, 'Concentración'];
                    if (name === 'aqi') return [value, 'AQI'];
                    return [value, name];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullName;
                    }
                    return label;
                  }}
                  contentStyle={smallTextStyle}
                />
                <Legend 
                    wrapperStyle={{
                    ...smallLegendStyle,
                    paddingLeft: '10px'    // ← Empuja la leyenda hacia la derecha
                  }}
                  formatter={(value) => <span style={smallTextStyle}>{value}</span>}
                  verticalAlign="top"
                  align="right"
                  layout="vertical"
                />
                <Bar 
                  dataKey="concentration" 
                  name={`${pollutant} (µg/m³)`}
                  fill={POLLUTANT_COLORS[pollutant] || '#8884d8'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 small text-muted text-center" style={smallTextStyle}>
            Muestra las 15 estaciones con mayor concentración de {pollutant}. 
            Los datos son en microgramos por metro cúbico (µg/m³).
          </div>
        </div>
      </div>

      {/* Relación Concentración vs AQI */}
      <div className="row">
        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0"><FaAngleRight /> Concentración vs Índice AQI</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Concentración" 
                      unit=" µg/m³"
                      domain={[0, 'dataMax + 5']}
                      tick={smallTickStyle}
                      label={{ 
                        value: 'Concentración (µg/m³)', 
                        position: 'bottom',
                        offset: 0,
                        style: smallLabelStyle
                      }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name="AQI" 
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tick={smallTickStyle}
                      label={{ 
                        value: 'Índice AQI', 
                        angle: -90, 
                        position: 'insideLeft',
                        offset: -5,
                        style: smallLabelStyle
                      }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 400]} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'x') return [`${value} µg/m³`, 'Concentración'];
                        if (name === 'y') return [value, 'AQI'];
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.name;
                        }
                        return label;
                      }}
                      contentStyle={smallTextStyle}
                    />
                    <Scatter 
                      name="Estaciones" 
                      data={scatterData} 
                      fill="#00A2E8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 small text-muted" style={smallTextStyle}>
                Relación entre concentración de {pollutant} y el Índice de Calidad del Aire (AQI).
                Cada punto representa una estación de medición.
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0"><FaAngleRight /> Distribución por Clase de Estación</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationClassDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={smallTickStyle}
                    />
                    <YAxis 
                      tick={smallTickStyle}
                      label={{ 
                        value: 'Número de Estaciones', 
                        angle: -90, 
                        position: 'insideLeft',
                        offset: -5,
                        style: smallLabelStyle
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value} estaciones`, 'Cantidad']}
                      contentStyle={smallTextStyle}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Estaciones" 
                      fill="#82ca9d"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3">
                <h6>Tipos de Estación:</h6>
                <div className="row small text-muted">
                  <div className="col-6">
                    <div className="d-flex align-items-center mb-1">
                      <FaMapMarkerAlt className="me-2 text-primary" />
                      <span style={smallTextStyle}>Clase 1: Urbana</span>
                    </div>
                    <div className="d-flex align-items-center mb-1">
                      <FaMapMarkerAlt className="me-2 text-success" />
                      <span style={smallTextStyle}>Clase 2: Suburbana</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center mb-1">
                      <FaMapMarkerAlt className="me-2 text-warning" />
                      <span style={smallTextStyle}>Clase 3: Rural</span>
                    </div>
                    <div className="d-flex align-items-center mb-1">
                      <FaMapMarkerAlt className="me-2 text-info" />
                      <span style={smallTextStyle}>Clase 4: Tráfico</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información del Contaminante */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0"><FaInfo /> Información sobre {pollutant}</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6><FaAngleRight /> Descripción:</h6>
              <p className="small">
                {pollutant === 'PM2.5' && 'Partículas finas menores a 2.5 micrómetros. Penetran profundamente en los pulmones y pueden entrar al torrente sanguíneo.'}
                {pollutant === 'PM10' && 'Partículas inhalables menores a 10 micrómetros. Pueden afectar el corazón y los pulmones.'}
                {pollutant === 'NO2' && 'Dióxido de nitrógeno. Gas tóxico que irrita las vías respiratorias y contribuye a la formación de smog.'}
                {pollutant === 'O3' && 'Ozono troposférico. Componente principal del smog que puede causar problemas respiratorios.'}
                {pollutant === 'SO2' && 'Dióxido de azufre. Gas irritante que puede causar problemas respiratorios y contribuir a la lluvia ácida.'}
                {pollutant === 'CO' && 'Monóxido de carbono. Gas incoloro e inodoro que reduce la capacidad de la sangre para transportar oxígeno.'}
              </p>
            </div>
            <div className="col-md-6">
              <h6><FaAngleRight /> Efectos en la Salud:</h6>
              <ul className="small">
                <li>Irritación de ojos, nariz y garganta</li>
                <li>Problemas respiratorios (asma, bronquitis)</li>
                <li>Mayor riesgo de enfermedades cardiovasculares</li>
                <li>Reducción de la función pulmonar</li>
                <li>Mayor susceptibilidad a infecciones respiratorias</li>
              </ul>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-12">
              <div className="alert alert-warning small">
                <strong>📈 Recomendaciones:</strong> 
                {pollutant === 'PM2.5' && ' En días con alta concentración, limite actividades al aire libre, especialmente personas con condiciones respiratorias.'}
                {pollutant === 'O3' && ' Evite ejercicio intenso al aire libre durante las horas de mayor concentración de ozono (tarde).'}
                {pollutant === 'NO2' && ' Ventile adecuadamente los espacios interiores y evite áreas con tráfico denso.'}
                <br />
                <small className="text-muted">Fuente: Organización Mundial de la Salud (OMS)</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirQualityChart;