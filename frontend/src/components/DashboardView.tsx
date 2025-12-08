// src/components/DashboardView.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Footer from './Footer';

const api = axios.create({
  baseURL: 'http://localhost:8180',
});

interface Dataset {
  id: string;
  name: string;
  type: string;
}

const DashboardView = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await api.get('/api/datasets');
        setDatasets(response.data.datasets);
      } catch (err) {
        setError('Error al cargar los datasets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  if (loading) {
    return (
      <div className="card shadow">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando datasets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card shadow">
        <div className="card-body">
          <div className="alert alert-danger">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow">
      <div className="card-body">
        <h2 className="card-title mb-4">📊 Datasets Disponibles</h2>
        <p className="text-muted mb-4">Selecciona un dataset para explorar</p>
        
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="col">
              <div className="card h-100 border-primary">
                <div className="card-body rounded-4 bg-body">
                  <h5 className="card-title">
                    {dataset.type === 'geo-temporal' ? '🗺️📈 ' : '🗺️ '}
                    {dataset.name}
                  </h5>
                  <p className="card-text">
                    <small className="text-muted">ID: {dataset.id}</small><br/>
                    <small className="text-muted">Tipo: {dataset.type}</small>
                  </p>
                </div>
                <div className="card-footer bg-transparent border-top-0">
                  <Link 
                    to={`/dataset/${dataset.id}`} 
                    className="btn btn-primary w-100"
                  >
                    Explorar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    <div className="card-body">
        <Footer />
    </div>
    </div>    
  );
};

export default DashboardView;