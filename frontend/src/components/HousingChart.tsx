// frontend/src/components/HousingChart.tsx
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart,
  Scatter, ZAxis, Cell, Legend
} from 'recharts';
import {
  FaHome, FaChartLine, FaCity, FaCalendarAlt, FaAngleRight, FaInfo
} from 'react-icons/fa';
import { HousingData } from './types';

interface HousingChartProps {
  data: HousingData[];
  metric: string;
  housingType: string;
  ccaa: string;
}

// ============= TIPOS =============
interface EvolutionByTypeData {
  periodo: string;
  General?: number;
  Nueva?: number;
  Usada?: number;
}

interface BrechaData {
  periodo: string;
  brechaPercentaje: number;
  participacionNueva: number;
}

const HousingChart = ({ data, metric, housingType, ccaa }: HousingChartProps) => {
  const [tiposData, setTiposData] = useState<HousingData[]>([]);
  const [brechaDataChart, setBrechaDataChart] = useState<BrechaData[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(false);

  // ============= COLORES =============
  const METRIC_COLORS: Record<string, string> = {
    indice: '#3498db',
    var_anual: '#e74c3c',
    var_trimestral: '#2ecc71',
    var_ytd: '#e67e22',
  };

  const HOUSING_TYPE_COLORS: Record<string, string> = {
    General: '#3498db',
    Nueva: '#9b59b6',
    Usada: '#1abc9c',
  };

  // ============= CARGAR DATOS DE LOS 3 TIPOS =============
  useEffect(() => {
    const loadAllTypes = async () => {
      setLoadingTipos(true);
      try {
        const types = ['general', 'nueva', 'segunda_mano'];
        const ccaaParam = ccaa === '00' ? '00' : ccaa;
        
        const promises = types.map(tipo =>
          fetch(
            `http://localhost:8180/api/housing/data?metric=${metric}&housing_type=${tipo}&ccaa=${ccaaParam}&limit=5000`
          )
            .then(res => res.json())
            .then(json => json.data || [])
            .catch(() => [])
        );

        const results = await Promise.all(promises);
        const combined = results.flat();
        setTiposData(combined);

        // Calcular brecha
        calculateBrecha(combined);
      } catch (error) {
        console.error('Error cargando tipos:', error);
      } finally {
        setLoadingTipos(false);
      }
    };

    loadAllTypes();
  }, [metric, ccaa]);

  // ============= CALCULAR BRECHA NUEVA vs USADA =============
  const calculateBrecha = (allTypesData: HousingData[]) => {
    // Agrupar por período
    const byPeriodo = allTypesData.reduce((acc, item) => {
      if (!acc[item.periodo]) acc[item.periodo] = {};
      
      // Mapear tipo_vivienda a clave corta
      let tipoKey = '';
      if (item.tipo_vivienda === 'General') tipoKey = 'General';
      else if (item.tipo_vivienda.includes('nueva')) tipoKey = 'Nueva';
      else if (item.tipo_vivienda.includes('segunda mano')) tipoKey = 'Usada';
      
      if (tipoKey && item.valor !== null && item.valor !== undefined) {
        acc[item.periodo][tipoKey] = item.valor;
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Calcular brecha
    const brecha = Object.entries(byPeriodo)
      .filter(([_, valores]) => valores.Nueva && valores.Usada)
      .map(([periodo, valores]) => {
        const brechaPercentaje = ((valores.Nueva - valores.Usada) / valores.Usada) * 100;
        const participacionNueva = (valores.Nueva / (valores.Nueva + valores.Usada)) * 100;
        return {
          periodo,
          brechaPercentaje,
          participacionNueva,
        };
      })
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .slice(-8); // Últimos 8 trimestres

    setBrechaDataChart(brecha);
  };

  // ============= DATOS PARA GRÁFICOS =============
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No hay datos disponibles para mostrar gráficos.</p>
      </div>
    );
  }

  const dataWithValues = data.filter((item) => item.valor !== null && item.valor !== undefined);
  const valores = dataWithValues.map((item) => item.valor as number);

  const avgValor = valores.length > 0 ? valores.reduce((a, b) => a + b) / valores.length : 0;
  const maxValor = valores.length > 0 ? Math.max(...valores) : 0;
  const minValor = valores.length > 0 ? Math.min(...valores) : 0;
  
  // Contar CCAA: si estamos filtrando por una CCAA específica, mostrar 1, si no, contar todas menos la Nacional
  const uniqueCCAA = new Set(data.map((item) => item.ccaa_codigo)).size;
  const ccaaCount = ccaa === '00' ? uniqueCCAA - 1 : 1;
  
  const lastPeriod = data.length > 0 ? data[0].periodo : 'N/A';

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

  // 2. Top 10 CCAA
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

  // 3. Evolución de los 3 tipos (NACIONAL)
  const grouped = tiposData
    .reduce((acc: Record<string, Record<string, number>>, item) => {
      if (!acc[item.periodo]) acc[item.periodo] = {};
      
      let tipoKey = '';
      if (item.tipo_vivienda === 'General') tipoKey = 'General';
      else if (item.tipo_vivienda.includes('nueva')) tipoKey = 'Nueva';
      else if (item.tipo_vivienda.includes('segunda mano')) tipoKey = 'Usada';
      
      if (tipoKey && item.valor !== null) {
        acc[item.periodo][tipoKey] = item.valor;
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);

  const tiposEvolutionData: EvolutionByTypeData[] = Object.entries(grouped)
    .map(([periodo, valores]) => ({ periodo, ...valores }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .slice(-8);

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

  // ============= ESTILOS =============
  const smallTextStyle = { fontSize: '11px' };
  const smallLegendStyle = { fontSize: '12px' };
  const smallTickStyle = { fontSize: '11px', fill: '#666' };
  const smallLabelStyle = { fontSize: '11px' };

  // ============= HELPERS =============
  const getMetricLabel = () => {
    const labels: Record<string, string> = {
      indice: 'Índice de Precios',
      var_anual: 'Variación Anual (%)',
      var_trimestral: 'Variación Trimestral (%)',
      var_ytd: 'Variación YTD (%)',
    };
    return labels[metric] || 'Valor';
  };

  const getHousingTypeLabel = () => {
    const labels: Record<string, string> = {
      general: 'General',
      nueva: 'Vivienda Nueva',
      segunda_mano: 'Vivienda de Segunda Mano',
    };
    return labels[housingType] || housingType;
  };

  const getCCAALabel = () => ccaa === '00' ? 'Nacional' : `CCAA ${ccaa}`;

  // ============= RENDER =============
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
                <XAxis dataKey="fecha" tick={smallTickStyle} angle={-45} textAnchor="end" height={40} />
                <YAxis
                  tick={smallTickStyle}
                  label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', style: smallLabelStyle }}
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

      {/* TOP 10 CCAA Y EVOLUCIÓN POR TIPO */}
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
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={40} tick={smallTickStyle} />
                    <YAxis
                      tick={smallTickStyle}
                      label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', style: smallLabelStyle }}
                    />
                    <Tooltip
                      formatter={(value) => [
                        metric === 'indice' ? `${value}` : `${value}%`,
                        getMetricLabel(),
                      ]}
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
              <div className="mt-3" style={smallLegendStyle}>
                <div className="d-flex justify-content-between">
                  <div className="d-flex align-items-center" >
                    <div style={{ width: '16px', height: '16px', backgroundColor: '#e74c3c', marginRight: '8px' }}></div>
                    <span>Por encima del promedio</span>
                  </div>
                  <div className="d-flex align-items-center">
                    <div style={{ width: '16px', height: '16px', backgroundColor: '#2ecc71', marginRight: '8px' }}></div>
                    <span>Por debajo del promedio</span>
                  </div>
                </div>
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
              {loadingTipos ? (
                <div className="text-center py-5 text-muted">
                  <p>Cargando datos de tipos...</p>
                </div>
              ) : tiposEvolutionData.length > 0 ? (
                <>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tiposEvolutionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="periodo" tick={smallTickStyle} angle={-45} textAnchor="end" height={40} />
                        <YAxis
                          tick={smallTickStyle}
                          label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft', style: smallLabelStyle }}
                        />
                        <Tooltip
                          formatter={(value) => [
                            metric === 'indice' ? `${value}` : `${value}%`,
                            getMetricLabel(),
                          ]}
                          contentStyle={smallTextStyle}
                        />
                        <Legend 
                          wrapperStyle={{
                            ...smallTextStyle,
                            //marginTop: '30px',  // ← Esto separa la leyenda del gráfico
                            paddingTop: '20px', // ← Espacio interno superior
                          }}
                        /> 
                            
                        {tiposEvolutionData.some((d) => d.General !== undefined) && (
                          <Line type="monotone" dataKey="General" stroke={HOUSING_TYPE_COLORS.General} strokeWidth={2} dot={{ r: 3 }} />
                        )}
                        {tiposEvolutionData.some((d) => d.Nueva !== undefined) && (
                          <Line type="monotone" dataKey="Nueva" stroke={HOUSING_TYPE_COLORS.Nueva} strokeWidth={2} dot={{ r: 3 }} />
                        )}
                        {tiposEvolutionData.some((d) => d.Usada !== undefined) && (
                          <Line type="monotone" dataKey="Usada" stroke={HOUSING_TYPE_COLORS.Usada} strokeWidth={2} dot={{ r: 3 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No hay datos de evolución por tipo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BRECHA NUEVA vs USADA Y SCATTER PLOT */}
      <div className="row">
        <div className="col-md-6">
          <div className="card shadow border-primary mb-4 bg-body">
            <div className="card-header bg-light">
              <h5 className="mb-0">
                <FaAngleRight /> Brecha Nueva vs Usada (Últimos 8 Trimestres)
              </h5>
            </div>
            <div className="card-body">
              {brechaDataChart.length > 0 ? (
                <>
                  <div style={{ height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={brechaDataChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="periodo" tick={smallTickStyle} angle={-45} textAnchor="end" height={40} />
                        <YAxis
                          tick={smallTickStyle}
                          label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft', style: smallLabelStyle }}
                        />
                        <Tooltip
                          formatter={(value) => `${(value as number).toFixed(2)}%`}
                          contentStyle={smallTextStyle}
                        />
                        <Legend 
                          wrapperStyle={{
                            ...smallTextStyle,
                            //marginTop: '30px',  // ← Esto separa la leyenda del gráfico
                            paddingTop: '20px', // ← Espacio interno superior
                          }}
                        />  
                        <Line
                          type="monotone"
                          dataKey="brechaPercentaje"
                          stroke="#e74c3c"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="% Nueva más cara que Usada"
                        />
                        <Line
                          type="monotone"
                          dataKey="participacionNueva"
                          stroke="#9b59b6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          name="% Participación Nueva"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p>No hay datos de brecha disponibles.</p>
                </div>
              )}
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
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Valor"
                        tick={smallTickStyle}
                        label={{ value: getMetricLabel(), position: 'bottom', style: smallLabelStyle }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Variación estimada"
                        tick={smallTickStyle}
                        label={{ value: 'Var. estimada (%)', angle: -90, position: 'insideLeft', style: smallLabelStyle }}
                      />
                      <ZAxis type="number" dataKey="z" range={[60, 400]} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'x') return [metric === 'indice' ? `${value}` : `${value}%`, getMetricLabel()];
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

      {/* INFO DEL DATASET */}
      <div className="card shadow border-primary mb-4 bg-body">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <FaInfo /> Información del Dataset
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6><FaAngleRight /> Fuente de Datos:</h6>
              <ul className="small">
                <li><strong>Fuente:</strong> Instituto Nacional de Estadística (INE)</li>
                <li><strong>Dataset:</strong> Índice de Precios de Vivienda (IPV)</li>
                <li><strong>Base de referencia:</strong> 2015 = 100</li>
                <li><strong>Periodicidad:</strong> Trimestral</li>
                <li><strong>Cobertura:</strong> Nacional y por CCAA</li>
                <li><strong>Tipos de vivienda:</strong> General, Nueva, Segunda Mano</li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6><FaAngleRight /> Métricas Disponibles:</h6>
              <ul className="small">
                <li><strong>Índice:</strong> Precio base 2015=100</li>
                <li><strong>Variación anual:</strong> Cambio respecto al mismo trimestre del año anterior</li>
                <li><strong>Variación trimestral:</strong> Cambio respecto al trimestre anterior</li>
                <li><strong>Variación YTD:</strong> Cambio acumulado en el año</li>
                <li><strong>Periodo:</strong> 2007-T1 a {lastPeriod}</li>
                <li><strong>Unidad:</strong> {metric === 'indice' ? 'Índice (2015=100)' : 'Porcentaje (%)'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HousingChart;