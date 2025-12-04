// src/components/DatasetNotFoundView.tsx
import { Link } from 'react-router-dom';

const DatasetNotFoundView = () => {
  return (
    <div className="card shadow">
      <div className="card-body text-center py-5">
        <h3 className="text-danger">⚠️ Dataset no encontrado</h3>
        <p className="text-muted mt-3">
          El dataset que buscas no está disponible o no existe.
        </p>
        <Link to="/" className="btn btn-primary mt-3">
          ← Volver al Dashboard
        </Link>
      </div>
    </div>
  );
};

export default DatasetNotFoundView;