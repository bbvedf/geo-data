![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![PostGIS](https://img.shields.io/badge/PostGIS-3.3-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-24.0-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-1.25-009639?style=for-the-badge&logo=nginx&logoColor=white)

# 🌍 GEO-DATA ANALYTICS
Aplicación de visualización geoespacial y análisis temporal.


## 🚀 CARACTERÍSTICAS  
- **Dashboard inicial:** Selección de datasets con cards interactivas
- **Arquitectura modular:** Componentes separados (Dashboard, Dataset, Header, Footer)
- **Routing profesional:** React Router con navegación entre vistas
- **Sistema de temas:** Claro/oscuro con persistencia en localStorage
- **Vistas específicas por dataset:** Mapa, Gráficos y Datos en tabs
- **Backend FastAPI:** Con filtros avanzados y estadísticas
- **Frontend React:** TypeScript, Bootstrap 5, Leaflet, Recharts


## 📊 DATASETS INCLUIDOS  
1. **COVID España** - Casos por comunidad autónoma y provincia (2023)
2. **Clima España** - Condiciones meteorológicas actuales en ciudades españolas (OpenWeatherMap)
3. **Elecciones** - Resultados municipales 2023
3. **Calidad del Aire España** - Mapa de calidad del aire actual en ciudades españolas (MITECO)


## 🛠️ TECNOLOGÍAS  
- **Frontend:** React 18, TypeScript, Vite, Bootstrap 5, Leaflet, Recharts, React Router
- **Backend:** FastAPI, Python 3.11, SQLAlchemy, GeoAlchemy2, Pandas
- **Base de datos:** PostgreSQL 15 + PostGIS 3.3
- **Infraestructura:** Docker, Docker Compose, Nginx
- **APIs externas:** OpenWeatherMap (para datos meteorológicos)


## 🐳 INICIO RÁPIDO CON DOCKER  
### 1. Clonar repositorio
```bash
git clone <url>
cd geo-data
```
### 2. Configurar variables (opcional)
```bash
cp .env.example .env
```
### 3. Levantar servicios
```bash
docker-compose up -d
```
### 4. Acceder  
✅ Frontend en http://localhost:8180  
✅ API a través de Nginx en http://localhost:8180/api/*  
✅ Swagger docs en http://localhost:8180/api/docs  
✅ Backend directo en http://localhost:8100 (para desarrollo)  
✅ Base de datos en localhost:5440  

🔧 Configuración API Clima  
Para usar datos en tiempo real de OpenWeatherMap:  
Regístrate en OpenWeatherMap  
Obtén tu API Key gratuita  
Edita .env en backend:  
```text  
OPENWEATHER_API_KEY=tu_api_key_aquí  
```  


## 🧪 DESARROLLO LOCAL  
### Backend:  
```bash  
cd backend  
python -m venv venv  
source venv/bin/activate  
pip install -r requirements.txt  
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload  
```  

### Frontend:  
```bash  
cd frontend  
npm install  
npm run dev  
```  


## 📁 ESTRUCTURA  
geo-data/  
├── docker-compose.yml  
├── backend/  
│   ├── app/main.py  
│   └── app/routers/  
│       ├── covid.py  
│       ├── weather.py  
│       └── elections.py  
│   ├── requirements.txt  
│   └── Dockerfile  
├── frontend/  
│   ├── src/  
│   ├── package.json  
│   └── Dockerfile  
└── docker/  


## 🔌 ENDPOINTS API
- `GET /` - Estado del API  
- `GET /health` - Health check  
- `GET /api/datasets` - Lista de datasets disponibles  
- `GET /api/covid/data` - Todos los datos COVID  
- `GET /api/covid/stats` - Estadísticas agregadas COVID  
- `GET /api/covid/filter` - Filtrado avanzado con parámetros  
- `GET /api/weather/data` - Datos meteorológicos  
- `GET /api/weather/stats` - Estadísticas meteorológicas  
- `GET /api/elections/data` - Resultados electorales  
- `GET /api/elections/stats` - Estadísticas electorales  
- `GET /api/elections/party/{partido}` - Resultados por partido  
- `GET /air-quality/stations` - Obtiene estaciones de calidad del aire en España  
- `GET /air-quality/station/{station_id}"` - Obtener datos completos de una estación específica  
- `GET /air-quality/stats"` - Estadísticas de calidad del aire en España  
- `GET /air-quality/pollutants` - Información sobre los contaminantes medidos  
- `GET /api/analysis/summary` - Análisis básico  
- `GET /api/docs` - Swagger UI interactivo  


## 🚢 DESPLIEGUE  
```bash  
docker-compose up -d --build  
```  
Variables .env:  
```  
DB_USER=geodata  
DB_PASSWORD=tu_password_seguro  
DB_NAME=geodata_prod  
API_URL=http://localhost:8180/api  
```  


## 📈 Próximas características  
Más datasets (turismo, economía)  
Análisis predictivo básico  
Exportación de datos (CSV, PNG)  
Autenticación de usuarios  
Panel de administración  


## 🤝 Contribuir  
Fork el proyecto  
Crear rama (git checkout -b feature/nueva-funcionalidad)   
Commit cambios (git commit -am 'Añadir funcionalidad')  
Push a la rama (git push origin feature/nueva-funcionalidad)  
Crear Pull Request  


## 📄 Licencia  
MIT License - ver LICENSE para más detalles.  


## 📸 Capturas de pantalla  
|                                    |                                    |                                    |
|:----------------------------------:|:----------------------------------:|:----------------------------------:|
| **Vista general del mapa**<br>![Map Overview](01-overview-map.png) | **Filtros activos en mapa**<br>![Active Filters](02-filters-active.png) | **Pestaña análisis (gráficos)**<br>![Chart Analysis](03-chart-analysis.png) |
| **Pestaña datos con filtros**<br>![Data Table](04-data-table-filters.png) | **Tema claro/oscuro**<br>![Dark Mode](05-dark-mode.png) | **Vista responsive (mobile)**<br>![Mobile View](06-responsive-mobile.png) |