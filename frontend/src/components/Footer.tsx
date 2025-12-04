// src/components/Footer.tsx
interface FooterProps {
  dataCount?: number;
}

const Footer = ({ dataCount = 0 }: FooterProps) => {
  return (
    <div className="row mt-4">
      <div className="col-12">
        <footer className="p-4 bg-body-tertiary rounded border">
          <div className="row align-items-center">
            <div className="col-md-8 mb-3 mb-md-0">
              <h3 className="h5 fw-bold">🚀 Geo-Data Analytics</h3>
              <p className="text-muted mb-0">
                Frontend: React + Leaflet Vanilla + Recharts<br />
                Backend: FastAPI (Python) + SQLAlchemy + PostgreSQL/PostGIS<br />
                Datos: {dataCount.toLocaleString()} registros cargados
              </p>
            </div>
            <div className="col-md-4">
              <div className="d-flex flex-column flex-sm-row gap-2 justify-content-md-end">
                <a
                  href="http://localhost:8180/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary"
                >
                  🌐 Backend API
                </a>
                <a
                  href="http://localhost:8180/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary"
                >
                  📚 Swagger UI
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Footer;