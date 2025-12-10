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
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { 
  FaSmog, 
  FaCity, 
  FaChartPie, 
  FaChartBar, 
  FaMapMarkerAlt, 
  FaAngleRight, 
  FaInfo,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import { AirQualityStation } from './types';

interface AirQualityChartProps {
  data: AirQualityStation[];
  pollutant: string;  
}

const AirQualityChart = ({ data, pollutant }: AirQualityChartProps) => {
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
    'BaP': '#54a0ff',
    'SIN_CONTAMINANTE': '#95a5a6'
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

  // ============ CALCULAR ESTADÍSTICAS CORRECTAS ============
  const stationsWithData = data.filter(item => item.last_measurement !== undefined);
  const activeStations = data.filter(item => item.is_active !== false).length;
  const inactiveStations = data.filter(item => item.is_active === false).length;
  const stationsWithValidData = data.filter(item => 
    item.is_active !== false && 
    item.last_measurement !== undefined
  ).length;
  
  const concentrations = stationsWithData.map(item => item.last_measurement || 0);
  const avgConcentration = concentrations.length > 0 
    ? concentrations.reduce((a, b) => a + b) / concentrations.length 
    : 0;
  const maxConcentration = concentrations.length > 0 ? Math.max(...concentrations) : 0;
  const minConcentration = concentrations.length > 0 ? Math.min(...concentrations) : 0;

  // ============ DATOS PARA GRÁFICOS ============
  
  // 1. Top 15 estaciones (solo activas con datos)
  const topStationsData = [...stationsWithData]
    .filter(item => item.is_active !== false)
    .sort((a, b) => (b.last_measurement || 0) - (a.last_measurement || 0))
    .slice(0, 15)
    .map(item => ({
      name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
      concentration: item.last_measurement || 0,
      aqi: item.last_aqi || 0,
      quality: item.quality_text || 'Sin datos',
      pollutant: item.pollutant || item.ica_contaminant || 'No definido',
      color: POLLUTANT_COLORS[item.pollutant || item.ica_contaminant || ''] || '#95a5a6',
      fullName: item.name,
      isActive: item.is_active !== false
    }));

  // 2. Distribución AQI (diferenciando activas/inactivas)
  const aqiDistributionData = Object.entries(
    data.reduce((acc: Record<string, {active: number, inactive: number}>, item) => {
      const quality = item.quality_text || 'Sin datos';
      if (!acc[quality]) {
        acc[quality] = { active: 0, inactive: 0 };
      }
      if (item.is_active !== false) {
        acc[quality].active += 1;
      } else {
        acc[quality].inactive += 1;
      }
      return acc;
    }, {})
  ).flatMap(([quality, counts]) => {
    const result = [];
    if (counts.active > 0) {
      result.push({
        name: `${aqiTranslations[quality] || quality} (Activa)`,
        value: counts.active,
        color: quality === 'Sin datos' ? NO_DATA_COLOR : (
          AQI_COLORS[
            quality === 'Buena' ? 0 :
            quality === 'Moderada' ? 1 :
            quality === 'Mala' ? 2 :
            quality === 'Muy Mala' ? 3 :
            quality === 'Extremadamente Mala' ? 4 : 0
          ]
        ),
        type: 'active'
      });
    }
    if (counts.inactive > 0) {
      result.push({
        name: `${aqiTranslations[quality] || quality} (Inactiva)`,
        value: counts.inactive,
        color: `${quality === 'Sin datos' ? NO_DATA_COLOR : (
          AQI_COLORS[
            quality === 'Buena' ? 0 :
            quality === 'Moderada' ? 1 :
            quality === 'Mala' ? 2 :
            quality === 'Muy Mala' ? 3 :
            quality === 'Extremadamente Mala' ? 4 : 0
          ]
        )}80`, // 50% de opacidad para inactivas
        type: 'inactive'
      });
    }
    return result;
  });

  // 3. Scatter plot (solo activas con datos)
  const scatterData = stationsWithData
    .filter(item => item.is_active !== false)
    .map(item => ({
      x: item.last_measurement || 0,
      y: item.last_aqi || 0,
      z: 20,
      name: item.name,
      quality: item.quality_text,
      color: AQI_COLORS[(item.last_aqi || 1) - 1]
    }));

  // 4. Distribución por tipo de estación
  const stationTypeDistribution = Object.entries(
    data.reduce((acc: Record<string, number>, item) => {
      const stationType = item.station_type || 'SIN TIPO';
      acc[stationType] = (acc[stationType] || 0) + 1;
      return acc;
    }, {})
  ).map(([typeName, count]) => ({ 
    name: typeName, 
    value: count,
    description: typeName === 'TRAFICO' ? 'Tráfico' :
                 typeName === 'INDUSTRIAL' ? 'Industrial' :
                 typeName === 'FONDO' ? 'Fondo' :
                 typeName === 'RURAL' ? 'Rural' : typeName,
    color: typeName === 'TRAFICO' ? '#3498db' :
           typeName === 'INDUSTRIAL' ? '#e74c3c' :
           typeName === 'FONDO' ? '#2ecc71' :
           typeName === 'RURAL' ? '#e67e22' : '#95a5a6'
  }));

  // Estilos
  const smallTextStyle = { fontSize: '11px' };
  const smallTickStyle = { fontSize: '11px', fill: '#666' };  
  const smallLabelStyle = { fontSize: '11px' };

  return (
    <div>
      {/* ESTADÍSTICAS ACTUALIZADAS */}
      <div className="row mb-4">
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaChartPie className="me-2" /> Estaciones
              </h5>
              <h2 className="text-success">{data.length}</h2>
              <small className="text-muted">Total monitoreadas</small>
              <div className="small text-muted mt-1">
                <FaCheckCircle className="text-success me-1" /> {activeStations} activas
                <br/>
                <FaTimesCircle className="text-secondary me-1" /> {inactiveStations} inactivas
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaCity className="me-2" /> Con Datos
              </h5>
              <h2 className="text-warning">{stationsWithValidData}</h2>
              <small className="text-muted">Activas con datos</small>
              <div className="small text-muted mt-1">
                {stationsWithData.length} con medición
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaSmog className="me-2" /> {pollutant}
              </h5>
              <h2 className="text-primary">{avgConcentration.toFixed(1)} ICA</h2>
              <small className="text-muted">Concentración promedio</small>
              <div className="small text-muted mt-1">
                Rango: {minConcentration.toFixed(0)}-{maxConcentration.toFixed(0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaChartBar className="me-2" /> Máxima
              </h5>
              <h2 className="text-danger">{maxConcentration.toFixed(1)} ICA</h2>
              <small className="text-muted">Concentración más alta</small>
              {topStationsData.length > 0 && (
                <div className="small text-muted mt-1">
                  En: {topStationsData[0]?.fullName?.substring(0, 15)}...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DISTRIBUCIÓN DE CALIDAD (ACTUALIZADO) */}
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
                        formatter={(value, _, props) => {
                          const stationType = props.payload.type === 'active' ? 'activas' : 'inactivas';
                          return [`${value} estaciones ${stationType}`, 'Cantidad'];
                        }}
                      contentStyle={smallTextStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-md-4">
              <div className="h-100 d-flex flex-column justify-content-center">
                <h6 className="mb-3">Leyenda de Calidad:</h6>
                {aqiDistributionData
                  .filter(item => item.type === 'active')
                  .map((item, index) => (
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
                
                {aqiDistributionData.some(item => item.type === 'inactive') && (
                  <div className="mt-3 pt-3 border-top">
                    <h6 className="mb-2">Estaciones Inactivas:</h6>
                    {aqiDistributionData
                      .filter(item => item.type === 'inactive')
                      .map((item, index) => (
                        <div key={index} className="d-flex align-items-center mb-2">
                          <div 
                            className="rounded-circle me-2" 
                            style={{ 
                              width: '12px', 
                              height: '12px', 
                              backgroundColor: item.color,
                              opacity: 0.6
                            }}
                          />
                          <span className="small" style={smallTextStyle}>
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 15 ESTACIONES (SOLO ACTIVAS) */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <FaAngleRight /> Top 15 Estaciones Activas - Por Contaminante Predominante
          </h5>
        </div>
        <div className="card-body">
          {/* DIV SOLO PARA EL GRÁFICO con altura fija */}
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
                    value: `Concentración (ICA)`, 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10,
                    style: smallLabelStyle
                  }}
                  tick={smallTickStyle}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === 'concentration') {
                      const pollutant = props.payload.pollutant;
                      const quality = props.payload.quality;
                      return [
                        <div key="tooltip">
                          <div><strong>{value} ICA</strong></div>
                          <div>Contaminante: {pollutant}</div>
                          <div>Calidad: {quality}</div>
                        </div>,
                        'Información'
                      ];
                    }
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
                <Bar 
                  dataKey="concentration" 
                  name="Concentración (ICA)"
                >
                  {topStationsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div> {/* CIERRA EL DIV DEL GRÁFICO */}
          
          {/* LEYENDA PERSONALIZADA - FUERA del div con altura fija */}
          <div className="mt-3">
            <div className="fw-medium mb-2 small">🎨 Leyenda de Contaminantes:</div>
            <div className="d-flex flex-wrap gap-3">
              {Object.entries(POLLUTANT_COLORS)
                .filter(([poll]) => topStationsData.some(item => item.pollutant === poll))
                .map(([pollutant, color]) => (
                  <div key={pollutant} className="d-flex align-items-center">
                    <div 
                      className="rounded-circle me-2" 
                      style={{ 
                        width: '12px', 
                        height: '12px', 
                        backgroundColor: color 
                      }}
                    />
                    <span className="small">{pollutant}</span>
                  </div>
                ))
              }
              {topStationsData.some(item => item.pollutant === 'No definido') && (
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded-circle me-2" 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: '#95a5a6' 
                    }}
                  />
                  <span className="small">No definido</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 small text-muted text-center" style={smallTextStyle}>
            Muestra las 15 estaciones <strong>activas</strong> con mayor concentración. 
            Los datos son Índices de Calidad del Aire (ICA) del MITECO.
          </div>
        </div>
      </div>

      {/* RELACIÓN CONCENTRACIÓN vs AQI Y DISTRIBUCIÓN POR TIPO */}
      <div className="row">
        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0"><FaAngleRight /> Concentración vs Índice AQI (Activas)</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name="Concentración" 
                      unit=" ICA"
                      domain={[0, 'dataMax + 5']}
                      tick={smallTickStyle}
                      label={{ 
                        value: 'Concentración (ICA)', 
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
                        if (name === 'x') return [`${value} ICA`, 'Concentración'];
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
                      name="Estaciones Activas" 
                      data={scatterData} 
                      fill="#00A2E8"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 small text-muted" style={smallTextStyle}>
                Relación entre concentración de {pollutant === 'SIN_CONTAMINANTE' ? 'contaminante' : pollutant} y el Índice de Calidad del Aire (AQI).
                Solo incluye estaciones activas con datos válidos.
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0"><FaAngleRight /> Distribución por Tipo de Estación</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationTypeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="description" 
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
                      labelFormatter={(label) => `Tipo: ${label}`}
                      contentStyle={smallTextStyle}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Estaciones" 
                      fill="#82ca9d"
                    >
                      {stationTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3">
                <h6>Tipos de Estación:</h6>
                <div className="row small text-muted">
                  {stationTypeDistribution.map((item, index) => {
                    const colors = ['text-primary', 'text-success', 'text-warning', 'text-info'];
                    const colorClass = colors[index % colors.length];
                    
                    return (
                      <div className="col-6" key={item.name}>
                        <div className="d-flex align-items-center mb-1">
                          <FaMapMarkerAlt className={`me-2 ${colorClass}`} />
                          <span style={smallTextStyle}>
                            {item.description}: {item.value} estaciones
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DEL CONTAMINANTE (ACTUALIZADA) */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0"><FaInfo /> Información sobre {pollutant === 'SIN_CONTAMINANTE' ? 'estaciones sin contaminante específico' : pollutant}</h5>
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
                {pollutant === 'SIN_CONTAMINANTE' && 'Estaciones de medición que no reportan un contaminante específico en la última medición. Pueden estar en mantenimiento, calibración o tener datos temporales no asignados.'}
              </p>
            </div>
            <div className="col-md-6">
              <h6><FaAngleRight /> Datos del MITECO:</h6>
              <ul className="small">
                <li>Fuente: Índice Nacional de Calidad del Aire</li>
                <li>Actualización: Horaria</li>
                <li>Unidad: ICA (Índice de Calidad del Aire 1-6)</li>
                <li>Total estaciones: {data.length}</li>
                <li>Estaciones activas: {activeStations}</li>
                <li>Con datos válidos: {stationsWithValidData}</li>
              </ul>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-12">
              <div className="alert alert-info small">
                <strong>📊 Nota sobre los datos:</strong> 
                {pollutant === 'SIN_CONTAMINANTE' 
                  ? ' Las estaciones sin contaminante específico pueden estar en proceso de calibración, mantenimiento o pueden no haber registrado datos en la última medición horaria.'
                  : ' Los datos ICA (1-6) se convierten a AQI (1-5) para la visualización. ICA 6 (Extremadamente desfavorable) se mapea a AQI 5 (Extremadamente Mala).'
                }
                <br />
                <small className="text-muted">Fuente: Ministerio para la Transición Ecológica (MITECO)</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirQualityChart;