// /home/bbvedf/prog/geo-data/frontend/src/components/ElectionPartyView.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSpinner } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const api = axios.create({
  baseURL: '/api/geo',
});

interface PartyResultsData {
  comunidad: string;
  total_municipios: number;
  total_votos: number;
  censo_comunidad: number;
  porcentaje_votos: number;
}

const partidos = [
  { value: 'pp', label: 'PP', color: '#0056A8' },
  { value: 'psoe', label: 'PSOE', color: '#E30613' },
  { value: 'vox', label: 'VOX', color: '#63BE21' },
  { value: 'sumar', label: 'SUMAR', color: '#EA5F94' },
  { value: 'erc', label: 'ERC', color: '#FFB232' },
  { value: 'jxcat_junts', label: 'JxCat/Junts', color: '#FFD100' },
  { value: 'eh_bildu', label: 'EH Bildu', color: '#6DBE45' },
  { value: 'eaj_pnv', label: 'EAJ-PNV', color: '#008D3C' },
  { value: 'bng', label: 'BNG', color: '#6A3B8C' },
  { value: 'cca', label: 'CCA', color: '#FF7F00' },
  { value: 'upn', label: 'UPN', color: '#800080' },
];

export default function ElectionPartyView() {
  const [selectedParty, setSelectedParty] = useState('pp');
  const [partyData, setPartyData] = useState<PartyResultsData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPartyData();
  }, [selectedParty]);

  const fetchPartyData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/elections/party/${selectedParty}`);
      setPartyData(response.data.data);
    } catch (error) {
      console.error('Error cargando datos del partido:', error);
      setPartyData([]);
    } finally {
      setLoading(false);
    }
  };

  const currentParty = partidos.find(p => p.value === selectedParty);
  const totalVotos = partyData.reduce((sum, item) => sum + item.total_votos, 0);
  const totalMunicipios = partyData.reduce((sum, item) => sum + item.total_municipios, 0);

  return (
    <div className="card shadow">
      <div className="card-header bg-light">
        <h5 className="mb-0">🎯 Análisis por Partido Político</h5>
      </div>

      <div className="card-body">
        {/* Selector de partido */}
        <div className="row mb-4">
          <div className="col-12">
            <label className="form-label fw-bold">Selecciona un partido:</label>
            <div className="d-flex flex-wrap gap-2">
              {partidos.map(partido => (
                <button
                  key={partido.value}
                  className={`btn ${selectedParty === partido.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSelectedParty(partido.value)}
                  style={selectedParty === partido.value ? {
                    backgroundColor: partido.color,
                    borderColor: partido.color
                  } : {}}
                >
                  {partido.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <FaSpinner className="fa-spin text-primary" size={48} />
            <p className="mt-3 text-muted">Cargando datos de {currentParty?.label}...</p>
          </div>
        ) : (
          <>
            {/* Estadísticas generales */}
            <div className="row mb-4">
              <div className="col-md-4">
                <div className="card border" style={{ borderColor: currentParty?.color }}>
                  <div className="card-body text-center">
                    <div className="text-muted small">Total Votos</div>
                    <div className="h3 mb-0" style={{ color: currentParty?.color }}>
                      {totalVotos.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border" style={{ borderColor: currentParty?.color }}>
                  <div className="card-body text-center">
                    <div className="text-muted small">Comunidades</div>
                    <div className="h3 mb-0" style={{ color: currentParty?.color }}>
                      {partyData.length}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border" style={{ borderColor: currentParty?.color }}>
                  <div className="card-body text-center">
                    <div className="text-muted small">Municipios</div>
                    <div className="h3 mb-0" style={{ color: currentParty?.color }}>
                      {totalMunicipios.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de votos por comunidad */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">📊 Votos por Comunidad Autónoma</h6>
              </div>
              <div className="card-body">
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={partyData} margin={{ bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="comunidad" 
                        angle={-45} 
                        textAnchor="end" 
                        height={100}
                        interval={0}
                      />
                      <YAxis label={{ value: 'Votos', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value: any) => [value.toLocaleString(), 'Votos']}
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="total_votos" 
                        fill={currentParty?.color || '#666'} 
                        name="Votos"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tabla de resultados */}
            <div className="card bg-body">
              <div className="card-header bg-light">
                <h6 className="mb-0">📋 Detalle por Comunidad</h6>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Comunidad Autónoma</th>
                        <th className="text-end">Municipios</th>
                        <th className="text-end">Total Votos</th>
                        <th className="text-end">% sobre válidos</th>
                        <th className="text-end">Censo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partyData.map((item, index) => (
                        <tr key={index}>
                          <td className="fw-medium">{item.comunidad}</td>
                          <td className="text-end">{item.total_municipios.toLocaleString()}</td>
                          <td className="text-end">
                            <span className="badge" style={{ 
                              backgroundColor: currentParty?.color,
                              color: 'white'
                            }}>
                              {item.total_votos.toLocaleString()}
                            </span>
                          </td>
                          <td className="text-end">{item.porcentaje_votos.toFixed(2)}%</td>
                          <td className="text-end text-muted small">
                            {item.censo_comunidad.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr className="fw-bold">
                        <td>TOTAL</td>
                        <td className="text-end">{totalMunicipios.toLocaleString()}</td>
                        <td className="text-end">
                          <span className="badge bg-dark">
                            {totalVotos.toLocaleString()}
                          </span>
                        </td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {partyData.length === 0 && (
              <div className="alert alert-warning">
                <strong>⚠️ Sin datos:</strong> No hay resultados para {currentParty?.label} en las comunidades.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}