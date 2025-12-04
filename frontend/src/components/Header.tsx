// src/components/Header.tsx
const Header = () => {
  return (
    <header className="bg-body-tertiary shadow-sm py-3 app-header">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-12 col-md-8">
            <h1 className="h2 mb-1">🌍 Geo-Data Analytics</h1>
            <p className="text-muted mb-0">Visualización geoespacial y análisis temporal</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;