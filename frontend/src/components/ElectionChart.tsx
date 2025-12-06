// /home/bbvedf/prog/geo-data/frontend/src/components/ElectionChart.tsx
import { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ElectionData {
  nombre_municipio: string;
  nombre_provincia: string;
  nombre_comunidad: string;
  poblacion: number;
  participacion: number;
  partido_ganador: string;
  votos_ganador: number;
  pp: number;
  psoe: number;
  vox: number;
  sumar: number;
  erc: number;
  jxcat_junts?: number;
  eh_bildu?: number;
  eaj_pnv?: number;
  bng?: number;
}

interface ElectionChartProps {
  data: ElectionData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57', '#FFC658'];

const partyColors: Record<string, string> = {
  'PP': '#0056A8',
  'PSOE': '#E30613',
  'VOX': '#63BE21',
  'SUMAR': '#EA5F94',
  'ERC': '#FFB232',
  'JXCAT': '#FFD100',
  'EH_BILDU': '#6DBE45',
  'EAJ_PNV': '#008D3C',
  'BNG': '#6A3B8C',
  'CCA': '#FF7F00',
  'UPN': '#800080',
  'sin_datos': '#CCCCCC'
};

const ElectionChart = ({ data }: ElectionChartProps) => {
  // Memoizar cálculos pesados
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const totalMunicipios = data.length;
    const avgParticipacion = data.reduce((sum, item) => sum + (item.participacion || 0), 0) / totalMunicipios;
    
    // Distribución de partidos ganadores
    const ganadoresDist = data.reduce((acc: Record<string, number>, item) => {
      const partido = item.partido_ganador || 'sin_datos';
      acc[partido] = (acc[partido] || 0) + 1;
      return acc;
    }, {});

    const ganadoresChartData = Object.entries(ganadoresDist)
      .map(([partido, count]) => ({
        name: partido.toUpperCase(),
        value: count,
        porcentaje: ((count / totalMunicipios) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Participación por provincia (top 10)
    const participacionByProvincia = Object.entries(
      data.reduce((acc: Record<string, { total: number, count: number }>, item) => {
        const prov = item.nombre_provincia;
        if (!acc[prov]) {
          acc[prov] = { total: 0, count: 0 };
        }
        acc[prov].total += item.participacion || 0;
        acc[prov].count += 1;
        return acc;
      }, {})
    )
      .map(([provincia, { total, count }]) => ({
        provincia,
        participacion_media: (total / count).toFixed(1)
      }))
      .sort((a, b) => parseFloat(b.participacion_media) - parseFloat(a.participacion_media))
      .slice(0, 10);

    // Votos promedio por partido
    const partidosData = [
      { partido: 'PP', votos: data.reduce((sum, item) => sum + (item.pp || 0), 0) / totalMunicipios },
      { partido: 'PSOE', votos: data.reduce((sum, item) => sum + (item.psoe || 0), 0) / totalMunicipios },
      { partido: 'VOX', votos: data.reduce((sum, item) => sum + (item.vox || 0), 0) / totalMunicipios },
      { partido: 'SUMAR', votos: data.reduce((sum, item) => sum + (item.sumar || 0), 0) / totalMunicipios },
      { partido: 'ERC', votos: data.reduce((sum, item) => sum + (item.erc || 0), 0) / totalMunicipios },
    ].sort((a, b) => b.votos - a.votos);

    return {
      totalMunicipios,
      avgParticipacion,
      ganadoresChartData,
      participacionByProvincia,
      partidosData,
      ganadoresDist
    };
  }, [data]);

  if (!chartData) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No hay datos disponibles para mostrar gráficos.</p>
      </div>
    );
  }

  const { totalMunicipios, avgParticipacion, ganadoresChartData, participacionByProvincia, partidosData, ganadoresDist } = chartData;

  return (
    <div>
      {/* Estadísticas principales */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card border-primary">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">🏛️ Municipios</h5>
              <h2 className="text-primary">{totalMunicipios.toLocaleString()}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-success">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">🗳️ Participación Media</h5>
              <h2 className="text-success">{avgParticipacion.toFixed(1)}%</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-info">
            <div className="card-body text-center rounded-4 bg-body">
              <h5 className="card-title text-muted">🎯 Partidos Ganadores</h5>
              <h2 className="text-info">{Object.keys(ganadoresDist).length}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de distribución de partidos ganadores */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">🏆 Distribución de Partidos Ganadores</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ganadoresChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${entry.porcentaje}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {ganadoresChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={partyColors[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, _name: any, props: any) => [`${value} municipios (${props.payload.porcentaje}%)`, props.payload.name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">📊 Participación por Provincia (Top 10)</h5>
            </div>
            <div className="card-body">
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={participacionByProvincia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="provincia" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Participación']} />
                    <Legend />
                    <Bar dataKey="participacion_media" fill="#82ca9d" name="Participación (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de votos por partido */}
      <div className="card shadow mb-4">
        <div className="card-header bg-info text-white">
          <h5 className="mb-0">📈 Votos Promedio por Partido</h5>
        </div>
        <div className="card-body">
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partidosData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partido" />
                <YAxis label={{ value: 'Votos promedio', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => [`${Math.round(Number(value))}`, 'Votos']} />
                <Legend />
                <Bar dataKey="votos" name="Votos promedio">
                  {partidosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={partyColors[entry.partido] || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leyenda de colores */}
      <div className="card mt-4">
        <div className="card-body">
          <h6 className="mb-3">🎨 Leyenda de Partidos Políticos</h6>
          <div className="row">
            {Object.entries(partyColors).map(([partido, color]) => (
              <div key={partido} className="col-6 col-md-3 mb-2">
                <div className="d-flex align-items-center">
                  <div 
                    className="rounded me-2" 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: color 
                    }}
                  ></div>
                  <span className="small">{partido}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionChart;