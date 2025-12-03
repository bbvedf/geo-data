-- docker/init-db.sql
-- Dataset demo: COVID por comunidades (datos reales simplificados)
CREATE TABLE IF NOT EXISTS covid_data (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    comunidad VARCHAR(100) NOT NULL,
    casos_totales INTEGER,
    hospitalizados INTEGER,
    uci INTEGER,
    fallecidos INTEGER,
    lat NUMERIC(10, 8),
    lon NUMERIC(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de ejemplo
INSERT INTO covid_data (fecha, comunidad, casos_totales, hospitalizados, uci, fallecidos, lat, lon) VALUES
('2023-01-01', 'Madrid', 1500, 120, 15, 8, 40.4168, -3.7038),
('2023-01-01', 'Cataluña', 1800, 150, 20, 10, 41.3851, 2.1734),
('2023-01-02', 'Madrid', 1600, 130, 16, 9, 40.4168, -3.7038),
('2023-01-02', 'Cataluña', 1900, 160, 22, 11, 41.3851, 2.1734);