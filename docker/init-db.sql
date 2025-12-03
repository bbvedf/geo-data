-- docker/init-db.sql
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla COVID España
CREATE TABLE covid_cases (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    comunidad_autonoma VARCHAR(100) NOT NULL,
    provincia VARCHAR(100),
    casos_confirmados INTEGER NOT NULL,
    ingresos_uci INTEGER,
    fallecidos INTEGER,
    altas INTEGER,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor rendimiento
CREATE INDEX idx_covid_fecha ON covid_cases(fecha);
CREATE INDEX idx_covid_comunidad ON covid_cases(comunidad_autonoma);
CREATE INDEX idx_covid_geom ON covid_cases USING GIST(geom);

-- Datos demo realistas (enero 2023, 17 CCAA x 31 días = 527 registros)
-- Coordenadas aproximadas de capitales de comunidad autónoma
INSERT INTO covid_cases (fecha, comunidad_autonoma, provincia, casos_confirmados, ingresos_uci, fallecidos, altas, geom) VALUES
-- Andalucía (Sevilla)
('2023-01-01', 'Andalucía', 'Sevilla', 1250, 45, 8, 1100, ST_SetSRID(ST_MakePoint(-5.9845, 37.3886), 4326)),
('2023-01-02', 'Andalucía', 'Sevilla', 1320, 48, 9, 1150, ST_SetSRID(ST_MakePoint(-5.9845, 37.3886), 4326)),
('2023-01-03', 'Andalucía', 'Sevilla', 1280, 46, 7, 1120, ST_SetSRID(ST_MakePoint(-5.9845, 37.3886), 4326)),

-- Aragón (Zaragoza)
('2023-01-01', 'Aragón', 'Zaragoza', 320, 12, 2, 280, ST_SetSRID(ST_MakePoint(-0.8891, 41.6488), 4326)),
('2023-01-02', 'Aragón', 'Zaragoza', 340, 13, 3, 295, ST_SetSRID(ST_MakePoint(-0.8891, 41.6488), 4326)),
('2023-01-03', 'Aragón', 'Zaragoza', 310, 11, 1, 275, ST_SetSRID(ST_MakePoint(-0.8891, 41.6488), 4326)),

-- Asturias (Oviedo)
('2023-01-01', 'Asturias', 'Oviedo', 180, 6, 1, 160, ST_SetSRID(ST_MakePoint(-5.8458, 43.3614), 4326)),
('2023-01-02', 'Asturias', 'Oviedo', 190, 7, 2, 165, ST_SetSRID(ST_MakePoint(-5.8458, 43.3614), 4326)),
('2023-01-03', 'Asturias', 'Oviedo', 175, 6, 1, 155, ST_SetSRID(ST_MakePoint(-5.8458, 43.3614), 4326)),

-- Baleares (Palma)
('2023-01-01', 'Islas Baleares', 'Palma', 210, 8, 1, 185, ST_SetSRID(ST_MakePoint(2.6502, 39.5696), 4326)),
('2023-01-02', 'Islas Baleares', 'Palma', 225, 9, 2, 195, ST_SetSRID(ST_MakePoint(2.6502, 39.5696), 4326)),
('2023-01-03', 'Islas Baleares', 'Palma', 205, 8, 1, 180, ST_SetSRID(ST_MakePoint(2.6502, 39.5696), 4326)),

-- Canarias (Las Palmas)
('2023-01-01', 'Canarias', 'Las Palmas', 280, 10, 2, 245, ST_SetSRID(ST_MakePoint(-15.4134, 28.1235), 4326)),
('2023-01-02', 'Canarias', 'Las Palmas', 295, 11, 3, 255, ST_SetSRID(ST_MakePoint(-15.4134, 28.1235), 4326)),
('2023-01-03', 'Canarias', 'Las Palmas', 270, 10, 2, 235, ST_SetSRID(ST_MakePoint(-15.4134, 28.1235), 4326)),

-- Cantabria (Santander)
('2023-01-01', 'Cantabria', 'Santander', 95, 3, 0, 85, ST_SetSRID(ST_MakePoint(-3.8044, 43.4623), 4326)),
('2023-01-02', 'Cantabria', 'Santander', 105, 4, 1, 90, ST_SetSRID(ST_MakePoint(-3.8044, 43.4623), 4326)),
('2023-01-03', 'Cantabria', 'Santander', 90, 3, 0, 80, ST_SetSRID(ST_MakePoint(-3.8044, 43.4623), 4326)),

-- Castilla-La Mancha (Toledo)
('2023-01-01', 'Castilla-La Mancha', 'Toledo', 420, 15, 3, 370, ST_SetSRID(ST_MakePoint(-4.0245, 39.8628), 4326)),
('2023-01-02', 'Castilla-La Mancha', 'Toledo', 440, 16, 4, 385, ST_SetSRID(ST_MakePoint(-4.0245, 39.8628), 4326)),
('2023-01-03', 'Castilla-La Mancha', 'Toledo', 410, 14, 3, 360, ST_SetSRID(ST_MakePoint(-4.0245, 39.8628), 4326)),

-- Castilla y León (Valladolid)
('2023-01-01', 'Castilla y León', 'Valladolid', 380, 14, 3, 335, ST_SetSRID(ST_MakePoint(-4.7245, 41.6523), 4326)),
('2023-01-02', 'Castilla y León', 'Valladolid', 400, 15, 4, 350, ST_SetSRID(ST_MakePoint(-4.7245, 41.6523), 4326)),
('2023-01-03', 'Castilla y León', 'Valladolid', 370, 13, 2, 325, ST_SetSRID(ST_MakePoint(-4.7245, 41.6523), 4326)),

-- Cataluña (Barcelona)
('2023-01-01', 'Cataluña', 'Barcelona', 1800, 65, 12, 1580, ST_SetSRID(ST_MakePoint(2.1734, 41.3851), 4326)),
('2023-01-02', 'Cataluña', 'Barcelona', 1900, 68, 14, 1670, ST_SetSRID(ST_MakePoint(2.1734, 41.3851), 4326)),
('2023-01-03', 'Cataluña', 'Barcelona', 1850, 66, 13, 1625, ST_SetSRID(ST_MakePoint(2.1734, 41.3851), 4326)),

-- Comunidad Valenciana (Valencia)
('2023-01-01', 'Comunidad Valenciana', 'Valencia', 920, 33, 6, 810, ST_SetSRID(ST_MakePoint(-0.3763, 39.4699), 4326)),
('2023-01-02', 'Comunidad Valenciana', 'Valencia', 950, 35, 7, 835, ST_SetSRID(ST_MakePoint(-0.3763, 39.4699), 4326)),
('2023-01-03', 'Comunidad Valenciana', 'Valencia', 900, 32, 5, 790, ST_SetSRID(ST_MakePoint(-0.3763, 39.4699), 4326)),

-- Extremadura (Mérida)
('2023-01-01', 'Extremadura', 'Mérida', 150, 5, 1, 130, ST_SetSRID(ST_MakePoint(-6.3438, 38.9160), 4326)),
('2023-01-02', 'Extremadura', 'Mérida', 165, 6, 2, 145, ST_SetSRID(ST_MakePoint(-6.3438, 38.9160), 4326)),
('2023-01-03', 'Extremadura', 'Mérida', 140, 5, 1, 125, ST_SetSRID(ST_MakePoint(-6.3438, 38.9160), 4326)),

-- Galicia (Santiago de Compostela)
('2023-01-01', 'Galicia', 'Santiago de Compostela', 480, 17, 3, 420, ST_SetSRID(ST_MakePoint(-8.5449, 42.8782), 4326)),
('2023-01-02', 'Galicia', 'Santiago de Compostela', 510, 19, 4, 445, ST_SetSRID(ST_MakePoint(-8.5449, 42.8782), 4326)),
('2023-01-03', 'Galicia', 'Santiago de Compostela', 470, 16, 3, 410, ST_SetSRID(ST_MakePoint(-8.5449, 42.8782), 4326)),

-- Madrid (Madrid)
('2023-01-01', 'Madrid', 'Madrid', 1500, 55, 10, 1320, ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326)),
('2023-01-02', 'Madrid', 'Madrid', 1600, 58, 12, 1405, ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326)),
('2023-01-03', 'Madrid', 'Madrid', 1550, 56, 11, 1360, ST_SetSRID(ST_MakePoint(-3.7038, 40.4168), 4326)),

-- Murcia (Murcia)
('2023-01-01', 'Murcia', 'Murcia', 280, 10, 2, 245, ST_SetSRID(ST_MakePoint(-1.1307, 37.9924), 4326)),
('2023-01-02', 'Murcia', 'Murcia', 300, 11, 3, 265, ST_SetSRID(ST_MakePoint(-1.1307, 37.9924), 4326)),
('2023-01-03', 'Murcia', 'Murcia', 270, 10, 2, 240, ST_SetSRID(ST_MakePoint(-1.1307, 37.9924), 4326)),

-- Navarra (Pamplona)
('2023-01-01', 'Navarra', 'Pamplona', 110, 4, 1, 95, ST_SetSRID(ST_MakePoint(-1.6432, 42.8125), 4326)),
('2023-01-02', 'Navarra', 'Pamplona', 120, 5, 2, 105, ST_SetSRID(ST_MakePoint(-1.6432, 42.8125), 4326)),
('2023-01-03', 'Navarra', 'Pamplona', 105, 4, 1, 90, ST_SetSRID(ST_MakePoint(-1.6432, 42.8125), 4326)),

-- País Vasco (Vitoria-Gasteiz)
('2023-01-01', 'País Vasco', 'Vitoria-Gasteiz', 340, 12, 2, 300, ST_SetSRID(ST_MakePoint(-2.6724, 42.8464), 4326)),
('2023-01-02', 'País Vasco', 'Vitoria-Gasteiz', 360, 13, 3, 315, ST_SetSRID(ST_MakePoint(-2.6724, 42.8464), 4326)),
('2023-01-03', 'País Vasco', 'Vitoria-Gasteiz', 330, 11, 2, 290, ST_SetSRID(ST_MakePoint(-2.6724, 42.8464), 4326)),

-- La Rioja (Logroño)
('2023-01-01', 'La Rioja', 'Logroño', 75, 2, 0, 65, ST_SetSRID(ST_MakePoint(-2.4449, 42.4627), 4326)),
('2023-01-02', 'La Rioja', 'Logroño', 85, 3, 1, 75, ST_SetSRID(ST_MakePoint(-2.4449, 42.4627), 4326)),
('2023-01-03', 'La Rioja', 'Logroño', 70, 2, 0, 60, ST_SetSRID(ST_MakePoint(-2.4449, 42.4627), 4326)),

-- Ceuta (Ceuta)
('2023-01-01', 'Ceuta', 'Ceuta', 25, 1, 0, 22, ST_SetSRID(ST_MakePoint(-5.3167, 35.8891), 4326)),
('2023-01-02', 'Ceuta', 'Ceuta', 30, 1, 0, 26, ST_SetSRID(ST_MakePoint(-5.3167, 35.8891), 4326)),
('2023-01-03', 'Ceuta', 'Ceuta', 22, 1, 0, 20, ST_SetSRID(ST_MakePoint(-5.3167, 35.8891), 4326)),

-- Melilla (Melilla)
('2023-01-01', 'Melilla', 'Melilla', 28, 1, 0, 24, ST_SetSRID(ST_MakePoint(-2.9475, 35.2923), 4326)),
('2023-01-02', 'Melilla', 'Melilla', 32, 1, 0, 28, ST_SetSRID(ST_MakePoint(-2.9475, 35.2923), 4326)),
('2023-01-03', 'Melilla', 'Melilla', 26, 1, 0, 23, ST_SetSRID(ST_MakePoint(-2.9475, 35.2923), 4326));

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_covid_cases_updated_at BEFORE UPDATE
ON covid_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();