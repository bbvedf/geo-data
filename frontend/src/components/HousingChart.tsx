// frontend/src/components/HousingChart.tsx
// Pestaña "chart"
// frontend/src/components/HousingChart.tsx
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import {
  FaHome,
  FaChartLine,
  FaCity,
  FaCalendarAlt,
  FaAngleRight,
  FaInfo,
  //FaArrowUp,
  //FaArrowDown,
} from 'react-icons/fa';
import { HousingData } from './types';

interface HousingChartProps {
  data: HousingData[];
  metric: string;
  housingType: string;
  ccaa: string;
}

const HousingChart = ({ data, metric, housingType, ccaa }: HousingChartProps) => {
  // Colores para métricas
  const METRIC_COLORS: Record<string, string> = {
    indice: '#3498db',
    var_anual: '#e74c3c',
    var_trimestral: '#2ecc71',
    var_ytd: '#e67e22',
  };

  // Colores para tipos de vivienda
  const HOUSING_TYPE_COLORS: Record<string, string> = {
    general: '#3498db',
    nueva: '#9b59b6',
    segunda_mano: '#1abc9c',
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No hay datos disponibles para mostrar gráficos.</p>
      </div>
    );
  }

  // ============ CALCULAR ESTADÍSTICAS ============
  const dataWithValues = data.filter((item) => item.valor !== null && item.valor !== undefined);
  const valores = dataWithValues.map((item) => item.valor as number);

  const avgValor = valores.length > 0 ? valores.reduce((a, b) => a + b) / valores.length : 0;
  const maxValor = valores.length > 0 ? Math.max(...valores) : 0;
  const minValor = valores.length > 0 ? Math.min(...valores) : 0;

  const ccaaCount = new Set(data.map((item) => item.ccaa_codigo)).size - 1;
  const lastPeriod = data.length > 0 ? data[0].periodo : 'N/A';

  // ============ DATOS PARA GRÁFICOS ============

  // 1. Evolución temporal
  const evolutionData = [...dataWithValues]
    .filter((item) => (ccaa === '00' ? item.ccaa_codigo === '00' : item.ccaa_codigo === ccaa))
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .slice(-20)
    .map((item) => ({
      periodo: item.periodo,
      valor: item.valor,
      anio: item.anio,
      trimestre: item.trimestre,
      fecha: `${item.anio}-T${item.trimestre}`,
    }));

  // 2. Top 10 CCAA por valor
  const lastPeriodData = dataWithValues.reduce(
    (acc: Record<string, HousingData>, item) => {
      const existing = acc[item.ccaa_codigo];
      if (!existing || item.periodo > existing.periodo) {
        acc[item.ccaa_codigo] = item;
      }
      return acc;
    },
    {}
  );

  const topCCAAData = Object.values(lastPeriodData)
    .filter((item) => item.ccaa_codigo && item.ccaa_codigo !== '00')
    .sort((a, b) => (b.valor || 0) - (a.valor || 0))
    .slice(0, 10)
    .map((item) => ({
      nombre: item.ccaa_nombre,
      valor: item.valor,
      periodo: item.periodo,
      codigo: item.ccaa_codigo,
      color: (item.valor || 0) > avgValor ? '#e74c3c' : '#2ecc71',
    }));

  // 3. Evolución de los 3 tipos (últimos 8 trimestres, NACIONAL, ignorando filtro de tipo)
  const allTypesData = dataWithValues.filter((item) => item.ccaa_codigo === '00'); // Solo nacional, todos los tipos
  const tiposEvolutionData = [...allTypesData]
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .slice(-24) // Últimos 24 trimestres para asegurar que tenemos 8 de cada tipo
    .reduce(
      (acc: any[], item) => {
        const existing = acc.find((row) => row.periodo === item.periodo);
        if (existing) {
          existing[item.tipo_vivienda] = item.valor;
        } else {
          acc.push({
            periodo: item.periodo,
            [item.tipo_vivienda]: item.valor,
          });
        }
        return acc;
      },
      []
    )
    .slice(-8); // Últimos 8 periodos

  // 4. Scatter plot
  const scatterData = dataWithValues
    .filter((item) => item.ccaa_codigo && item.ccaa_codigo !== '00')
    .reduce(
      (acc: Record<string, { valor: number; periodo: string }>, item) => {
        if (!acc[item.ccaa_codigo] || item.periodo > acc[item.ccaa_codigo].periodo) {
          acc[item.ccaa_codigo] = { valor: item.valor || 0, periodo: item.periodo };
        }
        return acc;
      },
      {}
    );

  const scatterChartData = Object.entries(scatterData).map(([codigo, data]) => ({
    x: data.valor,
    y: Math.random() * 10 - 5,
    z: 100,
    nombre: codigo,
    color: data.valor > avgValor ? '#e74c3c' : '#2ecc71',
  }));

  // Estilos
  const smallTextStyle = { fontSize: '11px' };
  const smallTickStyle = { fontSize: '11px', fill: '#666' };
  const smallLabelStyle = { fontSize: '11px' };

  // Funciones helper
  const getMetricLabel = () => {
    switch (metric) {
      case 'indice':
        return 'Índice de Precios';
      case 'var_anual':
        return 'Variación Anual (%)';
      case 'var_trimestral':
        return 'Variación Trimestral (%)';
      case 'var_ytd':
        return 'Variación YTD (%)';
      default:
        return 'Valor';
    }
  };

  const getHousingTypeLabel = () => {
    switch (housingType) {
      case 'general':
        return 'General';
      case 'nueva':
        return 'Vivienda Nueva';
      case 'segunda_mano':
        return 'Vivienda de Segunda Mano';
      default:
        return housingType;
    }
  };

  const getCCAALabel = () => {
    if (ccaa === '00') return 'Nacional';
    return `CCAA ${ccaa}`;
  };

  return (
    <div>
      {/* ESTADÍSTICAS */}
      <div className="row mb-4">
        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaHome className="me-2" /> {getMetricLabel()}
              </h5>
              <h2 className="text-success">
                {metric === 'indice' ? avgValor.toFixed(1) : `${avgValor.toFixed(1)}%`}
              </h2>
              <small className="text-muted">Promedio {getCCAALabel()}</small>
              <div className="small text-muted mt-1">{getHousingTypeLabel()}</div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaChartLine className="me-2" /> Rango
              </h5>
              <h2 className="text-warning">
                {metric === 'indice'
                  ? `${minValor.toFixed(1)} - ${maxValor.toFixed(1)}`
                  : `${minValor.toFixed(1)}% - ${maxValor.toFixed(1)}%`}
              </h2>
              <small className="text-muted">Mínimo - Máximo</small>
              <div className="small text-muted mt-1">{dataWithValues.length} registros válidos</div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaCity className="me-2" /> CCAA
              </h5>
              <h2 className="text-primary">{ccaaCount}</h2>
              <small className="text-muted">Comunidades con datos</small>
              <div className="small text-muted mt-1">Último periodo: {lastPeriod}</div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-6">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">
                <FaCalendarAlt className="me-2" /> Periodo
              </h5>
              <h2 className="text-danger">
                {data.length > 0 ? `${data[0].anio}-${data[0].trimestre}` : 'N/A'}
              </h2>
              <small className="text-muted">Último disponible</small>
              <div className="small text-muted mt-1">{evolutionData.length} periodos mostrados</div>
            </div>
          </div>
        </div>
      </div>

      {/* EVOLUCIÓN TEMPORAL */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <FaAngleRight /> Evolución Temporal - {getCCAALabel()}
          </h5>
        </div>
        <div className="card-body">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="fecha"
                  tick={smallTickStyle}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  tick={smallTickStyle}
                  label={{
                    value: getMetricLabel(),
                    angle: -90,
                    position: 'insideLeft',
                    style: smallLabelStyle,
                  }}
                />
                <Tooltip
                  formatter={(value) => [
                    metric === 'indice' ? `${value}` : `${value}%`,
                    getMetricLabel(),
                  ]}
                  labelFormatter={(label) => `Periodo: ${label}`}
                  contentStyle={smallTextStyle}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke={METRIC_COLORS[metric]}
                  fill={`${METRIC_COLORS[metric]}20`}
                  name={getMetricLabel()}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP 10 CCAA Y DISTRIBUCIÓN POR TIPO */}
      <div className="row">
        <div className="col-md-8">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaAngleRight /> Top 10 CCAA - {getMetricLabel()} ({lastPeriod})
              </h5>
            </div>
            <div className="card-body">
              <div style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCCAAData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="nombre"
                      angle={-45}
                      textAnchor="end"
                      height={40}
                      tick={smallTickStyle}
                    />
                    <YAxis
                      tick={smallTickStyle}
                      label={{
                        value: getMetricLabel(),
                        angle: -90,
                        position: 'insideLeft',
                        style: smallLabelStyle,
                      }}
                    />
                    <Tooltip
                      formatter={(value, _name, props: any) => {
                        const periodo = props.payload.periodo;
                        return [
                          metric === 'indice' ? `${value}` : `${value}%`,
                          `Periodo: ${periodo}`,
                        ];
                      }}
                      labelFormatter={(label) => `CCAA: ${label}`}
                      contentStyle={smallTextStyle}
                    />
                    <Bar dataKey="valor" name={getMetricLabel()}>
                      {topCCAAData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div
                      className="color-square me-2"
                      style={{ backgroundColor: '#e74c3c' }}
                    ></div>
                    <span className="small">Por encima del promedio</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <div
                      className="color-square me-2"
                      style={{ backgroundColor: '#2ecc71' }}
                    ></div>
                    <span className="small">Por debajo del promedio</span>
                  </div>
                </div>
                <style>{`.color-square { width: 16px; height: 16px; border: 1px solid #666; }`}</style>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaAngleRight /> Evolución por Tipo (Últimos 8 Trimestres)
              </h5>
            </div>
            <div className="card-body">
              {tiposEvolutionData.length > 0 ? (
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tiposEvolutionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="periodo"
                        tick={smallTickStyle}
                        angle={-45}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        tick={smallTickStyle}
                        label={{
                          value: getMetricLabel(),
                          angle: -90,
                          position: 'insideLeft',
                          style: smallLabelStyle,
                        }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          metric === 'indice' ? `${value}` : `${value}%`,
                          getMetricLabel(),
                        ]}
                        contentStyle={smallTextStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="General"
                        stroke={HOUSING_TYPE_COLORS['general']}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="General"
                      />
                      <Line
                        type="monotone"
                        dataKey="Vivienda nueva"
                        stroke={HOUSING_TYPE_COLORS['nueva']}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Vivienda Nueva"
                      />
                      <Line
                        type="monotone"
                        dataKey="Vivienda segunda mano"
                        stroke={HOUSING_TYPE_COLORS['segunda_mano']}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Segunda Mano"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No hay datos de evolución por tipo.</p>
                </div>
              )}
              <div className="mt-3 small">
                <div className="d-flex gap-3">
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '3px',
                        height: '20px',
                        backgroundColor: HOUSING_TYPE_COLORS['general'],
                        marginRight: '8px',
                      }}
                    ></div>
                    <span>General</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '3px',
                        height: '20px',
                        backgroundColor: HOUSING_TYPE_COLORS['nueva'],
                        marginRight: '8px',
                      }}
                    ></div>
                    <span>Nueva</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '3px',
                        height: '20px',
                        backgroundColor: HOUSING_TYPE_COLORS['segunda_mano'],
                        marginRight: '8px',
                      }}
                    ></div>
                    <span>Segunda Mano</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EVOLUCIÓN POR TIPO Y SCATTER PLOT */}
      <div className="row">
        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaAngleRight /> Evolución por Tipo (Últimos 8 Trimestres - Nacional)
              </h5>
            </div>
            <div className="card-body">
              {tiposEvolutionData.length > 0 ? (
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tiposEvolutionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="periodo"
                        tick={smallTickStyle}
                        angle={-45}
                        textAnchor="end"
                        height={40}
                      />
                      <YAxis
                        tick={smallTickStyle}
                        label={{
                          value: getMetricLabel(),
                          angle: -90,
                          position: 'insideLeft',
                          style: smallLabelStyle,
                        }}
                      />
                      <Tooltip
                        formatter={(value) => [
                          metric === 'indice' ? `${value}` : `${value}%`,
                          getMetricLabel(),
                        ]}
                        contentStyle={smallTextStyle}
                      />
                      {tiposEvolutionData.some((d: any) => d['General'] !== undefined) && (
                        <Line
                          type="monotone"
                          dataKey="General"
                          stroke={HOUSING_TYPE_COLORS['general']}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="General"
                        />
                      )}
                      {tiposEvolutionData.some((d: any) => d['Vivienda nueva'] !== undefined) && (
                        <Line
                          type="monotone"
                          dataKey="Vivienda nueva"
                          stroke={HOUSING_TYPE_COLORS['nueva']}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Vivienda Nueva"
                        />
                      )}
                      {tiposEvolutionData.some((d: any) => d['Vivienda segunda mano'] !== undefined) && (
                        <Line
                          type="monotone"
                          dataKey="Vivienda segunda mano"
                          stroke={HOUSING_TYPE_COLORS['segunda_mano']}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="Segunda Mano"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No hay datos de evolución por tipo.</p>
                </div>
              )}
              <div className="mt-3 small">
                <div className="d-flex gap-3 flex-wrap">
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '3px',
                        height: '20px',
                        backgroundColor: HOUSING_TYPE_COLORS['general'],
                        marginRight: '8px',
                      }}
                    ></div>
                    <span>General</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '3px',
                        height: '20px',
                        backgroundColor: HOUSING_TYPE_COLORS['nueva'],
                        marginRight: '8px',
                      }}
                    ></div>
                    <span>Nueva</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '3px',
                        height: '20px',
                        backgroundColor: HOUSING_TYPE_COLORS['segunda_mano'],
                        marginRight: '8px',
                      }}
                    ></div>
                    <span>Segunda Mano</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaAngleRight /> Distribución por CCAA (Scatter)
              </h5>
            </div>
            <div className="card-body">
              {scatterChartData.length > 0 ? (
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Valor"
                        tick={smallTickStyle}
                        label={{
                          value: getMetricLabel(),
                          position: 'bottom',
                          style: smallLabelStyle,
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Variación estimada"
                        tick={smallTickStyle}
                        label={{
                          value: 'Var. estimada (%)',
                          angle: -90,
                          position: 'insideLeft',
                          style: smallLabelStyle,
                        }}
                      />
                      <ZAxis type="number" dataKey="z" range={[60, 400]} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'x')
                            return [
                              metric === 'indice' ? `${value}` : `${value}%`,
                              getMetricLabel(),
                            ];
                          if (name === 'y') return [`${value}%`, 'Variación estimada'];
                          return [value, name];
                        }}
                        contentStyle={smallTextStyle}
                      />
                      <Scatter data={scatterChartData} fill="#8884d8">
                        {scatterChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No hay datos CCAA para mostrar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DEL DATASET */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <FaInfo /> Información del Dataset
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6>
                <FaAngleRight /> Fuente de Datos:
              </h6>
              <ul className="small">
                <li>
                  <strong>Fuente:</strong> Instituto Nacional de Estadística (INE)
                </li>
                <li>
                  <strong>Dataset:</strong> Índice de Precios de Vivienda (IPV)
                </li>
                <li>
                  <strong>Base de referencia:</strong> 2015 = 100
                </li>
                <li>
                  <strong>Periodicidad:</strong> Trimestral
                </li>
                <li>
                  <strong>Cobertura:</strong> Nacional y por CCAA
                </li>
                <li>
                  <strong>Tipos de vivienda:</strong> General, Nueva, Segunda Mano
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6>
                <FaAngleRight /> Métricas Disponibles:
              </h6>
              <ul className="small">
                <li>
                  <strong>Índice:</strong> Precio base 2015=100
                </li>
                <li>
                  <strong>Variación anual:</strong> Cambio respecto al mismo trimestre del año anterior
                </li>
                <li>
                  <strong>Variación trimestral:</strong> Cambio respecto al trimestre anterior
                </li>
                <li>
                  <strong>Variación YTD:</strong> Cambio acumulado en el año
                </li>
                <li>
                  <strong>Periodo:</strong> 2007-T1 a {lastPeriod}
                </li>
                <li>
                  <strong>Unidad:</strong>{' '}
                  {metric === 'indice' ? 'Índice (2015=100)' : 'Porcentaje (%)'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HousingChart;