"""
Módulo para calidad del aire - Datos REALES del Gobierno de España (MITECO)
API: Índice Nacional de Calidad del Aire (ICA)
URLs: https://ica.miteco.es/datos/
"""
import requests
import csv
from io import StringIO
from typing import List, Dict, Optional
from datetime import datetime
import random
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api", tags=["air-quality"])

# URLs de datos REALES del MITECO
MITECO_CSV_URLS = {
    'last_hour': 'https://ica.miteco.es/datos/ica-ultima-hora.csv',
    'last_24h': 'https://ica.miteco.es/datos/ica-ultimas-24-horas.csv',
    'forecast': 'https://ica.miteco.es/datos/ica-previsto.csv'
}

# Diccionario de contaminantes
CONTAMINANTES = {
    'PM2.5': 'Particulate matter < 2.5 μm',
    'PM10': 'Particulate matter < 10 μm', 
    'NO2': 'Nitrogen dioxide',
    'O3': 'Ozone',
    'SO2': 'Sulphur dioxide',
    'CO': 'Carbon monoxide',
    'BaP': 'Benzo(a)pyrene'
}

# Mapeo de índice ICA (1-6) a nuestro AQI (1-5)
ICA_TO_AQI = {
    1: 1,  # Buena
    2: 2,  # Razonablemente buena
    3: 3,  # Regular
    4: 4,  # Desfavorable
    5: 5,  # Muy desfavorable
    6: 5   # Extremadamente desfavorable
}

# ✅ NUEVO: Mapeo de tipo MITECO a station_class
TIPO_TO_CLASS = {
    'FONDO': 1,        # Urbana de fondo
    'TRAFICO': 4,      # Tráfico
    'INDUSTRIAL': 2,   # Suburbana/Industrial
    'RURAL': 3         # Rural
}


def descargar_datos_miteco(tipo: str = 'last_hour') -> List[Dict]:
    """Descarga y parsea datos del MITECO (con manejo robusto de errores)"""
    try:
        url = MITECO_CSV_URLS.get(tipo)
        if not url:
            print(f"URL no encontrada para tipo: {tipo}")
            return []
        
        print(f"📡 Descargando CSV MITECO: {url}")
        response = requests.get(url, verify=False, timeout=15)
        response.raise_for_status()
        
        # Parsear CSV
        csv_text = response.text
        csv_data = StringIO(csv_text)
        reader = csv.DictReader(csv_data)
        
        datos = []
        errores_parseo = 0
        estaciones_inactivas = 0
        estaciones_sin_indice = 0
        
        # ===== VARIABLES DE DEBUG =====
        debug_total = 0
        debug_activas = 0
        debug_inactivas = 0
        debug_filtradas_coords = 0
        debug_filtradas_otras = 0
        debug_inactivas_filtradas = []
        
        for i, row in enumerate(reader):
            debug_total += 1
            
            try:
                # ===== EXTRACCIÓN Y LIMPIEZA DE CAMPOS =====
                cod_estacion = row.get('cod_estacion', '').strip()
                nombre = row.get('nombre', '').strip()
                tipo_estacion = row.get('tipo', '').strip()
                latitud_str = row.get('latitud', '').strip()
                longitud_str = row.get('longitud', '').strip()
                activa_str = row.get('activa', '').strip().lower()
                fecha = row.get('fecha', '').strip()
                indice_str = row.get('indice', '').strip()
                debido_a = row.get('debido_a', '').strip()
                
                # ===== VALIDACIONES MÍNIMAS =====
                if not cod_estacion or not nombre:
                    errores_parseo += 1
                    debug_filtradas_otras += 1
                    continue
                
                # Verificar si está activa
                activa = activa_str == 'true'
                if not activa:
                    estaciones_inactivas += 1
                    debug_inactivas += 1
                    # DEBUG: Registrar inactiva
                    print(f"📝 DEBUG INACTIVA #{debug_inactivas}: {nombre}")
                
                # ===== PARSEAR COORDENADAS =====
                try:
                    lat = float(latitud_str) if latitud_str else None
                    lon = float(longitud_str) if longitud_str else None
                    
                    # DEBUG: Mostrar coordenadas de inactivas
                    if not activa:
                        print(f"  📍 Coordenadas: {lat}, {lon}")
                    
                    # ✅ CORREGIDO: Solo validar que sean números, no el rango
                    # (Las estaciones de MITECO están todas en España)
                    if not lat or not lon:
                        errores_parseo += 1
                        debug_filtradas_coords += 1
                        if not activa:
                            debug_inactivas_filtradas.append(f"{nombre} - sin coordenadas")
                        continue
                    
                    # ✅ OPCIÓN: Solo advertencia si están muy fuera
                    # Pero NO excluir - MITECO solo tiene estaciones españolas
                    if lat < 20 or lat > 45 or lon < -20 or lon > 5:
                        print(f"⚠️  Coordenadas sospechosas (pero aceptadas): {lat}, {lon} - {nombre}")
                    
                except (ValueError, TypeError):
                    errores_parseo += 1
                    debug_filtradas_coords += 1
                    if not activa:
                        debug_inactivas_filtradas.append(f"{nombre} - error parseo coordenadas")
                    continue
                
                # ===== PARSEAR ÍNDICE =====
                indice_ica = None
                tiene_indice = False
                
                if indice_str:  
                    try:
                        indice_ica = int(indice_str)
                        tiene_indice = True
                    except ValueError:
                        estaciones_sin_indice += 1
                else:
                    estaciones_sin_indice += 1
                
                # ===== CONSTRUIR DATO =====
                dato = {
                    'cod_estacion': cod_estacion,
                    'nombre': nombre,
                    'tipo': tipo_estacion,
                    'lat': lat,
                    'lon': lon,
                    'activa': activa,
                    'fecha': fecha if fecha else datetime.now().isoformat(),
                    'indice_ica': indice_ica,
                    'tiene_indice': tiene_indice,
                    'debido_a': debido_a if debido_a else None,
                    'aqi': ICA_TO_AQI.get(indice_ica, 0) if tiene_indice and indice_ica else 0,
                }
                
                datos.append(dato)
                if activa:
                    debug_activas += 1
                
            except Exception as e:
                errores_parseo += 1
                debug_filtradas_otras += 1
                if not activa:
                    debug_inactivas_filtradas.append(f"{nombre} - error general: {str(e)}")
                    
                if errores_parseo <= 3:
                    print(f"⚠️ Error fila {i+2}: {e}")
                continue
        
        # ===== ESTADÍSTICAS FINALES =====
        print(f"\n{'='*50}")
        print(f"✅ {len(datos)} estaciones parseadas correctamente")
        print(f"   - Activas: {sum(1 for d in datos if d['activa'])}")
        print(f"   - Inactivas: {sum(1 for d in datos if not d['activa'])}")
        print(f"   - Estaciones sin índice: {estaciones_sin_indice}")
        print(f"   - Errores de parseo: {errores_parseo}")
        
        # ===== DEBUG RESUMEN =====
        print(f"\n📊 DEBUG DETALLADO:")
        print(f"   Total filas CSV procesadas: {debug_total}")
        print(f"   Activas encontradas: {debug_activas}")
        print(f"   Inactivas encontradas: {debug_inactivas}")
        print(f"   Filtradas por coordenadas: {debug_filtradas_coords}")
        print(f"   Filtradas por otros errores: {debug_filtradas_otras}")
        
        if debug_inactivas_filtradas:
            print(f"\n⚠️  Inactivas filtradas ({len(debug_inactivas_filtradas)}):")
            for item in debug_inactivas_filtradas:
                print(f"   - {item}")
        
        print(f"{'='*50}\n")
        
        return datos
        
    except Exception as e:
        print(f"❌ Error descargando datos MITECO: {e}")
        import traceback
        traceback.print_exc()
        return []


def convertir_a_estaciones(datos: List[Dict]) -> List[Dict]:
    """Convierte datos MITECO a formato estaciones unificado"""
    try:
        estaciones = []
        
        for dato in datos:
            try:
                # Generar ID único
                station_id = int(dato['cod_estacion']) if dato['cod_estacion'].isdigit() else abs(hash(dato['cod_estacion'])) % 1000000
                
                # ✅ MAPEAR TIPO A STATION_CLASS
                station_class = TIPO_TO_CLASS.get(dato['tipo'], 1)
                
                # Determinar si tiene datos válidos
                tiene_datos_validos = (
                    dato['tiene_indice'] and 
                    dato['indice_ica'] is not None and
                    dato['indice_ica'] > 0
                )
                
                # Construir estación
                if tiene_datos_validos:
                    # Calcular concentración simulada basada en ICA
                    concentracion = dato['indice_ica'] * 10
                    
                    calidad_info = obtener_calidad_texto(dato['aqi'])
                    
                    estacion = {
                        'id': station_id,
                        'station_code': dato['cod_estacion'],
                        'eoi_code': f"ES{dato['cod_estacion']}",
                        'name': dato['nombre'],
                        'country_code': 'ES',
                        'country': 'Spain',
                        'station_class': station_class,  # ✅ CORREGIDO
                        'station_type': dato['tipo'],
                        'lat': dato['lat'],
                        'lon': dato['lon'],
                        'available_pollutants': [dato['debido_a']] if dato['debido_a'] else [],
                        'last_measurement': concentracion,
                        'last_aqi': dato['aqi'],
                        'pollutant': dato['debido_a'],
                        'unit': 'ICA',
                        'quality_text': calidad_info['text'],
                        'quality_color': calidad_info['color'],
                        'recommendation': calidad_info['recomendacion'],
                        'last_updated': dato['fecha'],
                        'is_mock': False,
                        'has_real_data': True,
                        'is_active':  dato['activa'],  # ✅ True/False real
                        'data_source': 'MITECO ICA',
                        'measurement_timestamp': dato['fecha'],
                        'ica_index': dato['indice_ica'],
                        'ica_contaminant': dato['debido_a']
                    }
                else:
                    # Estación sin datos válidos
                    estacion = {
                        'id': station_id,
                        'station_code': dato['cod_estacion'],
                        'eoi_code': f"ES{dato['cod_estacion']}",
                        'name': dato['nombre'],
                        'country_code': 'ES',
                        'country': 'Spain',
                        'station_class': station_class,  # ✅ CORREGIDO
                        'station_type': dato['tipo'],
                        'lat': dato['lat'],
                        'lon': dato['lon'],
                        'available_pollutants': [dato['debido_a']] if dato['debido_a'] else [],
                        'last_measurement': None,
                        'last_aqi': 0,
                        'pollutant': dato['debido_a'],
                        'unit': None,
                        'quality_text': 'Sin datos',
                        'quality_color': '#cccccc',
                        'recommendation': 'Estación sin datos en la última medición.',
                        'last_updated': dato['fecha'],
                        'is_mock': False,
                        'has_real_data': False,
                        'is_active': dato['activa'],  # ✅ True/False real
                        'data_source': 'MITECO ICA',
                        'measurement_timestamp': dato['fecha']
                    }
                
                estaciones.append(estacion)
                
            except Exception as e:
                print(f"⚠️ Error procesando estación {dato.get('cod_estacion', 'N/A')}: {e}")
                continue
        
        # Estadísticas actualizadas
        activas_con_datos = sum(1 for e in estaciones if e['is_active'] and e['has_real_data'])
        activas_sin_datos = sum(1 for e in estaciones if e['is_active'] and not e['has_real_data'])
        inactivas_con_datos = sum(1 for e in estaciones if not e['is_active'] and e['has_real_data'])
        inactivas_sin_datos = sum(1 for e in estaciones if not e['is_active'] and not e['has_real_data'])
        
        print(f"📊 Estaciones procesadas:")
        print(f"   - Total: {len(estaciones)}")
        print(f"   - Activas con datos: {activas_con_datos}")
        print(f"   - Activas sin datos: {activas_sin_datos}")
        print(f"   - Inactivas con datos: {inactivas_con_datos}")
        print(f"   - Inactivas sin datos: {inactivas_sin_datos}")
        
        return estaciones
        
    except Exception as e:
        print(f"❌ Error convirtiendo a estaciones: {e}")
        return []

def obtener_datos_mock(limite: int = 100) -> List[Dict]:
    """Datos mock para desarrollo/fallback"""
    ciudades_espana = [
        {"nombre": "Madrid", "lat": 40.4168, "lon": -3.7038},
        {"nombre": "Barcelona", "lat": 41.3851, "lon": 2.1734},
        {"nombre": "Valencia", "lat": 39.4699, "lon": -0.3763},
        {"nombre": "Sevilla", "lat": 37.3891, "lon": -5.9845},
        {"nombre": "Bilbao", "lat": 43.2630, "lon": -2.9350},
        {"nombre": "Málaga", "lat": 36.7194, "lon": -4.4200},
    ]
    
    estaciones = []
    
    for i, ciudad in enumerate(ciudades_espana[:min(limite, len(ciudades_espana))]):
        pm25 = random.uniform(10, 25)
        aqi = calcular_aqi(pm25, 'PM2.5')
        calidad_info = obtener_calidad_texto(aqi)
        
        estaciones.append({
            'id': i + 1000,
            'station_code': f"MOCK{i:04d}",
            'eoi_code': f"ESMOCK{i:04d}",
            'name': f"Estación {ciudad['nombre']}",
            'country_code': 'ES',
            'country': 'Spain',
            'station_class': random.randint(1, 4),  # ✅ Aleatorio para mock
            'station_type': 'MOCK',
            'lat': ciudad['lat'] + random.uniform(-0.05, 0.05),
            'lon': ciudad['lon'] + random.uniform(-0.05, 0.05),
            'available_pollutants': ['PM2.5', 'PM10', 'NO2'],
            'last_measurement': round(pm25, 2),
            'last_aqi': aqi,
            'pollutant': 'PM2.5',
            'unit': 'µg/m³',
            'quality_text': calidad_info['text'],
            'quality_color': calidad_info['color'],
            'recommendation': calidad_info['recomendacion'],
            'last_updated': datetime.now().isoformat(),
            'is_mock': True,
            'has_real_data': False
        })
    
    return estaciones


def calcular_aqi(concentracion: float, contaminante: str) -> int:
    """Calcula AQI según WHO"""
    if not concentracion:
        return 0
    
    if contaminante == 'PM2.5':
        if concentracion <= 15: return 1
        elif concentracion <= 30: return 2
        elif concentracion <= 55: return 3
        elif concentracion <= 110: return 4
        else: return 5
    elif contaminante == 'PM10':
        if concentracion <= 45: return 1
        elif concentracion <= 90: return 2
        elif concentracion <= 180: return 3
        elif concentracion <= 360: return 4
        else: return 5
    
    return min(max(int(concentracion / 50), 1), 5)


def obtener_calidad_texto(aqi: int) -> Dict:
    """Devuelve información textual según AQI"""
    niveles = {
        1: {"text": "Buena", "color": "#00e400", "recomendacion": "Calidad del aire satisfactoria."},
        2: {"text": "Moderada", "color": "#feca57", "recomendacion": "Aceptable para la mayoría."},
        3: {"text": "Mala", "color": "#ff7e00", "recomendacion": "Grupos sensibles deben reducir actividad exterior."},
        4: {"text": "Muy Mala", "color": "#ff0000", "recomendacion": "Todos deben reducir actividad exterior."},
        5: {"text": "Extremadamente Mala", "color": "#8f3f97", "recomendacion": "Evitar actividad exterior."},
        0: {"text": "Sin datos", "color": "#cccccc", "recomendacion": "No hay datos disponibles."}
    }
    return niveles.get(aqi, niveles[0])


# ============= ENDPOINTS FASTAPI =============

@router.get("/air-quality/stations")
async def get_stations(
    limite: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    contaminante: Optional[str] = Query("PM2.5"),
    light: bool = Query(False),
    solo_con_datos: bool = Query(True),
    forzar_mock: bool = Query(False)
):
    """Obtiene estaciones de calidad del aire en España"""
    try:
        # Intentar datos reales
        if forzar_mock:
            estaciones = obtener_datos_mock(limite=limite + offset)
            es_mock = True
            source = "Datos simulados"
        else:
            # Descargar CSV MITECO
            datos_miteco = descargar_datos_miteco(tipo='last_hour')
            
            if datos_miteco:
                # Convertir a formato estaciones
                estaciones = convertir_a_estaciones(datos_miteco)
                es_mock = False
                source = "MITECO ICA - Última hora"
                
                # Filtrar solo con datos si se solicita
                if solo_con_datos:
                    estaciones = [e for e in estaciones if e.get('has_real_data')]
            else:
                # Fallback a mock
                print("⚠️ Usando datos mock como fallback")
                estaciones = obtener_datos_mock(limite=limite + offset)
                es_mock = True
                source = "Datos simulados (fallback)"
        
        # Paginación
        total = len(estaciones)
        estaciones_paginadas = estaciones[offset:offset + limite]
        
        # Modo light
        if light:
            estaciones_paginadas = [
                {
                    'id': e['id'],
                    'name': e['name'],
                    'lat': e['lat'],
                    'lon': e['lon'],
                    'last_aqi': e.get('last_aqi', 0),
                    'quality_color': e.get('quality_color', '#cccccc'),
                    'pollutant': e.get('pollutant', contaminante),
                    'station_code': e['station_code'],
                    'is_active': e.get('is_active', True)
                }
                for e in estaciones_paginadas
            ]
        
        return {
            "success": True,
            "count": len(estaciones_paginadas),
            "total": total,
            "offset": offset,
            "limit": limite,
            "has_more": (offset + len(estaciones_paginadas)) < total,
            "pollutant": contaminante,
            "description": CONTAMINANTES.get(contaminante, contaminante),
            "is_mock_data": es_mock,
            "data_source": source,
            "light_mode": light,
            "stations": estaciones_paginadas
        }
        
    except Exception as e:
        print(f"❌ Error en /stations: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/air-quality/station/{station_id}")
async def get_station_detail(station_id: int):
    """Obtener detalle de estación específica"""
    try:
        # Buscar en datos reales
        datos_miteco = descargar_datos_miteco(tipo='last_hour')
        
        if datos_miteco:
            estaciones = convertir_a_estaciones(datos_miteco)
            estacion = next((e for e in estaciones if e['id'] == station_id), None)
            
            if estacion:
                return {
                    "success": True,
                    "data": estacion,
                    "is_mock_data": False
                }
        
        # Fallback a mock
        estaciones_mock = obtener_datos_mock(limite=200)
        estacion = next((e for e in estaciones_mock if e['id'] == station_id), None)
        
        if not estacion:
            raise HTTPException(status_code=404, detail=f"Estación {station_id} no encontrada")
        
        return {
            "success": True,
            "data": estacion,
            "is_mock_data": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/air-quality/stats")
async def get_air_quality_stats(
    contaminante: str = Query("PM2.5"),
    forzar_mock: bool = Query(False)
):
    """Estadísticas de calidad del aire"""
    try:
        # Obtener datos
        if forzar_mock:
            estaciones = obtener_datos_mock(limite=100)
            es_mock = True
        else:
            datos_miteco = descargar_datos_miteco(tipo='last_hour')
            if datos_miteco:
                estaciones = convertir_a_estaciones(datos_miteco)
                estaciones = [e for e in estaciones if e.get('has_real_data')]
                es_mock = False
            else:
                estaciones = obtener_datos_mock(limite=100)
                es_mock = True
        
        if not estaciones:
            return {
                "message": "No hay datos disponibles",
                "is_mock_data": True
            }
        
        # Calcular stats
        aqis = [e['last_aqi'] for e in estaciones if e.get('last_aqi')]
        concentraciones = [e['last_measurement'] for e in estaciones if e.get('last_measurement')]
        
        calidad_dist = {}
        for aqi in aqis:
            nivel = obtener_calidad_texto(aqi)['text']
            calidad_dist[nivel] = calidad_dist.get(nivel, 0) + 1
        
        return {
            "pollutant": contaminante,
            "total_stations": len(estaciones),
            "stations_with_data": len(concentraciones),
            "avg_concentration": round(sum(concentraciones) / len(concentraciones), 2) if concentraciones else 0,
            "min_concentration": round(min(concentraciones), 2) if concentraciones else 0,
            "max_concentration": round(max(concentraciones), 2) if concentraciones else 0,
            "quality_distribution": calidad_dist,
            "timestamp": datetime.now().isoformat(),
            "is_mock_data": es_mock
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/air-quality/health")
async def health_check():
    """Health check del servicio"""
    try:
        datos_miteco = descargar_datos_miteco(tipo='last_hour')
        
        if datos_miteco and len(datos_miteco) > 0:
            # Contar cuántas tienen índice
            con_indice = sum(1 for d in datos_miteco if d['tiene_indice'])
            
            return {
                "status": "healthy",
                "message": f"✅ Conectado a MITECO ICA. {len(datos_miteco)} estaciones ({con_indice} con datos).",
                "is_mock": False,
                "example_data": datos_miteco[0] if datos_miteco else None,
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "degraded",
                "message": "⚠️ MITECO no disponible. Usando datos simulados.",
                "is_mock": True,
                "timestamp": datetime.now().isoformat()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"❌ Error: {str(e)}",
            "is_mock": True,
            "timestamp": datetime.now().isoformat()
        }


@router.get("/air-quality/pollutants")
async def get_pollutants_info():
    """Información sobre contaminantes"""
    return {
        "pollutants": CONTAMINANTES,
        "units": "ICA (Índice Calidad Aire) | µg/m³",
        "source": "MITECO - Ministerio para la Transición Ecológica",
        "update_frequency": "Horaria",
        "real_data_available": True
    }