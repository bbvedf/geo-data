// /home/bbvedf/prog/geo-data/frontend/src/components/CovidTable.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { FaSpinner, FaChevronDown, FaChevronUp, FaSearch } from 'react-icons/fa';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface CovidData {
  id: number;
  fecha: string;
  comunidad: string;
  provincia: string;
  casos: number;
  ingresos_uci?: number;
  fallecidos?: number;
  altas?: number;
  lat: number;
  lon: number;
}

const ITEMS_PER_PAGE = 50;

export default function CovidTable() {
  const [data, setData] = useState<CovidData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<keyof CovidData>('fecha');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadMoreData = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const response = await api.get('/api/covid/data', {
        params: {
          limit: ITEMS_PER_PAGE,
          offset: offset,
          light: false
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

  useEffect(() => {
    loadMoreData();
  }, []);

  const handleSort = (field: keyof CovidData) => {
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

  const filteredData = searchTerm
    ? data.filter(item => 
        item.comunidad.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.provincia && item.provincia.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.fecha.includes(searchTerm)
      )
    : data;

  const SortIcon = ({ field }: { field: keyof CovidData }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <FaChevronUp className="ms-1" /> : <FaChevronDown className="ms-1" />;
  };

  return (
    <div className="card shadow">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h5 className="mb-0">📊 Datos COVID - Tabla Completa</h5>
        <span className="badge bg-light text-dark">
          {data.length.toLocaleString()} de {total.toLocaleString()}
        </span>
      </div>

      <div className="card-body">
        <div className="mb-3">
          <div className="input-group">
            <span className="input-group-text">
              <FaSearch />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por comunidad, provincia o fecha..."
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

        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="table table-striped table-hover table-sm">
            <thead className="sticky-top bg-light">
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('fecha')}>
                  Fecha <SortIcon field="fecha" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('comunidad')}>
                  Comunidad <SortIcon field="comunidad" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('provincia')}>
                  Provincia <SortIcon field="provincia" />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('casos')}>
                  Casos <SortIcon field="casos" />
                </th>
                <th className="text-end">UCI</th>
                <th className="text-end">Fallecidos</th>
                <th className="text-end">Altas</th>
                <th>Coordenadas</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr key={`${item.id}-${index}`}>
                  <td>{item.fecha}</td>
                  <td className="fw-medium">{item.comunidad}</td>
                  <td>{item.provincia || '-'}</td>
                  <td className="text-end">
                    <span className="badge bg-primary">
                      {item.casos.toLocaleString()}
                    </span>
                  </td>
                  <td className="text-end small">{item.ingresos_uci?.toLocaleString() || '-'}</td>
                  <td className="text-end small text-danger">{item.fallecidos?.toLocaleString() || '-'}</td>
                  <td className="text-end small text-success">{item.altas?.toLocaleString() || '-'}</td>
                  <td className="text-muted small">
                    {item.lat?.toFixed(4)}, {item.lon?.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div ref={observerTarget} className="text-center py-3">
            {loading && (
              <div>
                <FaSpinner className="fa-spin text-primary" size={24} />
                <p className="text-muted mt-2">Cargando más datos...</p>
              </div>
            )}
            {!loading && !hasMore && data.length > 0 && (
              <p className="text-muted">✅ Todos los datos cargados ({total.toLocaleString()} registros)</p>
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