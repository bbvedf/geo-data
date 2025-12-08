"""
Módulo para calidad del aire - Datos de la Agencia Europea de Medio Ambiente (EEA)
API: https://air.discomap.eea.europa.eu/arcgis/rest/services/AirQuality/AirQualityDownloadServiceEUMonitoringStations
"""
import requests
import random
from typing import List, Dict, Optional
from datetime import datetime
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api", tags=["air-quality"])

# Configuración del servicio EEA
EEA_BASE_URL = "https://air.discomap.eea.europa.eu/arcgis/rest/services/AirQuality"
AIR_QUALITY_SERVICE = "AirQualityDownloadServiceEUMonitoringStations"

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

def obtener_estaciones_espana(limite: int = 200) -> List[Dict]:
    """Obtiene estaciones de calidad del aire en España desde EEA"""
    try:
        url = f"{EEA_BASE_URL}/{AIR_QUALITY_SERVICE}/MapServer/0/query"
        
        params = {
            'where': "CountryCode='ES'",
            'outFields': 'OBJECTID,AirQualityStation,AQStationName,Country,CountryCode,'
                       'AirQualityStationEoICode,stationClass,PopupInfo',
            'returnGeometry': 'true',
            'f': 'pjson',
            'outSR': '4326',
            'resultRecordCount': str(min(limite, 1000))
        }
        
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        estaciones = []
        
        for feature in data.get('features', []):
            try:
                attrs = feature.get('attributes', {})
                geometry = feature.get('geometry', {})
                
                if not geometry or 'x' not in geometry or 'y' not in geometry:
                    continue
                
                popup_info = attrs.get('PopupInfo', '')
                contaminantes_disponibles = []
                for contaminante in ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO']:
                    if contaminante in popup_info:
                        contaminantes_disponibles.append(contaminante)
                
                estacion = {
                    'id': attrs.get('OBJECTID'),
                    'station_code': attrs.get('AirQualityStation'),
                    'eoi_code': attrs.get('AirQualityStationEoICode'),
                    'name': attrs.get('AQStationName', '').strip(),
                    'country_code': attrs.get('CountryCode'),
                    'country': attrs.get('Country'),
                    'station_class': attrs.get('stationClass'),
                    'lat': geometry.get('y'),
                    'lon': geometry.get('x'),
                    'available_pollutants': contaminantes_disponibles,
                    'last_updated': datetime.now().isoformat()
                }
                
                if estacion['lat'] and estacion['lon']:
                    estaciones.append(estacion)
                        
            except Exception as e:
                print(f"Error parseando estación: {e}")
                continue
        
        print(f"CalidadAire: {len(estaciones)} estaciones encontradas en España")
        return estaciones
        
    except Exception as e:
        print(f"Error obteniendo estaciones aire: {e}")
        return []

def obtener_datos_mock(limite: int = 100) -> List[Dict]:
    """Datos mock para desarrollo"""
    ciudades_espana = [
        {"nombre": "Madrid", "lat": 40.4168, "lon": -3.7038, "poblacion": 3300000},
        {"nombre": "Barcelona", "lat": 41.3851, "lon": 2.1734, "poblacion": 1620000},
        {"nombre": "Valencia", "lat": 39.4699, "lon": -0.3763, "poblacion": 800000},
        {"nombre": "Sevilla", "lat": 37.3891, "lon": -5.9845, "poblacion": 690000},
        {"nombre": "Bilbao", "lat": 43.2630, "lon": -2.9350, "poblacion": 350000},
        {"nombre": "Málaga", "lat": 36.7194, "lon": -4.4200, "poblacion": 570000},
        {"nombre": "Zaragoza", "lat": 41.6488, "lon": -0.8891, "poblacion": 670000},
        {"nombre": "Palma", "lat": 39.5696, "lon": 2.6502, "poblacion": 420000},
        {"nombre": "Murcia", "lat": 37.9922, "lon": -1.1307, "poblacion": 460000},
        {"nombre": "Granada", "lat": 37.1781, "lon": -3.6008, "poblacion": 240000},
    ]
    
    estaciones = []
    
    for i, ciudad in enumerate(ciudades_espana[:min(limite, len(ciudades_espana))]):
        num_estaciones = 3 if ciudad['poblacion'] > 500000 else 1
        
        for j in range(num_estaciones):
            if ciudad['nombre'] in ['Madrid', 'Barcelona']:
                pm25 = random.uniform(18, 28)
            else:
                pm25 = random.uniform(10, 22)
            
            aqi = calcular_aqi(pm25, 'PM2.5')
            calidad_info = obtener_calidad_texto(aqi)
            
            contaminantes = ['PM2.5', 'PM10', 'NO2']
            if random.random() > 0.5:
                contaminantes.append('O3')
            
            estaciones.append({
                'id': (i * 10) + j + 1000,
                'station_code': f"ES{i:04d}{j}A",
                'eoi_code': f"ES{i:04d}{j}A",
                'name': f"Estación {ciudad['nombre']} - {j+1}",
                'country_code': 'ES',
                'country': 'Spain',
                'station_class': random.randint(1, 3),
                'lat': ciudad['lat'] + random.uniform(-0.05, 0.05),
                'lon': ciudad['lon'] + random.uniform(-0.05, 0.05),
                'available_pollutants': contaminantes,
                'last_measurement': round(pm25, 2),
                'last_aqi': aqi,
                'pollutant': 'PM2.5',
                'unit': 'µg/m³',
                'quality_text': calidad_info['text'],
                'quality_color': calidad_info['color'],
                'recommendation': calidad_info['recomendacion'],
                'last_updated': datetime.now().isoformat(),
                'is_mock': True
            })
    
    return estaciones

def calcular_aqi(concentracion: float, contaminante: str) -> int:
    """Calcula Índice de Calidad del Aire según WHO"""
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
    elif contaminante == 'NO2':
        if concentracion <= 40: return 1
        elif concentracion <= 80: return 2
        elif concentracion <= 120: return 3
        elif concentracion <= 180: return 4
        else: return 5
    
    return min(max(int(concentracion / 50), 1), 5)

def obtener_calidad_texto(aqi: int) -> Dict:
    """Devuelve información textual según índice AQI"""
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
    limite: int = Query(100, ge=1, le=1000, description="Límite de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    contaminante: Optional[str] = Query("PM2.5", regex="^(PM2.5|PM10|NO2|O3|SO2|CO|BaP)$"),
    light: bool = Query(False, description="Modo ligero (solo coords + AQI)"),
    con_datos: bool = Query(True, description="Incluir mediciones simuladas"),
    forzar_mock: bool = Query(False, description="Forzar uso de datos mock")
):
    """
    Obtiene estaciones de calidad del aire en España
    
    **Modo light=true**: Solo coordenadas, nombre, AQI (para mapas)
    **Modo light=false**: Todos los datos completos
    """
    try:
        # Obtener estaciones
        if forzar_mock:
            estaciones = obtener_datos_mock(limite=limite + offset)
            es_mock = True
        else:
            estaciones_reales = obtener_estaciones_espana(limite=limite + offset)
            
            if estaciones_reales and len(estaciones_reales) > 0:
                estaciones = estaciones_reales
                es_mock = False
            else:
                estaciones = obtener_datos_mock(limite=limite + offset)
                es_mock = True
        
        # Aplicar paginación
        total = len(estaciones)
        estaciones_paginadas = estaciones[offset:offset + limite]
        
        # Añadir datos simulados si se solicita
        if con_datos:
            for estacion in estaciones_paginadas:
                if 'last_measurement' not in estacion:
                    if estacion['name'] and any(ciudad in estacion['name'] for ciudad in ['Madrid', 'Barcelona']):
                        concentracion = 18 + (random.random() * 10)
                    else:
                        concentracion = 10 + (random.random() * 12)
                    
                    aqi = calcular_aqi(concentracion, contaminante)
                    calidad = obtener_calidad_texto(aqi)
                    
                    estacion.update({
                        'last_measurement': round(concentracion, 2),
                        'last_aqi': aqi,
                        'pollutant': contaminante,
                        'unit': 'μg/m³',
                        'quality_text': calidad['text'],
                        'quality_color': calidad['color'],
                        'recommendation': calidad['recomendacion']
                    })
        
        # Si es light mode, devolver solo lo esencial
        if light:
            estaciones_light = []
            for est in estaciones_paginadas:
                estaciones_light.append({
                    'id': est.get('id'),
                    'name': est.get('name'),
                    'lat': est.get('lat'),
                    'lon': est.get('lon'),
                    'last_aqi': est.get('last_aqi'),
                    'quality_color': est.get('quality_color'),
                    'pollutant': est.get('pollutant', contaminante)
                })
            estaciones_paginadas = estaciones_light
        
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
            "light_mode": light,
            "stations": estaciones_paginadas
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estaciones: {str(e)}")


@router.get("/air-quality/station/{station_id}")
async def get_station_detail(
    station_id: int,
    contaminante: str = Query("PM2.5")
):
    """Obtener datos completos de una estación específica"""
    try:
        # Buscar en datos mock (en producción buscaría en base de datos)
        estaciones = obtener_datos_mock(limite=200)
        
        estacion = next((e for e in estaciones if e['id'] == station_id), None)
        
        if not estacion:
            raise HTTPException(status_code=404, detail=f"Estación {station_id} no encontrada")
        
        return {
            "success": True,
            "data": estacion
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener estación: {str(e)}")


@router.get("/air-quality/stats")
async def get_air_quality_stats(
    contaminante: str = Query("PM2.5")
):
    """Estadísticas de calidad del aire en España"""
    try:
        estaciones = obtener_datos_mock(limite=50)
        
        if not estaciones:
            return {
                "message": "No hay datos disponibles",
                "pollutant": contaminante
            }
        
        concentraciones = [e.get('last_measurement', 0) for e in estaciones if e.get('last_measurement')]
        aqis = [e.get('last_aqi', 0) for e in estaciones if e.get('last_aqi')]
        
        if not concentraciones:
            return {
                "pollutant": contaminante,
                "message": "No hay mediciones disponibles"
            }
        
        calidad_dist = {}
        for aqi in aqis:
            calidad_info = obtener_calidad_texto(aqi)
            nivel = calidad_info['text']
            calidad_dist[nivel] = calidad_dist.get(nivel, 0) + 1
        
        return {
            "pollutant": contaminante,
            "description": CONTAMINANTES.get(contaminante, contaminante),
            "total_stations": len(estaciones),
            "stations_with_data": len(concentraciones),
            "avg_concentration": round(sum(concentraciones) / len(concentraciones), 2),
            "min_concentration": round(min(concentraciones), 2),
            "max_concentration": round(max(concentraciones), 2),
            "quality_distribution": calidad_dist,
            "timestamp": datetime.now().isoformat(),
            "is_mock_data": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculando estadísticas: {str(e)}")


@router.get("/air-quality/pollutants")
async def get_pollutants_info():
    """Información sobre los contaminantes medidos"""
    return {
        "pollutants": CONTAMINANTES,
        "units": "μg/m³ (microgramos por metro cúbico)",
        "source": "Agencia Europea de Medio Ambiente (EEA)",
        "update_frequency": "Horaria/diaria según estación"
    }


@router.get("/air-quality/health")
async def health_check():
    """Verifica que el servicio esté funcionando"""
    try:
        estaciones_reales = obtener_estaciones_espana(limite=5)
        
        if estaciones_reales and len(estaciones_reales) > 0:
            status = "healthy"
            message = f"Conectado a API EEA. {len(estaciones_reales)} estaciones disponibles."
            is_mock = False
        else:
            status = "degraded"
            message = "API EEA no disponible. Usando datos simulados."
            is_mock = True
        
        return {
            "status": status,
            "message": message,
            "is_mock": is_mock,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Error: {str(e)}",
            "is_mock": True,
            "timestamp": datetime.now().isoformat()
        }