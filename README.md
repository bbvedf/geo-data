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
- **Arquitectura Docker:** React + FastAPI + PostgreSQL/PostGIS + Nginx
- **Base de datos:** 1,710 registros COVID (19 CCAA × 90 días)
- **Mapa interactivo:** Leaflet con círculos proporcionales a casos
- **Backend:** FastAPI con SQLAlchemy + GeoAlchemy2
- **Endpoints REST:** /api/data/covid, /api/covid/stats, /api/docs
- **Frontend:** React + TypeScript + Bootstrap
- **Proxy Nginx:** Configuración producción en puerto 8180
- **Datos geoespaciales:** Coordenadas reales comunidades autónomas
- **Docker Compose:** 4 servicios orquestados (frontend, backend, db, nginx)
- **Variables entorno:** Configuración separada por entorno
- **Documentación:** Swagger UI integrado en /api/docs"

## 📊 DATASETS INCLUIDOS  
1. COVID España - Casos por comunidad autónoma  
2. Elecciones - Resultados municipales 2023  


## 🛠️ TECNOLOGÍAS  
Frontend: React 18, TypeScript, Vite, Leaflet, Recharts, Tailwind  
Backend: FastAPI, Python 3.11, Pandas, SQLAlchemy  
Base de datos: PostgreSQL 15, PostGIS  
Infraestructura: Docker, Docker Compose, Nginx  


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
│   ├── requirements.txt  
│   └── Dockerfile  
├── frontend/  
│   ├── src/  
│   ├── package.json  
│   └── Dockerfile  
└── docker/  


## 🔌 ENDPOINTS API  
- GET / - Estado del API  
- GET /health - Health check  
- GET /api/datasets - Lista de datasets  
- GET /api/data/covid - Datos COVID España  
- GET /api/data/elections - Datos elecciones  
- GET /docs - Documentación Swagger UI  


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
Más datasets (clima, turismo, economía)  
Análisis predictivo básico  
Exportación de datos (CSV, PNG)  
Autenticación de usuarios  
Panel de administración  


## 🖼️ Capturas de pantalla  
https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=Mapa+Interactivo+Geo-Data  
https://via.placeholder.com/800x400/10B981/FFFFFF?text=Gr%C3%A1ficos+de+An%C3%A1lisis+Temporal  


## 🤝 Contribuir  
Fork el proyecto  
Crear rama (git checkout -b feature/nueva-funcionalidad)   
Commit cambios (git commit -am 'Añadir funcionalidad')  
Push a la rama (git push origin feature/nueva-funcionalidad)  
Crear Pull Request  


## 📄 Licencia  
MIT License - ver LICENSE para más detalles.  
