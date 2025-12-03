=============================================
🌍 GEO-DATA ANALYTICS
=============================================

Aplicación de visualización geoespacial y análisis temporal.

🚀 CARACTERÍSTICAS
- Mapas interactivos con Leaflet
- Gráficos temporales con Recharts
- Backend API con FastAPI (Python)
- Base de datos PostgreSQL + PostGIS
- Docker listo para producción
- Diseño responsive con Tailwind CSS

📊 DATASETS INCLUIDOS
1. COVID España - Casos por comunidad autónoma
2. Elecciones - Resultados municipales 2023

🛠️ TECNOLOGÍAS
Frontend: React 18, TypeScript, Vite, Leaflet, Recharts, Tailwind
Backend: FastAPI, Python 3.11, Pandas, SQLAlchemy
Base de datos: PostgreSQL 15, PostGIS
Infraestructura: Docker, Docker Compose, Nginx

🐳 INICIO RÁPIDO CON DOCKER
# 1. Clonar repositorio
git clone <url>
cd geo-data

# 2. Configurar variables (opcional)
cp .env.example .env

# 3. Levantar servicios
docker-compose up -d

# 4. Acceder
Frontend: http://localhost:8180
Backend API: http://localhost:8100
API Docs: http://localhost:8180/docs

🧪 DESARROLLO LOCAL
Backend:
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload

Frontend:
cd frontend
npm install
npm run dev

📁 ESTRUCTURA
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

🔌 ENDPOINTS API
- GET / - Estado del API
- GET /health - Health check
- GET /api/datasets - Lista de datasets
- GET /api/data/covid - Datos COVID España
- GET /api/data/elections - Datos elecciones
- GET /docs - Documentación Swagger UI

🚢 DESPLIEGUE
docker-compose up -d --build

Variables .env:
DB_USER=geodata
DB_PASSWORD=tu_password_seguro
DB_NAME=geodata_prod
API_URL=http://localhost:8180/api
