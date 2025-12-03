#!/bin/bash
# backend/docker-entrypoint.sh
set -e

# Verificar conexión a DB
until pg_isready -h postgres -p 5432 -U geodata; do
  echo "Esperando PostgreSQL..."
  sleep 2
done

echo "PostgreSQL listo!"

# Ejecutar migraciones si existen
if [ -f alembic.ini ]; then
  alembic upgrade head
fi

# Ejecutar app
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload