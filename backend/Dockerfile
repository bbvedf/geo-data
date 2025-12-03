# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 1. Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Copiar requirements e instalar
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# 3. Crear usuario no-root (seguridad producción)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 4. Copiar código
COPY --chown=appuser:appuser . .

# 5. Variables de entorno
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHON_ENV=production

# 6. Exponer puerto
EXPOSE 8000

# 7. Comando PRODUCCIÓN (Gunicorn)
CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]