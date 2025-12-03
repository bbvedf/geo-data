# backend/scripts/generate_covid_data.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# Coordenadas aproximadas de capitales de comunidad autónoma
COMUNIDADES_COORDS = {
    "Andalucía": {"lat": 37.3886, "lon": -5.9845, "capital": "Sevilla"},
    "Aragón": {"lat": 41.6488, "lon": -0.8891, "capital": "Zaragoza"},
    "Asturias": {"lat": 43.3614, "lon": -5.8458, "capital": "Oviedo"},
    "Islas Baleares": {"lat": 39.5696, "lon": 2.6502, "capital": "Palma"},
    "Canarias": {"lat": 28.1235, "lon": -15.4134, "capital": "Las Palmas"},
    "Cantabria": {"lat": 43.4623, "lon": -3.8044, "capital": "Santander"},
    "Castilla-La Mancha": {"lat": 39.8628, "lon": -4.0245, "capital": "Toledo"},
    "Castilla y León": {"lat": 41.6523, "lon": -4.7245, "capital": "Valladolid"},
    "Cataluña": {"lat": 41.3851, "lon": 2.1734, "capital": "Barcelona"},
    "Comunidad Valenciana": {"lat": 39.4699, "lon": -0.3763, "capital": "Valencia"},
    "Extremadura": {"lat": 38.9160, "lon": -6.3438, "capital": "Mérida"},
    "Galicia": {"lat": 42.8782, "lon": -8.5449, "capital": "Santiago"},
    "Madrid": {"lat": 40.4168, "lon": -3.7038, "capital": "Madrid"},
    "Murcia": {"lat": 37.9924, "lon": -1.1307, "capital": "Murcia"},
    "Navarra": {"lat": 42.8125, "lon": -1.6432, "capital": "Pamplona"},
    "País Vasco": {"lat": 42.8464, "lon": -2.6724, "capital": "Vitoria"},
    "La Rioja": {"lat": 42.4627, "lon": -2.4449, "capital": "Logroño"},
    "Ceuta": {"lat": 35.8891, "lon": -5.3167, "capital": "Ceuta"},
    "Melilla": {"lat": 35.2923, "lon": -2.9475, "capital": "Melilla"}
}

# Población aproximada (en miles) para calcular casos
POBLACION = {
    "Andalucía": 8400, "Cataluña": 7600, "Comunidad Valenciana": 5000,
    "Madrid": 6600, "Galicia": 2700, "Castilla y León": 2400,
    "País Vasco": 2200, "Canarias": 2100, "Castilla-La Mancha": 2000,
    "Región de Murcia": 1500, "Aragón": 1300, "Islas Baleares": 1100,
    "Extremadura": 1100, "Principado de Asturias": 1000,
    "Navarra": 650, "Cantabria": 580, "La Rioja": 310,
    "Ceuta": 85, "Melilla": 85
}

def generate_covid_data(start_date="2023-01-01", days=90):
    """Genera datos COVID realistas para todas las comunidades"""
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    data = []
    
    for i in range(days):
        fecha = start + timedelta(days=i)
        
        for comunidad, coords in COMUNIDADES_COORDS.items():
            # Base de casos según población y tendencia
            poblacion = POBLACION.get(comunidad, 1000)
            base_casos = poblacion * 0.2  # 0.2% de la población como base
            
            # Variación aleatoria + tendencia temporal
            random_factor = random.uniform(0.8, 1.2)
            trend = 1 + (i / days) * 0.5  # Aumenta con el tiempo
            
            casos = int(base_casos * random_factor * trend)
            
            # Calcular otros metrics basados en casos
            ingresos_uci = int(casos * random.uniform(0.03, 0.06))  # 3-6% van a UCI
            fallecidos = int(casos * random.uniform(0.01, 0.03))    # 1-3% fallecen
            altas = int(casos * random.uniform(0.85, 0.95))         # 85-95% se recuperan
            
            data.append({
                "fecha": fecha.strftime("%Y-%m-%d"),
                "comunidad_autonoma": comunidad,
                "provincia": coords["capital"],
                "casos_confirmados": casos,
                "ingresos_uci": ingresos_uci,
                "fallecidos": fallecidos,
                "altas": altas,
                "lat": coords["lat"],
                "lon": coords["lon"]
            })
    
    return pd.DataFrame(data)

def generate_sql_inserts(df):
    """Genera sentencias SQL INSERT a partir del DataFrame"""
    
    sql_lines = []
    sql_lines.append("-- INSERT de datos COVID generados automáticamente")
    sql_lines.append("DELETE FROM covid_cases;  -- Borra datos existentes")
    sql_lines.append("")
    
    for _, row in df.iterrows():
        sql = f"""INSERT INTO covid_cases (fecha, comunidad_autonoma, provincia, casos_confirmados, ingresos_uci, fallecidos, altas, geom) VALUES (
    '{row['fecha']}',
    '{row['comunidad_autonoma']}',
    '{row['provincia']}',
    {row['casos_confirmados']},
    {row['ingresos_uci']},
    {row['fallecidos']},
    {row['altas']},
    ST_SetSRID(ST_MakePoint({row['lon']}, {row['lat']}), 4326)
);"""
        sql_lines.append(sql)
    
    return "\n".join(sql_lines)

if __name__ == "__main__":
    print("Generando datos COVID para España...")
    
    # Generar 90 días de datos (enero a marzo 2023)
    df = generate_covid_data("2023-01-01", 90)
    
    print(f"Datos generados: {len(df)} registros")
    print(f"Periodo: {df['fecha'].min()} a {df['fecha'].max()}")
    print(f"Comunidades: {df['comunidad_autonoma'].nunique()}")
    print(f"Casos totales: {df['casos_confirmados'].sum():,}")
    
    # Guardar como CSV
    df.to_csv("covid_data_spain.csv", index=False)
    print("\nDatos guardados en: covid_data_spain.csv")
    
    # Generar SQL
    sql_content = generate_sql_inserts(df)
    with open("covid_data_inserts.sql", "w", encoding="utf-8") as f:
        f.write(sql_content)
    print("SQL generado en: covid_data_inserts.sql")
    
    # Resumen por comunidad
    print("\n📊 Resumen por comunidad (primer día):")
    first_day = df[df['fecha'] == '2023-01-01']
    for _, row in first_day.sort_values('casos_confirmados', ascending=False).iterrows():
        print(f"  {row['comunidad_autonoma']:20} {row['casos_confirmados']:5} casos")