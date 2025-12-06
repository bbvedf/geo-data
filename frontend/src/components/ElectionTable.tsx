// /home/bbvedf/prog/geo-data/frontend/src/components/ElectionTable.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FaSpinner, FaChevronDown, FaChevronUp, FaSearch } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface ElectionData {
  codigo_ine: string;
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
}

interface ElectionTableProps {
  // Opcional: si quieres pasar filtros desde el padre
}

const ITEMS_PER_PAGE = 50;

const partyColors: Record<string, string> = {
  'PP': '#0056A8',
  'PSOE': '#E30613',
  'VOX': '#63BE21',
  'SUMAR': '#EA5F94',
  'ERC': '#FFB232',
  'JXCAT_JUNTS': '#FFD100',
  'EH_BILDU': '#6DBE45',
  'EAJ_PNV': '#008D3C',
  'BNG': '#6A3B8C',
};

const partyTranslations: Record<string, string> = {
  'pp': 'PP',
  'psoe': 'PSOE',
  'vox': 'VOX',
  'sumar': 'SUMAR',
  'erc': 'ERC',
  'jxcat_junts': 'JxCat/Junts',
  'eh_bildu': 'EH Bildu',
  'eaj_pnv': 'EAJ-PNV',
  'bng': 'BNG',
  'sin_datos': 'Sin Datos'
};

export default function ElectionTable({}: ElectionTableProps) {
  const [data, setData] = useState<ElectionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<keyof ElectionData>('nombre_municipio');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar más datos
  const loadMoreData = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);

      // Cancelar peticiones anteriores
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await api.get('/api/elections/data', {
        params: {
          limit: ITEMS_PER_PAGE,
          offset: offset,
          light: false // Necesitamos datos completos para la tabla
        },
        signal: abortControllerRef.current.signal
      });

      const newData = response.data.data;
      
      setData(prev => [...prev, ...newData]);
      setTotal(response.data.total);
      setHasMore(response.data.has_more);
      setOffset(prev => prev + ITEMS_PER_PAGE);

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error cargando datos:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset]);

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreData();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadMoreData]);

  // Cargar datos iniciales
  useEffect(() => {
    loadMoreData();
  }, []);

  // Ordenar datos
  const handleSort = (field: keyof ElectionData) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);

    const sorted = [...data].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return newDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    setData(sorted);
  };

  // Filtrar por búsqueda local
  const filteredData = searchTerm
    ? data.filter(item => 
        item.nombre_municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nombre_provincia.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  const SortIcon = ({ field }: { field: keyof ElectionData }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FaChevronUp className="ms-1" /> : <FaChevronDown className="ms-1" />;
  };

  return (
    <div className="card shadow">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">📊 Datos Electorales - Tabla Completa</h5>
        <span className="badge bg-light text-dark">
          {data.length.toLocaleString()} de {total.toLocaleString()}
        </span>
      </div>

      <div className="card-body">
        {/* Búsqueda local */}
        <div className="mb-3">
          <div className="input-group">
            <span className="input-group-text">
              <FaSearch />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar municipio o provincia en datos cargados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <small className="text-muted">
              Mostrando {filteredData.length} de {data.length} resultados
            </small>
          )}
        </div>

        {/* Tabla con scroll horizontal */}
        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="table table-striped table-hover table-sm">
            <thead className="sticky-top bg-light">
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('nombre_municipio')}>
                  Municipio <SortIcon field="nombre_municipio" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('nombre_provincia')}>
                  Provincia <SortIcon field="nombre_provincia" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('poblacion')}>
                  Población <SortIcon field="poblacion" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('partido_ganador')}>
                  Ganador <SortIcon field="partido_ganador" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('votos_ganador')}>
                  Votos <SortIcon field="votos_ganador" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('participacion')}>
                  Participación <SortIcon field="participacion" />
                </th>
                <th>PP</th>
                <th>PSOE</th>
                <th>VOX</th>
                <th>SUMAR</th>
                <th>ERC</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={`${item.codigo_ine}-${index}`}>
                  <td className="fw-medium">{item.nombre_municipio}</td>
                  <td>{item.nombre_provincia}</td>
                  <td className="text-end">{item.poblacion?.toLocaleString() || '-'}</td>
                  <td>
                    <div className="d-flex align-items-center">
                      <div
                        className="rounded-circle me-2"
                        style={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: partyColors[item.partido_ganador] || '#666'
                        }}
                      ></div>
                      <span className="small">
                        {partyTranslations[item.partido_ganador] || item.partido_ganador}
                      </span>
                    </div>
                  </td>
                  <td className="text-end">{item.votos_ganador?.toLocaleString() || '-'}</td>
                  <td className="text-end">
                    <span className={`badge ${
                      item.participacion >= 75 ? 'bg-success' :
                      item.participacion >= 60 ? 'bg-warning' : 'bg-danger'
                    }`}>
                      {item.participacion?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-end small">{item.pp?.toLocaleString() || '-'}</td>
                  <td className="text-end small">{item.psoe?.toLocaleString() || '-'}</td>
                  <td className="text-end small">{item.vox?.toLocaleString() || '-'}</td>
                  <td className="text-end small">{item.sumar?.toLocaleString() || '-'}</td>
                  <td className="text-end small">{item.erc?.toLocaleString() || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sentinel para scroll infinito */}
          <div ref={observerTarget} className="text-center py-3">
            {loading && (
              <div>
                <FaSpinner className="fa-spin text-primary" size={24} />
                <p className="text-muted mt-2">Cargando más datos...</p>
              </div>
            )}
            {!loading && !hasMore && data.length > 0 && (
              <p className="text-muted">✅ Todos los datos cargados ({total.toLocaleString()} municipios)</p>
            )}
            {!loading && data.length === 0 && (
              <p className="text-muted">No hay datos que mostrar</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}