# backend/app/weather.py
import os
from fastapi import APIRouter, HTTPException
from typing import Optional
import requests
from datetime import datetime

# Definir el router
router = APIRouter(prefix="/api", tags=["weather"])

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "tu_api_key_aqui")
BASE_URL = os.getenv("OPENWEATHER_BASE_URL", "http://api.openweathermap.org/data/2.5")

# Ciudades españolas para demo
SPANISH_CITIES = [
    {"name": "Madrid", "lat": 40.4168, "lon": -3.7038},
    {"name": "Barcelona", "lat": 41.3851, "lon": 2.1734},
    {"name": "Valencia", "lat": 39.4699, "lon": -0.3763},
    {"name": "Sevilla", "lat": 37.3891, "lon": -5.9845},
    {"name": "Bilbao", "lat": 43.2630, "lon": -2.9350},
    {"name": "Málaga", "lat": 36.7194, "lon": -4.4200},
]

@router.get("/weather/data")
async def get_weather_data(
    city: Optional[str] = None,
    limit: int = 6
):
    """Obtener datos meteorológicos actuales"""
    try:
        if OPENWEATHER_API_KEY == "tu_api_key_aqui":
            # Datos mock mientras se configura API real
            return get_mock_weather_data(city, limit)
            
        if city:
            # Datos de una ciudad específica
            url = f"{BASE_URL}/weather"
            params = {
                "q": city,
                "appid": OPENWEATHER_API_KEY,
                "units": "metric",
                "lang": "es"
            }
            response = requests.get(url, params=params)
            data = response.json()
            
            return {
                "data": [format_weather_data(data)],
                "count": 1
            }
        else:
            # Datos de varias ciudades
            weather_data = []
            for city_info in SPANISH_CITIES[:limit]:
                url = f"{BASE_URL}/weather"
                params = {
                    "lat": city_info["lat"],
                    "lon": city_info["lon"],
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric",
                    "lang": "es"
                }
                response = requests.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    weather_data.append(format_weather_data(data))
            
            return {
                "data": weather_data,
                "count": len(weather_data)
            }
            
    except Exception as e:
        # Fallback a datos mock
        print(f"⚠️  Error API clima: {e}, usando datos mock")
        return get_mock_weather_data(city, limit)

def get_mock_weather_data(city: Optional[str] = None, limit: int = 6):
    """Generar datos mock para desarrollo"""
    from datetime import datetime, timedelta
    import random
    
    cities = SPANISH_CITIES[:limit] if not city else [
        next((c for c in SPANISH_CITIES if c["name"].lower() == city.lower()), 
             {"name": city or "Madrid", "lat": 40.4168, "lon": -3.7038})
    ]
    
    weather_data = []
    for city_info in cities:
        temp = random.uniform(10, 25)
        weather_data.append({
            "city": city_info["name"],
            "country": "ES",
            "temperature": round(temp, 1),
            "feels_like": round(temp + random.uniform(-2, 2), 1),
            "humidity": random.randint(40, 80),
            "pressure": random.randint(1010, 1020),
            "wind_speed": round(random.uniform(0, 10), 1),
            "wind_deg": random.randint(0, 360),
            "weather_main": random.choice(["Clear", "Clouds", "Rain", "Snow"]),
            "weather_description": random.choice([
                "cielo despejado", "nubes dispersas", "lluvia ligera", "nevada"
            ]),
            "weather_icon": random.choice(["01d", "02d", "03d", "04d", "09d", "10d"]),
            "clouds": random.randint(0, 100),
            "visibility": random.randint(5000, 10000),
            "lat": city_info["lat"],
            "lon": city_info["lon"],
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(0, 60))).isoformat()
        })
    
    return {
        "data": weather_data,
        "count": len(weather_data),
        "note": "⚠️ Datos mock - Usando API key por defecto"
    }

def format_weather_data(api_data):
    """Formatear datos de OpenWeather para nuestro frontend"""
    return {
        "city": api_data.get("name", ""),
        "country": api_data.get("sys", {}).get("country", ""),
        "temperature": api_data.get("main", {}).get("temp", 0),
        "feels_like": api_data.get("main", {}).get("feels_like", 0),
        "humidity": api_data.get("main", {}).get("humidity", 0),
        "pressure": api_data.get("main", {}).get("pressure", 0),
        "wind_speed": api_data.get("wind", {}).get("speed", 0),
        "wind_deg": api_data.get("wind", {}).get("deg", 0),
        "weather_main": api_data.get("weather", [{}])[0].get("main", ""),
        "weather_description": api_data.get("weather", [{}])[0].get("description", ""),
        "weather_icon": api_data.get("weather", [{}])[0].get("icon", ""),
        "clouds": api_data.get("clouds", {}).get("all", 0),
        "visibility": api_data.get("visibility", 0),
        "lat": api_data.get("coord", {}).get("lat", 0),
        "lon": api_data.get("coord", {}).get("lon", 0),
        "timestamp": datetime.fromtimestamp(api_data.get("dt", 0)).isoformat() if api_data.get("dt") else datetime.now().isoformat()
    }