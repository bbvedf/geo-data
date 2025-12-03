# backend/scripts/generate_covid_data_provincias.py
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json

# Coordenadas de capitales de provincia
PROVINCIAS_COORDS = [
    # Andalucía
    {"provincia": "Almería", "comunidad": "Andalucía", "lat": 36.8402, "lon": -2.4679, "poblacion": 727},
    {"provincia": "Cádiz", "comunidad": "Andalucía", "lat": 36.5298, "lon": -6.2926, "poblacion": 1240},
    {"provincia": "Córdoba", "comunidad": "Andalucía", "lat": 37.8845, "lon": -4.7794, "poblacion": 785},
    {"provincia": "Granada", "comunidad": "Andalucía", "lat": 37.1773, "lon": -3.5986, "poblacion": 921},
    {"provincia": "Huelva", "comunidad": "Andalucía", "lat": 37.2614, "lon": -6.9447, "poblacion": 525},
    {"provincia": "Jaén", "comunidad": "Andalucía", "lat": 37.7796, "lon": -3.7849, "poblacion": 631},
    {"provincia": "Málaga", "comunidad": "Andalucía", "lat": 36.7213, "lon": -4.4214, "poblacion": 1690},
    {"provincia": "Sevilla", "comunidad": "Andalucía", "lat": 37.3886, "lon": -5.9845, "poblacion": 1940},
    
    # Aragón
    {"provincia": "Huesca", "comunidad": "Aragón", "lat": 42.1401, "lon": -0.4089, "poblacion": 220},
    {"provincia": "Teruel", "comunidad": "Aragón", "lat": 40.3450, "lon": -1.1065, "poblacion": 134},
    {"provincia": "Zaragoza", "comunidad": "Aragón", "lat": 41.6488, "lon": -0.8891, "poblacion": 974},
    
    # Asturias
    {"provincia": "Asturias", "comunidad": "Asturias", "lat": 43.3614, "lon": -5.8458, "poblacion": 1015},
    
    # Baleares
    {"provincia": "Islas Baleares", "comunidad": "Islas Baleares", "lat": 39.5696, "lon": 2.6502, "poblacion": 1172},
    
    # Canarias
    {"provincia": "Las Palmas", "comunidad": "Canarias", "lat": 28.1235, "lon": -15.4134, "poblacion": 1135},
    {"provincia": "Santa Cruz de Tenerife", "comunidad": "Canarias", "lat": 28.4636, "lon": -16.2518, "poblacion": 1036},
    
    # Cantabria
    {"provincia": "Cantabria", "comunidad": "Cantabria", "lat": 43.4623, "lon": -3.8044, "poblacion": 582},
    
    # Castilla-La Mancha
    {"provincia": "Albacete", "comunidad": "Castilla-La Mancha", "lat": 38.9948, "lon": -1.8585, "poblacion": 388},
    {"provincia": "Ciudad Real", "comunidad": "Castilla-La Mancha", "lat": 38.9865, "lon": -3.9273, "poblacion": 495},
    {"provincia": "Cuenca", "comunidad": "Castilla-La Mancha", "lat": 40.0718, "lon": -2.1340, "poblacion": 197},
    {"provincia": "Guadalajara", "comunidad": "Castilla-La Mancha", "lat": 40.6332, "lon": -3.1684, "poblacion": 267},
    {"provincia": "Toledo", "comunidad": "Castilla-La Mancha", "lat": 39.8628, "lon": -4.0245, "poblacion": 706},
    
    # Castilla y León
    {"provincia": "Ávila", "comunidad": "Castilla y León", "lat": 40.6562, "lon": -4.6820, "poblacion": 158},
    {"provincia": "Burgos", "comunidad": "Castilla y León", "lat": 42.3430, "lon": -3.6969, "poblacion": 356},
    {"provincia": "León", "comunidad": "Castilla y León", "lat": 42.5987, "lon": -5.5671, "poblacion": 455},
    {"provincia": "Palencia", "comunidad": "Castilla y León", "lat": 42.0125, "lon": -4.5312, "poblacion": 160},
    {"provincia": "Salamanca", "comunidad": "Castilla y León", "lat": 40.9640, "lon": -5.6630, "poblacion": 331},
    {"provincia": "Segovia", "comunidad": "Castilla y León", "lat": 40.9424, "lon": -4.1088, "poblacion": 153},
    {"provincia": "Soria", "comunidad": "Castilla y León", "lat": 41.7640, "lon": -2.4688, "poblacion": 88},
    {"provincia": "Valladolid", "comunidad": "Castilla y León", "lat": 41.6523, "lon": -4.7245, "poblacion": 520},
    {"provincia": "Zamora", "comunidad": "Castilla y León", "lat": 41.5037, "lon": -5.7438, "poblacion": 174},
    
    # Cataluña
    {"provincia": "Barcelona", "comunidad": "Cataluña", "lat": 41.3851, "lon": 2.1734, "poblacion": 5660},
    {"provincia": "Gerona", "comunidad": "Cataluña", "lat": 41.9794, "lon": 2.8214, "poblacion": 786},
    {"provincia": "Lérida", "comunidad": "Cataluña", "lat": 41.6176, "lon": 0.6200, "poblacion": 439},
    {"provincia": "Tarragona", "comunidad": "Cataluña", "lat": 41.1189, "lon": 1.2445, "poblacion": 820},
    
    # Comunidad Valenciana
    {"provincia": "Alicante", "comunidad": "Comunidad Valenciana", "lat": 38.3452, "lon": -0.4810, "poblacion": 1885},
    {"provincia": "Castellón", "comunidad": "Comunidad Valenciana", "lat": 39.9864, "lon": -0.0513, "poblacion": 587},
    {"provincia": "Valencia", "comunidad": "Comunidad Valenciana", "lat": 39.4699, "lon": -0.3763, "poblacion": 2590},
    
    # Extremadura
    {"provincia": "Badajoz", "comunidad": "Extremadura", "lat": 38.8794, "lon": -6.9707, "poblacion": 672},
    {"provincia": "Cáceres", "comunidad": "Extremadura", "lat": 39.4753, "lon": -6.3724, "poblacion": 394},
    
    # Galicia
    {"provincia": "La Coruña", "comunidad": "Galicia", "lat": 43.3623, "lon": -8.4115, "poblacion": 1127},
    {"provincia": "Lugo", "comunidad": "Galicia", "lat": 43.0097, "lon": -7.5568, "poblacion": 329},
    {"provincia": "Orense", "comunidad": "Galicia", "lat": 42.3360, "lon": -7.8635, "poblacion": 306},
    {"provincia": "Pontevedra", "comunidad": "Galicia", "lat": 42.4336, "lon": -8.6481, "poblacion": 942},
    
    # Madrid
    {"provincia": "Madrid", "comunidad": "Madrid", "lat": 40.4168, "lon": -3.7038, "poblacion": 6750},
    
    # Murcia
    {"provincia": "Murcia", "comunidad": "Murcia", "lat": 37.9924, "lon": -1.1307, "poblacion": 1511},
    
    # Navarra
    {"provincia": "Navarra", "comunidad": "Navarra", "lat": 42.8125, "lon": -1.6432, "poblacion": 661},
    
    # País Vasco
    {"provincia": "Álava", "comunidad": "País Vasco", "lat": 42.8464, "lon": -2.6724, "poblacion": 334},
    {"provincia": "Guipúzcoa", "comunidad": "País Vasco", "lat": 43.3184, "lon": -1.9812, "poblacion": 727},
    {"provincia": "Vizcaya", "comunidad": "País Vasco", "lat": 43.2630, "lon": -2.9350, "poblacion": 1159},
    
    # La Rioja
    {"provincia": "La Rioja", "comunidad": "La Rioja", "lat": 42.4627, "lon": -2.4449, "poblacion": 316},
    
    # Ceuta y Melilla
    {"provincia": "Ceuta", "comunidad": "Ceuta", "lat": 35.8891, "lon": -5.3167, "poblacion": 85},
    {"provincia": "Melilla", "comunidad": "Melilla", "lat": 35.2923, "lon": -2.9475, "poblacion": 86}
]

def generate_covid_data_provincias(start_date="2023-01-01", days=30):
    """Genera datos COVID por provincia (más granular)"""
    
    start = datetime.strptime(start_date, "%Y-%m-%d")
    data = []
    
    for i in range(days):
        fecha = start + timedelta(days=i)
        
        for prov in PROVINCIAS_COORDS:
            # Base de casos según población de la provincia
            base_casos = prov["poblacion"] * random.uniform(0.15, 0.25)
            
            # Variación por día y tendencia
            day_factor = 1 + (i / days) * random.uniform(0.3, 0.7)
            random_factor = random.uniform(0.7, 1.3)
            
            casos = int(base_casos * random_factor * day_factor)
            
            # Otros metrics
            ingresos_uci = int(casos * random.uniform(0.02, 0.05))
            fallecidos = int(casos * random.uniform(0.008, 0.02))
            altas = int(casos * random.uniform(0.88, 0.96))
            
            # Pequeña variación en coordenadas para visualización
            lat_variation = random.uniform(-0.05, 0.05)
            lon_variation = random.uniform(-0.05, 0.05)
            
            data.append({
                "fecha": fecha.strftime("%Y-%m-%d"),
                "comunidad_autonoma": prov["comunidad"],
                "provincia": prov["provincia"],
                "casos_confirmados": casos,
                "ingresos_uci": ingresos_uci,
                "fallecidos": fallecidos,
                "altas": altas,
                "lat": prov["lat"] + lat_variation,
                "lon": prov["lon"] + lon_variation
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
    df = generate_covid_data_provincias("2023-01-01", 90)
    
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